import { describe, it, expect } from 'vitest';
import {
	filterCompatiblePackages,
	selectOptimalNDCs,
	checkForInactiveNDCs,
	validateSelection
} from './ndc-selector';
import type { NDCPackage, QuantityCalculation, NDCSelection } from '$lib/types';

// Mock NDCPackage data with various package sizes
const mockPackages: NDCPackage[] = [
	// Tablets - 30 count
	{
		ndc: '12345-0001-30',
		packageDescription: 'Bottle of 30 tablets',
		packageSize: 30,
		packageUnit: 'tablet',
		productName: 'Test Drug 10mg',
		manufacturer: 'Test Pharma',
		active: true
	},
	// Tablets - 60 count
	{
		ndc: '12345-0002-60',
		packageDescription: 'Bottle of 60 tablets',
		packageSize: 60,
		packageUnit: 'tablet',
		productName: 'Test Drug 10mg',
		manufacturer: 'Test Pharma',
		active: true
	},
	// Tablets - 90 count
	{
		ndc: '12345-0003-90',
		packageDescription: 'Bottle of 90 tablets',
		packageSize: 90,
		packageUnit: 'tablet',
		productName: 'Test Drug 10mg',
		manufacturer: 'Test Pharma',
		active: true
	},
	// Tablets - inactive
	{
		ndc: '12345-0004-30',
		packageDescription: 'Bottle of 30 tablets (inactive)',
		packageSize: 30,
		packageUnit: 'tablet',
		productName: 'Test Drug 10mg',
		manufacturer: 'Test Pharma',
		active: false
	},
	// Tablets - different unit (tablets vs tablet)
	{
		ndc: '12345-0005-30',
		packageDescription: 'Bottle of 30 tablets',
		packageSize: 30,
		packageUnit: 'tablets',
		productName: 'Test Drug 10mg',
		manufacturer: 'Test Pharma',
		active: true
	},
	// Capsules
	{
		ndc: '12345-0006-30',
		packageDescription: 'Bottle of 30 capsules',
		packageSize: 30,
		packageUnit: 'capsule',
		productName: 'Test Drug 20mg',
		manufacturer: 'Test Pharma',
		active: true
	},
	// Liquid - 100ml
	{
		ndc: '12345-0007-100',
		packageDescription: 'Bottle of 100ml',
		packageSize: 100,
		packageUnit: 'ml',
		productName: 'Test Liquid 5mg/ml',
		manufacturer: 'Test Pharma',
		active: true
	},
	// Liquid - 200ml
	{
		ndc: '12345-0008-200',
		packageDescription: 'Bottle of 200ml',
		packageSize: 200,
		packageUnit: 'ml',
		productName: 'Test Liquid 5mg/ml',
		manufacturer: 'Test Pharma',
		active: true
	},
	// Liquid - inactive
	{
		ndc: '12345-0009-100',
		packageDescription: 'Bottle of 100ml (inactive)',
		packageSize: 100,
		packageUnit: 'ml',
		productName: 'Test Liquid 5mg/ml',
		manufacturer: 'Test Pharma',
		active: false
	},
	// Capsules - inactive
	{
		ndc: '12345-0010-60',
		packageDescription: 'Bottle of 60 capsules (inactive)',
		packageSize: 60,
		packageUnit: 'capsule',
		productName: 'Test Drug 20mg',
		manufacturer: 'Test Pharma',
		active: false
	}
];

