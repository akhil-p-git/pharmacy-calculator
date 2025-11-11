import type { NDCPackage, QuantityCalculation, NDCSelection } from '$lib/types';

/**
 * Calculate overfill percentage for a package selection
 */
function calculateOverfill(packageSize: number, quantityNeeded: number): number {
	if (quantityNeeded === 0) return 0;
	const overfill = ((packageSize - quantityNeeded) / quantityNeeded) * 100;
	return Math.round(overfill * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if units are compatible
 */
function unitsMatch(packageUnit: string, calculationUnit: string): boolean {
	const normalize = (unit: string) => unit.toLowerCase().trim();
	const pkg = normalize(packageUnit);
	const calc = normalize(calculationUnit);

	// Exact match
	if (pkg === calc) return true;

	// Handle plurals (tablet/tablets, capsule/capsules)
	if (pkg + 's' === calc || calc + 's' === pkg) return true;
	if (pkg + 'es' === calc || calc + 'es' === pkg) return true;

	// Handle common abbreviations
	const equivalents: Record<string, string[]> = {
		tablet: ['tab', 'tablets'],
		capsule: ['cap', 'capsules'],
		ml: ['milliliter', 'milliliters'],
		mg: ['milligram', 'milligrams'],
		g: ['gram', 'grams'],
		mcg: ['microgram', 'micrograms', 'ug']
	};

	for (const [standard, alternatives] of Object.entries(equivalents)) {
		if (
			(pkg === standard || alternatives.includes(pkg)) &&
			(calc === standard || alternatives.includes(calc))
		) {
			return true;
		}
	}

	return false;
}

/**
 * Filter packages by unit compatibility and active status
 */
export function filterCompatiblePackages(
	packages: NDCPackage[],
	calculation: QuantityCalculation
): NDCPackage[] {
	return packages.filter((pkg) => {
		// Must be active
		if (!pkg.active) return false;

		// Units must match
		if (!unitsMatch(pkg.packageUnit, calculation.unit)) return false;

		return true;
	});
}

/**
 * Rank packages by how well they match the needed quantity
 * Lower score = better match
 */
function scorePackage(pkg: NDCPackage, quantityNeeded: number): number {
	const packageSize = pkg.packageSize;

	// Can't use packages smaller than needed (would require splitting)
	if (packageSize < quantityNeeded) {
		return 10000 + (quantityNeeded - packageSize);
	}

	// Exact match is best (score 0)
	if (packageSize === quantityNeeded) {
		return 0;
	}

	// Prefer minimal overfill (score = overfill percentage)
	const overfillPct = Math.abs(calculateOverfill(packageSize, quantityNeeded));
	return overfillPct;
}

/**
 * Select optimal NDC(s) to fulfill the prescription
 */
export function selectOptimalNDCs(
	packages: NDCPackage[],
	calculation: QuantityCalculation,
	options: {
		maxOverfillPercent?: number;
		preferSinglePackage?: boolean;
		maxAlternatives?: number;
	} = {}
): {
	primary: NDCSelection[];
	alternatives: NDCSelection[];
	warnings: string[];
} {
	const {
		maxOverfillPercent = 20,
		preferSinglePackage = true,
		maxAlternatives = 3
	} = options;

	const warnings: string[] = [];
	const quantityNeeded = calculation.totalQuantityNeeded;

	// Handle special case: PRN or ambiguous (quantity = 0)
	if (quantityNeeded === 0) {
		warnings.push(
			'Quantity could not be calculated (PRN or ambiguous SIG). Please dispense appropriate amount.'
		);
		return { primary: [], alternatives: [], warnings };
	}

	// Filter to compatible packages only
	const compatible = filterCompatiblePackages(packages, calculation);

	if (compatible.length === 0) {
		warnings.push('No compatible active NDCs found');
		return { primary: [], alternatives: [], warnings };
	}

	// Create NDCSelection objects with scores
	const selections = compatible.map((pkg) => {
		const singlePackageQty = pkg.packageSize;
		const numPackages = Math.ceil(quantityNeeded / singlePackageQty);
		const totalDispensed = singlePackageQty * numPackages;
		const overfill = calculateOverfill(totalDispensed, quantityNeeded);

		return {
			ndc: pkg.ndc,
			packageSize: pkg.packageSize,
			packageUnit: pkg.packageUnit,
			quantityToDispense: totalDispensed,
			numberOfPackages: numPackages,
			overfillPercentage: overfill,
			productName: pkg.productName,
			manufacturer: pkg.manufacturer,
			score: scorePackage(pkg, quantityNeeded)
		};
	});

	// Sort by score (lower is better)
	selections.sort((a, b) => a.score - b.score);

	// Select primary option (best match)
	const primary = [selections[0]];

	// Check for warnings on primary selection
	if (primary[0].overfillPercentage > maxOverfillPercent) {
		warnings.push(
			`Primary selection has ${primary[0].overfillPercentage}% overfill (exceeds ${maxOverfillPercent}% threshold)`
		);
	}

	if (primary[0].numberOfPackages > 1) {
		warnings.push(
			`Requires ${primary[0].numberOfPackages} packages to fulfill prescription`
		);
	}

	// Select alternatives (next best options)
	const alternatives = selections.slice(1, maxAlternatives + 1);

	return {
		primary,
		alternatives,
		warnings
	};
}

/**
 * Try to find a multi-package combination that minimizes overfill
 * This is more complex but can result in better matches
 */
export function findOptimalCombination(
	packages: NDCPackage[],
	quantityNeeded: number
): NDCSelection[] | null {
	// For now, we'll stick with single-package approach
	// Multi-package optimization is complex and can be added later
	// This would use dynamic programming or greedy algorithms

	// Placeholder for future enhancement
	return null;
}

/**
 * Check for inactive NDCs and return warnings
 */
export function checkForInactiveNDCs(packages: NDCPackage[]): string[] {
	const warnings: string[] = [];
	const inactiveCount = packages.filter((pkg) => !pkg.active).length;

	if (inactiveCount > 0) {
		warnings.push(
			`${inactiveCount} inactive NDC(s) found. These have been excluded from selection.`
		);
	}

	return warnings;
}

/**
 * Validate that a selection is reasonable
 */
export function validateSelection(selection: NDCSelection): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!selection.ndc || selection.ndc.trim().length === 0) {
		errors.push('NDC is required');
	}

	if (selection.packageSize <= 0) {
		errors.push('Package size must be greater than 0');
	}

	if (selection.numberOfPackages <= 0) {
		errors.push('Number of packages must be greater than 0');
	}

	if (selection.quantityToDispense <= 0) {
		errors.push('Quantity to dispense must be greater than 0');
	}

	// Warn if overfill is excessive
	if (selection.overfillPercentage > 50) {
		errors.push(
			`Excessive overfill (${selection.overfillPercentage}%). Consider alternative NDC or quantity.`
		);
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
