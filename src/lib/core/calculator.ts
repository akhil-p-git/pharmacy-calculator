import { validateDrugInput, normalizeDrug } from './normalizer';
import { validateDaysSupply, calculateQuantity, isQuantityReasonable } from './quantity-calculator';
import { parseSIG } from '$lib/api/openai';
import { getRxCUINDCs } from '$lib/api/rxnorm';
import { getMultipleNDCPackages } from '$lib/api/fda-ndc';
import { selectOptimalNDCs, checkForInactiveNDCs } from './ndc-selector';
import type {
	CalculationInput,
	CalculationResult,
	RxCUIResult,
	ParsedSIG,
	QuantityCalculation,
	NDCPackage,
	NDCSelection,
	APIError
} from '$lib/types';

/**
 * Main orchestration function that calculates prescription quantity and selects optimal NDCs
 */
export async function calculatePrescription(
	input: CalculationInput
): Promise<CalculationResult> {
	const warnings: string[] = [];
	const errors: string[] = [];
	let normalizedDrug: RxCUIResult | undefined;
	let parsedSIG: ParsedSIG | undefined;
	let calculation: QuantityCalculation | undefined;
	let selectedNDCs: NDCSelection[] = [];
	let alternativeNDCs: NDCSelection[] | undefined;

	try {
		// Step 1: Validate input
		const drugValidation = validateDrugInput(input.drugNameOrNDC);
		if (!drugValidation.valid) {
			errors.push(...drugValidation.errors);
			return createErrorResult(input, errors, warnings);
		}

		const daysSupplyValidation = validateDaysSupply(input.daysSupply);
		if (!daysSupplyValidation.valid) {
			errors.push(...daysSupplyValidation.errors);
			return createErrorResult(input, errors, warnings);
		}

		// Step 2: Normalize drug → RxCUI
		try {
			normalizedDrug = await normalizeDrug(drugValidation.cleaned);
		} catch (error) {
			const apiError = error as APIError;
			errors.push(apiError.message || 'Failed to normalize drug name or NDC');
			return createErrorResult(input, errors, warnings, normalizedDrug);
		}

		// Step 3: Parse SIG with OpenAI
		try {
			parsedSIG = await parseSIG(input.sig);
			if (parsedSIG.isAmbiguous) {
				warnings.push(
					parsedSIG.clarificationNeeded ||
						'Prescription instructions are ambiguous and may need manual review'
				);
			}
		} catch (error) {
			const apiError = error as APIError;
			errors.push(apiError.message || 'Failed to parse prescription instructions');
			return createErrorResult(input, errors, warnings, normalizedDrug);
		}

		// Step 4: Get NDCs from RxNorm
		let ndcCodes: string[] = [];
		try {
			ndcCodes = await getRxCUINDCs(normalizedDrug.rxcui);
			if (ndcCodes.length === 0) {
				warnings.push('No NDC codes found for this drug - this is a known limitation of the public RxNorm API');
				return createPartialResult(
					input,
					normalizedDrug,
					parsedSIG,
					calculation,
					selectedNDCs,
					alternativeNDCs,
					warnings,
					errors
				);
			}
		} catch (error) {
			const apiError = error as APIError;
			warnings.push(apiError.message || 'Failed to retrieve NDC codes from RxNorm');
			// Continue with empty NDC list - we'll return partial result
		}

		// Step 5: Get package info from FDA
		let packages: NDCPackage[] = [];
		if (ndcCodes.length > 0) {
			try {
				packages = await getMultipleNDCPackages(ndcCodes);
				if (packages.length === 0) {
					warnings.push('No package information found for available NDCs');
				} else {
					// Check for inactive NDCs
					const inactiveWarnings = checkForInactiveNDCs(packages);
					warnings.push(...inactiveWarnings);
				}
			} catch (error) {
				const apiError = error as APIError;
				warnings.push(apiError.message || 'Failed to retrieve package information from FDA');
				// Continue with empty packages - we'll return partial result
			}
		}

		// Step 6: Calculate quantity
		if (parsedSIG) {
			try {
				calculation = calculateQuantity(parsedSIG, input.daysSupply);

				// Check if quantity is reasonable
				const reasonablenessCheck = isQuantityReasonable(calculation);
				warnings.push(...reasonablenessCheck.warnings);
			} catch (error) {
				const apiError = error as APIError;
				errors.push(apiError.message || 'Failed to calculate quantity');
				return createPartialResult(
					input,
					normalizedDrug,
					parsedSIG,
					calculation,
					selectedNDCs,
					alternativeNDCs,
					warnings,
					errors
				);
			}
		}

		// Step 7: Select optimal NDCs
		if (calculation && packages.length > 0) {
			try {
				const selectionResult = selectOptimalNDCs(packages, calculation, {
					maxOverfillPercent: 20,
					preferSinglePackage: true,
					maxAlternatives: 3
				});

				selectedNDCs = selectionResult.primary;
				alternativeNDCs = selectionResult.alternatives;
				warnings.push(...selectionResult.warnings);
			} catch (error) {
				const apiError = error as APIError;
				warnings.push(apiError.message || 'Failed to select optimal NDCs');
			}
		} else if (calculation && packages.length === 0) {
			warnings.push('Cannot select NDCs: no compatible packages available');
		}

		// Determine success status
		const success = errors.length === 0 && selectedNDCs.length > 0;

		return {
			success,
			input,
			normalizedDrug,
			parsedSIG,
			calculation,
			selectedNDCs,
			alternativeNDCs: alternativeNDCs && alternativeNDCs.length > 0 ? alternativeNDCs : undefined,
			warnings: warnings.length > 0 ? warnings : [],
			errors: errors.length > 0 ? errors : undefined,
			timestamp: new Date().toISOString()
		};
	} catch (error) {
		// Catch-all for unexpected errors
		const apiError = error as APIError;
		errors.push(apiError.message || 'An unexpected error occurred during calculation');
		return createErrorResult(input, errors, warnings, normalizedDrug, parsedSIG, calculation);
	}
}

/**
 * Create an error result when validation fails early
 */
function createErrorResult(
	input: CalculationInput,
	errors: string[],
	warnings: string[],
	normalizedDrug?: RxCUIResult,
	parsedSIG?: ParsedSIG,
	calculation?: QuantityCalculation
): CalculationResult {
	return {
		success: false,
		input,
		normalizedDrug,
		parsedSIG,
		calculation,
		selectedNDCs: [],
		warnings: warnings.length > 0 ? warnings : [],
		errors,
		timestamp: new Date().toISOString()
	};
}

/**
 * Create a partial result when some steps succeed but others fail
 */
function createPartialResult(
	input: CalculationInput,
	normalizedDrug: RxCUIResult | undefined,
	parsedSIG: ParsedSIG | undefined,
	calculation: QuantityCalculation | undefined,
	selectedNDCs: NDCSelection[],
	alternativeNDCs: NDCSelection[] | undefined,
	warnings: string[],
	errors: string[]
): CalculationResult {
	return {
		success: errors.length === 0 && selectedNDCs.length > 0,
		input,
		normalizedDrug,
		parsedSIG,
		calculation,
		selectedNDCs,
		alternativeNDCs: alternativeNDCs && alternativeNDCs.length > 0 ? alternativeNDCs : undefined,
		warnings: warnings.length > 0 ? warnings : [],
		errors: errors.length > 0 ? errors : undefined,
		timestamp: new Date().toISOString()
	};
}

