import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculatePrescription } from './calculator';
import * as normalizer from './normalizer';
import * as quantityCalculator from './quantity-calculator';
import * as openai from '$lib/api/openai';
import * as rxnorm from '$lib/api/rxnorm';
import * as fdaNdc from '$lib/api/fda-ndc';
import * as ndcSelector from './ndc-selector';
import type {
	CalculationInput,
	CalculationResult,
	RxCUIResult,
	ParsedSIG,
	QuantityCalculation,
	NDCPackage,
	NDCSelection
} from '$lib/types';

// Mock all dependencies
vi.mock('./normalizer');
vi.mock('./quantity-calculator');
vi.mock('$lib/api/openai');
vi.mock('$lib/api/rxnorm');
vi.mock('$lib/api/fda-ndc');
vi.mock('./ndc-selector');

describe('Calculator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('calculatePrescription - successful flow', () => {
		it('should successfully calculate prescription with all steps', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet by mouth twice daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 2,
				route: 'oral',
				instructions: 'Take 1 tablet by mouth twice daily',
				isAmbiguous: false
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 60,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 2
			};

			const mockPackages: NDCPackage[] = [
				{
					ndc: '12345-0001-30',
					packageDescription: 'Bottle of 30 tablets',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma',
					active: true
				},
				{
					ndc: '12345-0002-60',
					packageDescription: 'Bottle of 60 tablets',
					packageSize: 60,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const mockSelectedNDCs: NDCSelection[] = [
				{
					ndc: '12345-0002-60',
					packageSize: 60,
					packageUnit: 'tablet',
					quantityToDispense: 60,
					numberOfPackages: 1,
					overfillPercentage: 0,
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma'
				}
			];

			// Setup mocks
			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-30', '12345-0002-60']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue(mockPackages);
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: true,
				warnings: []
			});
			vi.mocked(ndcSelector.checkForInactiveNDCs).mockReturnValue([]);
			vi.mocked(ndcSelector.selectOptimalNDCs).mockReturnValue({
				primary: mockSelectedNDCs,
				alternatives: [],
				warnings: []
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(true);
			expect(result.normalizedDrug).toEqual(mockRxCUI);
			expect(result.parsedSIG).toEqual(mockParsedSIG);
			expect(result.calculation).toEqual(mockCalculation);
			expect(result.selectedNDCs).toEqual(mockSelectedNDCs);
			expect(result.errors).toBeUndefined();
			expect(result.timestamp).toBeDefined();
		});

		it('should handle warnings throughout the flow', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take as needed',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 0,
				route: 'oral',
				instructions: 'Take as needed',
				isAmbiguous: true,
				clarificationNeeded: 'PRN medication - quantity cannot be calculated'
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 0,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 0
			};

			const mockPackages: NDCPackage[] = [
				{
					ndc: '12345-0001-30',
					packageDescription: 'Bottle of 30 tablets',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma',
					active: false
				}
			];

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-30']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue(mockPackages);
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: false,
				warnings: ['Quantity could not be calculated (PRN or ambiguous SIG). Manual review required.']
			});
			vi.mocked(ndcSelector.checkForInactiveNDCs).mockReturnValue([
				'1 inactive NDC(s) found. These have been excluded from selection.'
			]);
			vi.mocked(ndcSelector.selectOptimalNDCs).mockReturnValue({
				primary: [],
				alternatives: [],
				warnings: ['No compatible active NDCs found']
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.includes('PRN'))).toBe(true);
			expect(result.warnings.some((w) => w.includes('inactive'))).toBe(true);
		});
	});

	describe('calculatePrescription - validation errors', () => {
		it('should return error for invalid drug input', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: '',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: false,
				cleaned: '',
				errors: ['Drug name or NDC is required']
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.errors).toContain('Drug name or NDC is required');
			expect(result.selectedNDCs).toEqual([]);
		});

		it('should return error for invalid days supply', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 0
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: false,
				errors: ['Days supply must be greater than 0']
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.errors).toContain('Days supply must be greater than 0');
		});

		it('should return error for days supply exceeding 365', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 400
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: false,
				errors: ['Days supply cannot exceed 365 days']
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.errors).toContain('Days supply cannot exceed 365 days');
		});
	});

	describe('calculatePrescription - API errors', () => {
		it('should handle drug normalization error', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'invalid-drug-xyz',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'invalid-drug-xyz',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockRejectedValue({
				message: 'No RxCUI found for drug name: invalid-drug-xyz',
				code: 'NORMALIZATION_ERROR'
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes('No RxCUI found'))).toBe(true);
		});

		it('should handle SIG parsing error', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Invalid SIG',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockRejectedValue({
				message: 'Failed to parse SIG',
				code: 'OPENAI_ERROR'
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.normalizedDrug).toEqual(mockRxCUI);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes('Failed to parse'))).toBe(true);
		});

		it('should handle RxNorm NDC retrieval error', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockRejectedValue({
				message: 'RxNorm API error',
				code: 'RXNORM_NDCS_ERROR'
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.normalizedDrug).toEqual(mockRxCUI);
			expect(result.parsedSIG).toEqual(mockParsedSIG);
			expect(
				result.warnings.some((w) => w.includes('NDC codes') || w.includes('RxNorm API error'))
			).toBe(true);
		});

		it('should handle FDA package retrieval error', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-30']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockRejectedValue({
				message: 'FDA API error',
				code: 'FDA_NDC_ERROR'
			});
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: true,
				warnings: []
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.calculation).toEqual(mockCalculation);
			expect(
				result.warnings.some((w) => w.includes('package information') || w.includes('FDA API error'))
			).toBe(true);
		});

		it('should handle quantity calculation error', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-30']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue([]);
			vi.mocked(quantityCalculator.calculateQuantity).mockImplementation(() => {
				throw {
					message: 'Invalid days supply',
					code: 'INVALID_INPUT'
				};
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes('Invalid days supply'))).toBe(true);
		});
	});

	describe('calculatePrescription - edge cases', () => {
		it('should handle no NDCs found', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue([]);

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.warnings.some((w) => w.includes('No NDC codes found'))).toBe(true);
		});

		it('should handle no packages found', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-30']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue([]);
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: true,
				warnings: []
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.warnings.some((w) => w.includes('No package information'))).toBe(true);
		});

		it('should handle ambiguous SIG', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Use as directed',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 0,
				doseUnit: 'tablet',
				frequency: 0,
				route: 'oral',
				instructions: 'Use as directed',
				isAmbiguous: true,
				clarificationNeeded: 'Dose not specified'
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 0,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 0
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-30']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue([]);
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: false,
				warnings: ['Quantity could not be calculated (PRN or ambiguous SIG). Manual review required.']
			});

			const result = await calculatePrescription(input);

			expect(result.warnings.some((w) => w.includes('ambiguous'))).toBe(true);
		});

		it('should include alternatives when available', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const mockPackages: NDCPackage[] = [
				{
					ndc: '12345-0001-30',
					packageDescription: 'Bottle of 30 tablets',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma',
					active: true
				},
				{
					ndc: '12345-0002-60',
					packageDescription: 'Bottle of 60 tablets',
					packageSize: 60,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const mockSelectedNDCs: NDCSelection[] = [
				{
					ndc: '12345-0001-30',
					packageSize: 30,
					packageUnit: 'tablet',
					quantityToDispense: 30,
					numberOfPackages: 1,
					overfillPercentage: 0,
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma'
				}
			];

			const mockAlternatives: NDCSelection[] = [
				{
					ndc: '12345-0002-60',
					packageSize: 60,
					packageUnit: 'tablet',
					quantityToDispense: 60,
					numberOfPackages: 1,
					overfillPercentage: 100,
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma'
				}
			];

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-30', '12345-0002-60']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue(mockPackages);
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: true,
				warnings: []
			});
			vi.mocked(ndcSelector.checkForInactiveNDCs).mockReturnValue([]);
			vi.mocked(ndcSelector.selectOptimalNDCs).mockReturnValue({
				primary: mockSelectedNDCs,
				alternatives: mockAlternatives,
				warnings: []
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(true);
			expect(result.alternativeNDCs).toEqual(mockAlternatives);
		});

		it('should handle unexpected errors gracefully', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockImplementation(() => {
				throw new Error('Unexpected error');
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(
				result.errors?.some((e) => e.includes('unexpected error') || e.includes('Unexpected error'))
			).toBe(true);
		});
	});

	describe('calculatePrescription - integration scenarios', () => {
		it('should handle complete flow with overfill warning', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 25,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const mockPackages: NDCPackage[] = [
				{
					ndc: '12345-0001-30',
					packageDescription: 'Bottle of 30 tablets',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const mockSelectedNDCs: NDCSelection[] = [
				{
					ndc: '12345-0001-30',
					packageSize: 30,
					packageUnit: 'tablet',
					quantityToDispense: 30,
					numberOfPackages: 1,
					overfillPercentage: 20,
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma'
				}
			];

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-30']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue(mockPackages);
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: true,
				warnings: []
			});
			vi.mocked(ndcSelector.checkForInactiveNDCs).mockReturnValue([]);
			vi.mocked(ndcSelector.selectOptimalNDCs).mockReturnValue({
				primary: mockSelectedNDCs,
				alternatives: [],
				warnings: [
					'Primary selection has 20% overfill (exceeds 20% threshold)'
				]
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(true);
			expect(result.selectedNDCs).toEqual(mockSelectedNDCs);
			expect(result.warnings.some((w) => w.includes('overfill'))).toBe(true);
		});

		it('should handle multi-package scenario', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 2 tablets twice daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 2,
				doseUnit: 'tablet',
				frequency: 2,
				route: 'oral',
				instructions: 'Take 2 tablets twice daily',
				isAmbiguous: false
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 120,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 4
			};

			const mockPackages: NDCPackage[] = [
				{
					ndc: '12345-0001-60',
					packageDescription: 'Bottle of 60 tablets',
					packageSize: 60,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const mockSelectedNDCs: NDCSelection[] = [
				{
					ndc: '12345-0001-60',
					packageSize: 60,
					packageUnit: 'tablet',
					quantityToDispense: 120,
					numberOfPackages: 2,
					overfillPercentage: 0,
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma'
				}
			];

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-60']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue(mockPackages);
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: true,
				warnings: []
			});
			vi.mocked(ndcSelector.checkForInactiveNDCs).mockReturnValue([]);
			vi.mocked(ndcSelector.selectOptimalNDCs).mockReturnValue({
				primary: mockSelectedNDCs,
				alternatives: [],
				warnings: ['Requires 2 packages to fulfill prescription']
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(true);
			expect(result.selectedNDCs[0].numberOfPackages).toBe(2);
			expect(result.warnings.some((w) => w.includes('Requires 2 packages'))).toBe(true);
		});

		it('should handle error in selectOptimalNDCs gracefully', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const mockPackages: NDCPackage[] = [
				{
					ndc: '12345-0001-30',
					packageDescription: 'Bottle of 30 tablets',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['12345-0001-30']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue(mockPackages);
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: true,
				warnings: []
			});
			vi.mocked(ndcSelector.checkForInactiveNDCs).mockReturnValue([]);
			vi.mocked(ndcSelector.selectOptimalNDCs).mockImplementation(() => {
				throw {
					message: 'Selection error',
					code: 'SELECTION_ERROR'
				};
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(
				result.warnings.some(
					(w) => w.includes('Failed to select optimal NDCs') || w.includes('Selection error')
				)
			).toBe(true);
		});

		it('should handle catch-all unexpected errors', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'lisinopril',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'lisinopril',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockImplementation(() => {
				throw 'Unexpected string error';
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.length).toBeGreaterThan(0);
			// When a string is thrown, error.message is undefined, so it uses the default message
			// The error is cast to APIError, so message will be undefined and default message is used
			// Just verify that an error was caught and added to the errors array
			expect(result.errors?.[0]).toBeDefined();
			expect(typeof result.errors?.[0]).toBe('string');
		});
	});
});

