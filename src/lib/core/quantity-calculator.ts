import type { ParsedSIG, QuantityCalculation, APIError } from '$lib/types';

/**
 * Calculate total quantity needed based on SIG and days supply
 */
export function calculateQuantity(
	sig: ParsedSIG,
	daysSupply: number
): QuantityCalculation {
	// Validate inputs
	if (!sig) {
		const error: APIError = {
			message: 'ParsedSIG is required',
			code: 'INVALID_INPUT'
		};
		throw error;
	}

	if (daysSupply <= 0) {
		const error: APIError = {
			message: 'Days supply must be greater than 0',
			code: 'INVALID_INPUT'
		};
		throw error;
	}

	if (daysSupply > 365) {
		const error: APIError = {
			message: 'Days supply cannot exceed 365 days',
			code: 'INVALID_INPUT'
		};
		throw error;
	}

	// For PRN (as needed) medications, frequency is 0
	// We can't calculate exact quantity, so we'll use a conservative estimate
	// or flag for manual review
	if (sig.frequency === 0 || sig.isAmbiguous) {
		return {
			totalQuantityNeeded: 0,
			unit: sig.doseUnit,
			daysSupply,
			dailyDose: 0
		};
	}

	// Calculate daily dose
	const dailyDose = sig.dose * sig.frequency;

	// Calculate total quantity
	const totalQuantity = dailyDose * daysSupply;

	return {
		totalQuantityNeeded: totalQuantity,
		unit: sig.doseUnit,
		daysSupply,
		dailyDose
	};
}

/**
 * Validate days supply input
 */
export function validateDaysSupply(daysSupply: number): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (typeof daysSupply !== 'number' || isNaN(daysSupply)) {
		errors.push('Days supply must be a valid number');
	} else if (daysSupply <= 0) {
		errors.push('Days supply must be greater than 0');
	} else if (daysSupply > 365) {
		errors.push('Days supply cannot exceed 365 days');
	} else if (!Number.isInteger(daysSupply)) {
		errors.push('Days supply must be a whole number');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Calculate quantity for complex taper regimens
 * This handles cases like prednisone tapers with varying doses
 */
export function calculateTaperQuantity(
	taperSchedule: Array<{ tablets: number; days: number }>
): QuantityCalculation {
	if (!taperSchedule || taperSchedule.length === 0) {
		const error: APIError = {
			message: 'Taper schedule is required',
			code: 'INVALID_INPUT'
		};
		throw error;
	}

	let totalQuantity = 0;
	let totalDays = 0;

	for (const step of taperSchedule) {
		if (step.tablets < 0 || step.days <= 0) {
			const error: APIError = {
				message: 'Invalid taper schedule: tablets and days must be positive',
				code: 'INVALID_INPUT'
			};
			throw error;
		}

		totalQuantity += step.tablets * step.days;
		totalDays += step.days;
	}

	const avgDailyDose = totalDays > 0 ? totalQuantity / totalDays : 0;

	return {
		totalQuantityNeeded: totalQuantity,
		unit: 'tablet',
		daysSupply: totalDays,
		dailyDose: avgDailyDose
	};
}

/**
 * Estimate PRN (as needed) quantity
 * Uses conservative estimates based on maximum usage
 */
export function estimatePRNQuantity(
	sig: ParsedSIG,
	daysSupply: number,
	maxDailyUse: number = 4
): QuantityCalculation {
	// For PRN medications, estimate based on max daily use
	// This is conservative to ensure patient doesn't run out
	const estimatedDailyDose = sig.dose * maxDailyUse;
	const totalQuantity = estimatedDailyDose * daysSupply;

	return {
		totalQuantityNeeded: totalQuantity,
		unit: sig.doseUnit,
		daysSupply,
		dailyDose: estimatedDailyDose
	};
}

/**
 * Check if calculated quantity seems reasonable
 * This helps catch potential calculation errors
 */
export function isQuantityReasonable(
	calculation: QuantityCalculation
): {
	reasonable: boolean;
	warnings: string[];
} {
	const warnings: string[] = [];

	// Check for extremely high quantities
	if (calculation.totalQuantityNeeded > 1000) {
		warnings.push(
			`Very high quantity calculated (${calculation.totalQuantityNeeded} ${calculation.unit}). Please verify.`
		);
	}

	// Check for extremely high daily dose
	if (calculation.dailyDose > 100) {
		warnings.push(
			`Very high daily dose (${calculation.dailyDose} ${calculation.unit}/day). Please verify.`
		);
	}

	// Check for zero quantity (PRN or ambiguous)
	if (calculation.totalQuantityNeeded === 0) {
		warnings.push(
			'Quantity could not be calculated (PRN or ambiguous SIG). Manual review required.'
		);
	}

	return {
		reasonable: warnings.length === 0,
		warnings
	};
}