describe('NDC Selector', () => {
	describe('filterCompatiblePackages', () => {
		it('should filter packages by unit matching', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = filterCompatiblePackages(mockPackages, calculation);

			// Should include tablets but not capsules or ml
			expect(result.length).toBeGreaterThan(0);
			expect(result.every((pkg) => pkg.packageUnit.toLowerCase().includes('tablet'))).toBe(
				true
			);
			expect(result.some((pkg) => pkg.packageUnit === 'capsule')).toBe(false);
			expect(result.some((pkg) => pkg.packageUnit === 'ml')).toBe(false);
		});

		it('should filter out inactive packages', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = filterCompatiblePackages(mockPackages, calculation);

			// Should not include inactive packages
			expect(result.every((pkg) => pkg.active)).toBe(true);
			expect(result.some((pkg) => pkg.ndc === '12345-0004-30')).toBe(false);
		});

		it('should handle unit matching with plurals (tablet vs tablets)', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = filterCompatiblePackages(mockPackages, calculation);

			// Should include both 'tablet' and 'tablets' packages
			expect(result.some((pkg) => pkg.packageUnit === 'tablet')).toBe(true);
			expect(result.some((pkg) => pkg.packageUnit === 'tablets')).toBe(true);
		});

		it('should handle unit matching with plurals (tablets vs tablet)', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablets',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = filterCompatiblePackages(mockPackages, calculation);

			// Should include both 'tablet' and 'tablets' packages
			expect(result.some((pkg) => pkg.packageUnit === 'tablet')).toBe(true);
			expect(result.some((pkg) => pkg.packageUnit === 'tablets')).toBe(true);
		});

		it('should handle unit matching with abbreviations (tab)', () => {
			const packagesWithTab: NDCPackage[] = [
				{
					ndc: '12345-0011-30',
					packageDescription: 'Bottle of 30 tabs',
					packageSize: 30,
					packageUnit: 'tab',
					productName: 'Test Drug 10mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = filterCompatiblePackages(packagesWithTab, calculation);

			expect(result.length).toBe(1);
			expect(result[0].packageUnit).toBe('tab');
		});

		it('should handle unit matching with abbreviations (cap)', () => {
			const packagesWithCap: NDCPackage[] = [
				{
					ndc: '12345-0012-30',
					packageDescription: 'Bottle of 30 caps',
					packageSize: 30,
					packageUnit: 'cap',
					productName: 'Test Drug 20mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'capsule',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = filterCompatiblePackages(packagesWithCap, calculation);

			expect(result.length).toBe(1);
			expect(result[0].packageUnit).toBe('cap');
		});

		it('should handle liquid units (ml)', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 150,
				unit: 'ml',
				daysSupply: 10,
				dailyDose: 15
			};

			const result = filterCompatiblePackages(mockPackages, calculation);

			// Should include ml packages but not tablets or capsules
			expect(result.length).toBeGreaterThan(0);
			expect(result.every((pkg) => pkg.packageUnit === 'ml')).toBe(true);
		});

		it('should return empty array when no compatible packages', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'patch',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = filterCompatiblePackages(mockPackages, calculation);

			expect(result).toEqual([]);
		});

		it('should handle case-insensitive unit matching', () => {
			const packagesWithCaps: NDCPackage[] = [
				{
					ndc: '12345-0013-30',
					packageDescription: 'Bottle of 30 tablets',
					packageSize: 30,
					packageUnit: 'TABLET',
					productName: 'Test Drug 10mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = filterCompatiblePackages(packagesWithCaps, calculation);

			expect(result.length).toBe(1);
		});

		it('should handle whitespace in units', () => {
			const packagesWithWhitespace: NDCPackage[] = [
				{
					ndc: '12345-0014-30',
					packageDescription: 'Bottle of 30 tablets',
					packageSize: 30,
					packageUnit: '  tablet  ',
					productName: 'Test Drug 10mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = filterCompatiblePackages(packagesWithWhitespace, calculation);

			expect(result.length).toBe(1);
		});
	});

	describe('selectOptimalNDCs', () => {
		it('should select single package for exact match', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			expect(result.primary.length).toBe(1);
			expect(result.primary[0].packageSize).toBe(30);
			expect(result.primary[0].numberOfPackages).toBe(1);
			expect(result.primary[0].overfillPercentage).toBe(0);
			expect(result.warnings.length).toBe(0);
		});

		it('should select optimal package for single package scenario', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 45,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1.5
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			expect(result.primary.length).toBe(1);
			// Should select 60-count package (better match than 90)
			expect(result.primary[0].packageSize).toBe(60);
			expect(result.primary[0].numberOfPackages).toBe(1);
			expect(result.primary[0].quantityToDispense).toBe(60);
		});

		it('should handle multi-package scenarios', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 120,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 4
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			expect(result.primary.length).toBe(1);
			// Algorithm selects based on single package size scoring
			// For 120 needed, 90-count (2 packages) scores better than 60-count (2 packages)
			expect(result.primary[0].packageSize).toBe(90);
			expect(result.primary[0].numberOfPackages).toBe(2);
			expect(result.primary[0].quantityToDispense).toBe(180);
			expect(result.warnings.some((w) => w.includes('Requires 2 packages'))).toBe(true);
		});

		it('should generate overfill warning when exceeding threshold', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 25,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 0.83
			};

			const result = selectOptimalNDCs(mockPackages, calculation, {
				maxOverfillPercent: 10
			});

			expect(result.primary.length).toBe(1);
			// 30-count package: (30-25)/25 = 20% overfill
			expect(result.primary[0].overfillPercentage).toBeGreaterThan(10);
			expect(
				result.warnings.some((w) => w.includes('overfill') && w.includes('exceeds'))
			).toBe(true);
		});

		it('should not generate overfill warning when within threshold', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 25,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 0.83
			};

			const result = selectOptimalNDCs(mockPackages, calculation, {
				maxOverfillPercent: 25
			});

			expect(result.primary.length).toBe(1);
			expect(
				result.warnings.some((w) => w.includes('overfill') && w.includes('exceeds'))
			).toBe(false);
		});

		it('should return alternatives', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 45,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1.5
			};

			const result = selectOptimalNDCs(mockPackages, calculation, {
				maxAlternatives: 2
			});

			expect(result.primary.length).toBe(1);
			expect(result.alternatives.length).toBeGreaterThan(0);
			expect(result.alternatives.length).toBeLessThanOrEqual(2);
		});

		it('should handle zero quantity (PRN or ambiguous)', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 0,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 0
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			expect(result.primary).toEqual([]);
			expect(result.alternatives).toEqual([]);
			expect(
				result.warnings.some((w) =>
					w.includes('could not be calculated') || w.includes('PRN')
				)
			).toBe(true);
		});

		it('should handle no compatible packages', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'patch',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			expect(result.primary).toEqual([]);
			expect(result.alternatives).toEqual([]);
			expect(result.warnings.some((w) => w.includes('No compatible'))).toBe(true);
		});

		it('should prefer single package when preferSinglePackage is true', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 45,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1.5
			};

			const result = selectOptimalNDCs(mockPackages, calculation, {
				preferSinglePackage: true
			});

			// Should prefer 60-count single package over multiple 30-count packages
			expect(result.primary[0].numberOfPackages).toBe(1);
		});

		it('should handle liquid packages correctly', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 150,
				unit: 'ml',
				daysSupply: 10,
				dailyDose: 15
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			expect(result.primary.length).toBe(1);
			expect(result.primary[0].packageUnit).toBe('ml');
			// Should select 200ml package (better match than 100ml)
			expect(result.primary[0].packageSize).toBe(200);
			expect(result.primary[0].numberOfPackages).toBe(1);
		});

		it('should calculate overfill percentage correctly', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 25,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 0.83
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			// 30-count package for 25 needed: (30-25)/25 = 20%
			expect(result.primary[0].overfillPercentage).toBe(20);
		});

		it('should handle exact match with no overfill', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 60,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 2
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			expect(result.primary[0].overfillPercentage).toBe(0);
			expect(result.warnings.length).toBe(0);
		});

		it('should limit alternatives to maxAlternatives', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 45,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1.5
			};

			const result = selectOptimalNDCs(mockPackages, calculation, {
				maxAlternatives: 1
			});

			expect(result.alternatives.length).toBeLessThanOrEqual(1);
		});

		it('should handle packages smaller than needed quantity', () => {
			const smallPackages: NDCPackage[] = [
				{
					ndc: '12345-0015-10',
					packageDescription: 'Bottle of 10 tablets',
					packageSize: 10,
					packageUnit: 'tablet',
					productName: 'Test Drug 10mg',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = selectOptimalNDCs(smallPackages, calculation);

			// Should still select the package, requiring multiple packages
			expect(result.primary.length).toBe(1);
			expect(result.primary[0].numberOfPackages).toBe(3);
			expect(result.primary[0].quantityToDispense).toBe(30);
		});
	});

	describe('checkForInactiveNDCs', () => {
		it('should detect inactive NDCs and return warning', () => {
			const packagesWithInactive: NDCPackage[] = [
				...mockPackages.filter((p) => p.active),
				{
					ndc: '12345-9999-30',
					packageDescription: 'Inactive package',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Test Drug',
					manufacturer: 'Test Pharma',
					active: false
				}
			];

			const warnings = checkForInactiveNDCs(packagesWithInactive);

			expect(warnings.length).toBe(1);
			expect(warnings[0]).toContain('inactive NDC');
			expect(warnings[0]).toContain('excluded');
		});

		it('should return empty warnings when all packages are active', () => {
			const activePackages = mockPackages.filter((p) => p.active);

			const warnings = checkForInactiveNDCs(activePackages);

			expect(warnings).toEqual([]);
		});

		it('should count multiple inactive NDCs correctly', () => {
			const packagesWithMultipleInactive: NDCPackage[] = [
				{
					ndc: '12345-9999-30',
					packageDescription: 'Inactive package 1',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Test Drug',
					manufacturer: 'Test Pharma',
					active: false
				},
				{
					ndc: '12345-9998-60',
					packageDescription: 'Inactive package 2',
					packageSize: 60,
					packageUnit: 'tablet',
					productName: 'Test Drug',
					manufacturer: 'Test Pharma',
					active: false
				},
				{
					ndc: '12345-9997-90',
					packageDescription: 'Active package',
					packageSize: 90,
					packageUnit: 'tablet',
					productName: 'Test Drug',
					manufacturer: 'Test Pharma',
					active: true
				}
			];

			const warnings = checkForInactiveNDCs(packagesWithMultipleInactive);

			expect(warnings.length).toBe(1);
			expect(warnings[0]).toContain('2 inactive NDC');
		});

		it('should handle empty package array', () => {
			const warnings = checkForInactiveNDCs([]);

			expect(warnings).toEqual([]);
		});

		it('should handle all inactive packages', () => {
			const allInactive: NDCPackage[] = [
				{
					ndc: '12345-9999-30',
					packageDescription: 'Inactive package 1',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Test Drug',
					manufacturer: 'Test Pharma',
					active: false
				},
				{
					ndc: '12345-9998-60',
					packageDescription: 'Inactive package 2',
					packageSize: 60,
					packageUnit: 'tablet',
					productName: 'Test Drug',
					manufacturer: 'Test Pharma',
					active: false
				}
			];

			const warnings = checkForInactiveNDCs(allInactive);

			expect(warnings.length).toBe(1);
			expect(warnings[0]).toContain('2 inactive NDC');
		});
	});

	describe('validateSelection', () => {
		it('should validate a correct selection', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: 1,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should reject selection with empty NDC', () => {
			const selection: NDCSelection = {
				ndc: '',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: 1,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('NDC is required'))).toBe(true);
		});

		it('should reject selection with whitespace-only NDC', () => {
			const selection: NDCSelection = {
				ndc: '   ',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: 1,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('NDC is required'))).toBe(true);
		});

		it('should reject selection with zero package size', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: 0,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: 1,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Package size must be greater than 0'))).toBe(
				true
			);
		});

		it('should reject selection with negative package size', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: -10,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: 1,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Package size must be greater than 0'))).toBe(
				true
			);
		});

		it('should reject selection with zero numberOfPackages', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: 0,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.includes('Number of packages must be greater than 0'))
			).toBe(true);
		});

		it('should reject selection with negative numberOfPackages', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: -1,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.includes('Number of packages must be greater than 0'))
			).toBe(true);
		});

		it('should reject selection with zero quantityToDispense', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: 0,
				numberOfPackages: 1,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.includes('Quantity to dispense must be greater than 0'))
			).toBe(true);
		});

		it('should reject selection with negative quantityToDispense', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: -10,
				numberOfPackages: 1,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.includes('Quantity to dispense must be greater than 0'))
			).toBe(true);
		});

		it('should reject selection with excessive overfill (>50%)', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: 1,
				overfillPercentage: 60,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Excessive overfill'))).toBe(true);
			expect(result.errors.some((e) => e.includes('60%'))).toBe(true);
		});

		it('should accept selection with overfill at 50% threshold', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: 1,
				overfillPercentage: 50,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			// 50% is the threshold, so it should be valid
			expect(result.valid).toBe(true);
		});

		it('should accept selection with overfill below 50%', () => {
			const selection: NDCSelection = {
				ndc: '12345-0001-30',
				packageSize: 30,
				packageUnit: 'tablet',
				quantityToDispense: 30,
				numberOfPackages: 1,
				overfillPercentage: 49.9,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(true);
		});

		it('should return multiple errors for invalid selection', () => {
			const selection: NDCSelection = {
				ndc: '',
				packageSize: 0,
				packageUnit: 'tablet',
				quantityToDispense: 0,
				numberOfPackages: 0,
				overfillPercentage: 0,
				productName: 'Test Drug 10mg',
				manufacturer: 'Test Pharma'
			};

			const result = validateSelection(selection);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty packages array', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = selectOptimalNDCs([], calculation);

			expect(result.primary).toEqual([]);
			expect(result.alternatives).toEqual([]);
			expect(result.warnings.some((w) => w.includes('No compatible'))).toBe(true);
		});

		it('should handle zero quantity with empty packages', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 0,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 0
			};

			const result = selectOptimalNDCs([], calculation);

			expect(result.primary).toEqual([]);
			expect(result.alternatives).toEqual([]);
			expect(
				result.warnings.some((w) =>
					w.includes('could not be calculated') || w.includes('PRN')
				)
			).toBe(true);
		});

		it('should handle no compatible units', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'patch',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			expect(result.primary).toEqual([]);
			expect(result.alternatives).toEqual([]);
			expect(result.warnings.some((w) => w.includes('No compatible'))).toBe(true);
		});

		it('should handle very large quantity needed', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 1000,
				unit: 'tablet',
				daysSupply: 100,
				dailyDose: 10
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			// Should still select packages, requiring multiple
			expect(result.primary.length).toBe(1);
			expect(result.primary[0].numberOfPackages).toBeGreaterThan(1);
			expect(result.warnings.some((w) => w.includes('Requires'))).toBe(true);
		});

		it('should handle very small quantity needed', () => {
			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 1,
				unit: 'tablet',
				daysSupply: 1,
				dailyDose: 1
			};

			const result = selectOptimalNDCs(mockPackages, calculation);

			// Should select smallest available package
			expect(result.primary.length).toBe(1);
			expect(result.primary[0].packageSize).toBe(30);
			expect(result.primary[0].numberOfPackages).toBe(1);
			expect(result.primary[0].overfillPercentage).toBeGreaterThan(0);
		});

		it('should handle all packages being inactive', () => {
			const allInactive: NDCPackage[] = [
				{
					ndc: '12345-9999-30',
					packageDescription: 'Inactive package',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Test Drug',
					manufacturer: 'Test Pharma',
					active: false
				}
			];

			const calculation: QuantityCalculation = {
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			};

			const result = selectOptimalNDCs(allInactive, calculation);

			expect(result.primary).toEqual([]);
			expect(result.alternatives).toEqual([]);
			expect(result.warnings.some((w) => w.includes('No compatible'))).toBe(true);
		});
	});
});

