import { describe, it, expect } from 'vitest';
import {
	calculateQuantity,
	validateDaysSupply,
	calculateTaperQuantity,
	estimatePRNQuantity,
	isQuantityReasonable
} from './quantity-calculator';
import type { ParsedSIG } from '$lib/types';

describe('Quantity Calculator', () => {
	describe('calculateQuantity', () => {
		it('should calculate quantity for once daily medication', () => {
			const sig: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet once daily',
				isAmbiguous: false
			};

			const result = calculateQuantity(sig, 30);

			expect(result).toEqual({
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			});
		});

		it('should calculate quantity for twice daily medication', () => {
			const sig: ParsedSIG = {
				dose: 2,
				doseUnit: 'tablet',
				frequency: 2,
				route: 'oral',
				instructions: 'Take 2 tablets twice daily',
				isAmbiguous: false
			};

			const result = calculateQuantity(sig, 30);

			expect(result).toEqual({
				totalQuantityNeeded: 120, // 2 tablets * 2 times * 30 days
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 4
			});
		});

		it('should calculate quantity for liquid medication', () => {
			const sig: ParsedSIG = {
				dose: 5,
				doseUnit: 'ml',
				frequency: 3,
				route: 'oral',
				instructions: 'Take 5ml three times daily',
				isAmbiguous: false
			};

			const result = calculateQuantity(sig, 10);

			expect(result).toEqual({
				totalQuantityNeeded: 150, // 5ml * 3 times * 10 days
				unit: 'ml',
				daysSupply: 10,
				dailyDose: 15
			});
		});

		it('should handle PRN medication (frequency = 0)', () => {
			const sig: ParsedSIG = {
				dose: 2,
				doseUnit: 'puff',
				frequency: 0,
				route: 'inhalation',
				instructions: 'Inhale 2 puffs as needed',
				isAmbiguous: false
			};

			const result = calculateQuantity(sig, 30);

			expect(result.totalQuantityNeeded).toBe(0);
			expect(result.dailyDose).toBe(0);
		});

		it('should handle ambiguous SIG', () => {
			const sig: ParsedSIG = {
				dose: 0,
				doseUnit: 'tablet',
				frequency: 0,
				route: 'oral',
				instructions: 'Use as directed',
				isAmbiguous: true,
				clarificationNeeded: 'Dose not specified'
			};

			const result = calculateQuantity(sig, 30);

			expect(result.totalQuantityNeeded).toBe(0);
		});

		it('should throw error for zero days supply', () => {
			const sig: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			expect(() => calculateQuantity(sig, 0)).toThrow(
				'Days supply must be greater than 0'
			);
		});

		it('should throw error for negative days supply', () => {
			const sig: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			expect(() => calculateQuantity(sig, -5)).toThrow(
				'Days supply must be greater than 0'
			);
		});

		it('should throw error for days supply > 365', () => {
			const sig: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			};

			expect(() => calculateQuantity(sig, 400)).toThrow(
				'Days supply cannot exceed 365 days'
			);
		});

		it('should throw error for null SIG', () => {
			expect(() => calculateQuantity(null as any, 30)).toThrow(
				'ParsedSIG is required'
			);
		});

		it('should handle fractional doses', () => {
			const sig: ParsedSIG = {
				dose: 0.5,
				doseUnit: 'tablet',
				frequency: 2,
				route: 'oral',
				instructions: 'Take 0.5 tablet twice daily',
				isAmbiguous: false
			};

			const result = calculateQuantity(sig, 30);

			expect(result).toEqual({
				totalQuantityNeeded: 30, // 0.5 * 2 * 30
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			});
		});
	});

	describe('validateDaysSupply', () => {
		it('should validate correct days supply', () => {
			const result = validateDaysSupply(30);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject zero days supply', () => {
			const result = validateDaysSupply(0);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Days supply must be greater than 0');
		});

		it('should reject negative days supply', () => {
			const result = validateDaysSupply(-5);
			expect(result.valid).toBe(false);
		});

		it('should reject days supply > 365', () => {
			const result = validateDaysSupply(400);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Days supply cannot exceed 365 days');
		});

		it('should reject non-integer days supply', () => {
			const result = validateDaysSupply(30.5);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Days supply must be a whole number');
		});

		it('should reject NaN', () => {
			const result = validateDaysSupply(NaN);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Days supply must be a valid number');
		});

		it('should accept boundary values', () => {
			expect(validateDaysSupply(1).valid).toBe(true);
			expect(validateDaysSupply(365).valid).toBe(true);
		});
	});

	describe('calculateTaperQuantity', () => {
		it('should calculate prednisone taper', () => {
			const taper = [
				{ tablets: 4, days: 3 },
				{ tablets: 3, days: 3 },
				{ tablets: 2, days: 3 },
				{ tablets: 1, days: 3 }
			];

			const result = calculateTaperQuantity(taper);

			expect(result.totalQuantityNeeded).toBe(30); // 4*3 + 3*3 + 2*3 + 1*3
			expect(result.daysSupply).toBe(12);
			expect(result.dailyDose).toBe(2.5); // average
			expect(result.unit).toBe('tablet');
		});

		it('should handle complex taper schedules', () => {
			const taper = [
				{ tablets: 6, days: 5 },
				{ tablets: 5, days: 4 },
				{ tablets: 4, days: 3 },
				{ tablets: 3, days: 2 },
				{ tablets: 2, days: 2 },
				{ tablets: 1, days: 2 }
			];

			const result = calculateTaperQuantity(taper);

			// 6*5 + 5*4 + 4*3 + 3*2 + 2*2 + 1*2 = 30+20+12+6+4+2 = 74
			expect(result.totalQuantityNeeded).toBe(74);
			expect(result.daysSupply).toBe(18);
		});

		it('should throw error for empty taper schedule', () => {
			expect(() => calculateTaperQuantity([])).toThrow('Taper schedule is required');
		});

		it('should throw error for negative tablets', () => {
			const taper = [{ tablets: -1, days: 3 }];
			expect(() => calculateTaperQuantity(taper)).toThrow(
				'Invalid taper schedule'
			);
		});

		it('should throw error for zero days', () => {
			const taper = [{ tablets: 4, days: 0 }];
			expect(() => calculateTaperQuantity(taper)).toThrow(
				'Invalid taper schedule'
			);
		});
	});

	describe('estimatePRNQuantity', () => {
		it('should estimate PRN quantity with default max usage', () => {
			const sig: ParsedSIG = {
				dose: 2,
				doseUnit: 'puff',
				frequency: 0,
				route: 'inhalation',
				instructions: 'Inhale 2 puffs as needed',
				isAmbiguous: false
			};

			const result = estimatePRNQuantity(sig, 30);

			// Default max 4 times/day: 2 puffs * 4 times * 30 days = 240
			expect(result.totalQuantityNeeded).toBe(240);
			expect(result.dailyDose).toBe(8);
		});

		it('should estimate PRN quantity with custom max usage', () => {
			const sig: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 0,
				route: 'oral',
				instructions: 'Take 1 tablet as needed for pain',
				isAmbiguous: false
			};

			const result = estimatePRNQuantity(sig, 30, 6);

			// Max 6 times/day: 1 tablet * 6 times * 30 days = 180
			expect(result.totalQuantityNeeded).toBe(180);
			expect(result.dailyDose).toBe(6);
		});
	});

	describe('isQuantityReasonable', () => {
		it('should flag no warnings for reasonable quantity', () => {
			const calculation = {
				totalQuantityNeeded: 60,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 2
			};

			const result = isQuantityReasonable(calculation);

			expect(result.reasonable).toBe(true);
			expect(result.warnings).toHaveLength(0);
		});

		it('should flag warning for very high quantity', () => {
			const calculation = {
				totalQuantityNeeded: 1500,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 50
			};

			const result = isQuantityReasonable(calculation);

			expect(result.reasonable).toBe(false);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.includes('Very high quantity'))).toBe(true);
		});

		it('should flag warning for very high daily dose', () => {
			const calculation = {
				totalQuantityNeeded: 500,
				unit: 'ml',
				daysSupply: 5,
				dailyDose: 150
			};

			const result = isQuantityReasonable(calculation);

			expect(result.reasonable).toBe(false);
			expect(result.warnings.some((w) => w.includes('Very high daily dose'))).toBe(
				true
			);
		});

		it('should flag warning for zero quantity', () => {
			const calculation = {
				totalQuantityNeeded: 0,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 0
			};

			const result = isQuantityReasonable(calculation);

			expect(result.reasonable).toBe(false);
			expect(result.warnings.some((w) => w.includes('could not be calculated'))).toBe(
				true
			);
		});
	});
});
