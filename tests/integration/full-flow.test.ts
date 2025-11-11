import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculatePrescription } from '../../src/lib/core/calculator';
import * as normalizer from '../../src/lib/core/normalizer';
import * as quantityCalculator from '../../src/lib/core/quantity-calculator';
import * as openai from '../../src/lib/api/openai';
import * as rxnorm from '../../src/lib/api/rxnorm';
import * as fdaNdc from '../../src/lib/api/fda-ndc';
import * as ndcSelector from '../../src/lib/core/ndc-selector';
import type {
	CalculationInput,
	CalculationResult,
	RxCUIResult,
	ParsedSIG,
	QuantityCalculation,
	NDCPackage,
	NDCSelection
} from '../../src/lib/types';

// Mock all external API modules
vi.mock('../../src/lib/core/normalizer');
vi.mock('../../src/lib/core/quantity-calculator');
vi.mock('../../src/lib/api/openai');
vi.mock('../../src/lib/api/rxnorm');
vi.mock('../../src/lib/api/fda-ndc');
vi.mock('../../src/lib/core/ndc-selector');

describe('Full Flow Integration Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.OPENAI_API_KEY = 'test-key';
	});

	describe('Simple Case: Lisinopril 10mg Tablet', () => {
		it('should complete full flow for simple tablet prescription', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'Lisinopril 10mg',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril 10 MG Oral Tablet'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet by mouth once daily',
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
					ndc: '68180-046-01',
					packageDescription: '30 TABLET in 1 BOTTLE',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Apotex Corp',
					active: true
				},
				{
					ndc: '68180-046-02',
					packageDescription: '60 TABLET in 1 BOTTLE',
					packageSize: 60,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Apotex Corp',
					active: true
				}
			];

			const mockSelectedNDCs: NDCSelection[] = [
				{
					ndc: '68180-046-01',
					packageSize: 30,
					packageUnit: 'tablet',
					quantityToDispense: 30,
					numberOfPackages: 1,
					overfillPercentage: 0,
					productName: 'Lisinopril 10mg',
					manufacturer: 'Apotex Corp'
				}
			];

			// Setup mocks
			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'Lisinopril 10mg',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['68180-046-01', '68180-046-02']);
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

			// Verify complete result structure
			expect(result.success).toBe(true);
			expect(result.input).toEqual(input);
			expect(result.normalizedDrug).toEqual(mockRxCUI);
			expect(result.parsedSIG).toEqual(mockParsedSIG);
			expect(result.calculation).toEqual(mockCalculation);
			expect(result.selectedNDCs).toEqual(mockSelectedNDCs);
			expect(result.selectedNDCs[0].overfillPercentage).toBe(0);
			expect(result.selectedNDCs[0].numberOfPackages).toBe(1);
			expect(result.warnings).toEqual([]);
			expect(result.errors).toBeUndefined();
			expect(result.timestamp).toBeDefined();

			// Verify all functions were called
			expect(normalizer.normalizeDrug).toHaveBeenCalledWith('Lisinopril 10mg');
			expect(openai.parseSIG).toHaveBeenCalledWith('Take 1 tablet daily');
			expect(rxnorm.getRxCUINDCs).toHaveBeenCalledWith('29046');
			expect(fdaNdc.getMultipleNDCPackages).toHaveBeenCalledWith([
				'68180-046-01',
				'68180-046-02'
			]);
			expect(quantityCalculator.calculateQuantity).toHaveBeenCalledWith(mockParsedSIG, 30);
			expect(ndcSelector.selectOptimalNDCs).toHaveBeenCalled();
		});
	});

	describe('Liquid Medication: Amoxicillin Suspension', () => {
		it('should handle liquid medication with ml units', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'Amoxicillin 400mg/5ml',
				sig: 'Take 5ml twice daily',
				daysSupply: 10
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '197806',
				name: 'Amoxicillin 400 MG/5ML Oral Suspension'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 5,
				doseUnit: 'ml',
				frequency: 2,
				route: 'oral',
				instructions: 'Take 5ml by mouth twice daily',
				isAmbiguous: false
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 100,
				unit: 'ml',
				daysSupply: 10,
				dailyDose: 10
			};

			const mockPackages: NDCPackage[] = [
				{
					ndc: '00904-2576-73',
					packageDescription: '100 ML in 1 BOTTLE',
					packageSize: 100,
					packageUnit: 'ml',
					productName: 'Amoxicillin 400mg/5ml',
					manufacturer: 'Aurobindo Pharma Limited',
					active: true
				},
				{
					ndc: '00904-2576-74',
					packageDescription: '200 ML in 1 BOTTLE',
					packageSize: 200,
					packageUnit: 'ml',
					productName: 'Amoxicillin 400mg/5ml',
					manufacturer: 'Aurobindo Pharma Limited',
					active: true
				}
			];

			const mockSelectedNDCs: NDCSelection[] = [
				{
					ndc: '00904-2576-73',
					packageSize: 100,
					packageUnit: 'ml',
					quantityToDispense: 100,
					numberOfPackages: 1,
					overfillPercentage: 0,
					productName: 'Amoxicillin 400mg/5ml',
					manufacturer: 'Aurobindo Pharma Limited'
				}
			];

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'Amoxicillin 400mg/5ml',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['00904-2576-73', '00904-2576-74']);
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
			expect(result.calculation?.unit).toBe('ml');
			expect(result.calculation?.totalQuantityNeeded).toBe(100);
			expect(result.selectedNDCs[0].packageUnit).toBe('ml');
			expect(result.selectedNDCs[0].packageSize).toBe(100);
			expect(result.selectedNDCs[0].overfillPercentage).toBe(0);
		});
	});

	describe('Inhaler: Albuterol HFA PRN', () => {
		it('should handle PRN (as needed) inhaler prescription', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'Albuterol HFA',
				sig: 'Inhale 2 puffs PRN',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '435',
				name: 'Albuterol 0.09 MG/ACTUATION Metered Dose Inhaler'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 2,
				doseUnit: 'puff',
				frequency: 0,
				route: 'inhalation',
				instructions: 'Inhale 2 puffs as needed',
				isAmbiguous: false
			};

			const mockCalculation: QuantityCalculation = {
				totalQuantityNeeded: 0,
				unit: 'puff',
				daysSupply: 30,
				dailyDose: 0
			};

			const mockPackages: NDCPackage[] = [
				{
					ndc: '0173-0701-13',
					packageDescription: '1 INHALER in 1 CARTON',
					packageSize: 200,
					packageUnit: 'puff',
					productName: 'Albuterol HFA',
					manufacturer: 'Mylan Pharmaceuticals Inc.',
					active: true
				}
			];

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'Albuterol HFA',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['0173-0701-13']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockResolvedValue(mockPackages);
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue(mockCalculation);
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: false,
				warnings: [
					'Quantity could not be calculated (PRN or ambiguous SIG). Manual review required.'
				]
			});
			vi.mocked(ndcSelector.checkForInactiveNDCs).mockReturnValue([]);
			vi.mocked(ndcSelector.selectOptimalNDCs).mockReturnValue({
				primary: [],
				alternatives: [],
				warnings: ['No compatible active NDCs found']
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.parsedSIG?.frequency).toBe(0);
			expect(result.calculation?.totalQuantityNeeded).toBe(0);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.includes('PRN'))).toBe(true);
		});
	});

	describe('Error Case: Invalid Drug Name', () => {
		it('should handle invalid drug name gracefully', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'InvalidDrugXYZ123',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'InvalidDrugXYZ123',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockRejectedValue({
				message: 'No RxCUI found for drug name: InvalidDrugXYZ123',
				code: 'NORMALIZATION_ERROR'
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.length).toBeGreaterThan(0);
			expect(result.errors?.some((e) => e.includes('InvalidDrugXYZ123'))).toBe(true);
			expect(result.selectedNDCs).toEqual([]);
		});
	});

	describe('Edge Case: NDC Input Instead of Drug Name', () => {
		it('should handle NDC code input and normalize correctly', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: '68180-046-01',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril 10 MG Oral Tablet'
			};

			const mockParsedSIG: ParsedSIG = {
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet by mouth once daily',
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
					ndc: '68180-046-01',
					packageDescription: '30 TABLET in 1 BOTTLE',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Apotex Corp',
					active: true
				}
			];

			const mockSelectedNDCs: NDCSelection[] = [
				{
					ndc: '68180-046-01',
					packageSize: 30,
					packageUnit: 'tablet',
					quantityToDispense: 30,
					numberOfPackages: 1,
					overfillPercentage: 0,
					productName: 'Lisinopril 10mg',
					manufacturer: 'Apotex Corp'
				}
			];

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: '68180-046-01',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			// NDC should be detected and normalized via ndcToRxCUI
			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['68180-046-01']);
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
			expect(result.selectedNDCs[0].ndc).toBe('68180-046-01');
			// Verify NDC was normalized (normalizeDrug should detect it's an NDC)
			expect(normalizer.normalizeDrug).toHaveBeenCalledWith('68180-046-01');
		});
	});

	describe('Complete CalculationResult Structure Verification', () => {
		it('should return complete CalculationResult with all fields', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'Lisinopril 10mg',
				sig: 'Take 1 tablet twice daily',
				daysSupply: 30
			};

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril 10 MG Oral Tablet'
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
					ndc: '68180-046-02',
					packageDescription: '60 TABLET in 1 BOTTLE',
					packageSize: 60,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Apotex Corp',
					active: true
				},
				{
					ndc: '68180-046-01',
					packageDescription: '30 TABLET in 1 BOTTLE',
					packageSize: 30,
					packageUnit: 'tablet',
					productName: 'Lisinopril 10mg',
					manufacturer: 'Apotex Corp',
					active: true
				}
			];

			const mockSelectedNDCs: NDCSelection[] = [
				{
					ndc: '68180-046-02',
					packageSize: 60,
					packageUnit: 'tablet',
					quantityToDispense: 60,
					numberOfPackages: 1,
					overfillPercentage: 0,
					productName: 'Lisinopril 10mg',
					manufacturer: 'Apotex Corp'
				}
			];

			const mockAlternatives: NDCSelection[] = [
				{
					ndc: '68180-046-01',
					packageSize: 30,
					packageUnit: 'tablet',
					quantityToDispense: 60,
					numberOfPackages: 2,
					overfillPercentage: 0,
					productName: 'Lisinopril 10mg',
					manufacturer: 'Apotex Corp'
				}
			];

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'Lisinopril 10mg',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue(mockParsedSIG);
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['68180-046-01', '68180-046-02']);
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

			// Verify all required fields
			expect(result).toHaveProperty('success');
			expect(result).toHaveProperty('input');
			expect(result).toHaveProperty('timestamp');
			expect(result).toHaveProperty('selectedNDCs');
			expect(result).toHaveProperty('warnings');

			// Verify optional fields when present
			expect(result.normalizedDrug).toBeDefined();
			expect(result.parsedSIG).toBeDefined();
			expect(result.calculation).toBeDefined();
			expect(result.alternativeNDCs).toBeDefined();

			// Verify structure of nested objects
			expect(result.normalizedDrug?.rxcui).toBeDefined();
			expect(result.normalizedDrug?.name).toBeDefined();
			expect(result.parsedSIG?.dose).toBeDefined();
			expect(result.parsedSIG?.doseUnit).toBeDefined();
			expect(result.parsedSIG?.frequency).toBeDefined();
			expect(result.calculation?.totalQuantityNeeded).toBeDefined();
			expect(result.calculation?.unit).toBeDefined();
			expect(result.selectedNDCs[0].ndc).toBeDefined();
			expect(result.selectedNDCs[0].packageSize).toBeDefined();
			expect(result.selectedNDCs[0].quantityToDispense).toBeDefined();
			expect(result.selectedNDCs[0].numberOfPackages).toBeDefined();
			expect(result.selectedNDCs[0].overfillPercentage).toBeDefined();

			// Verify timestamp is valid ISO string
			expect(() => new Date(result.timestamp)).not.toThrow();
			expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});
	});

	describe('Error Handling in Full Flow', () => {
		it('should handle RxNorm API failure gracefully', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'Lisinopril 10mg',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'Lisinopril 10mg',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril 10 MG Oral Tablet'
			};

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue({
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			});
			vi.mocked(rxnorm.getRxCUINDCs).mockRejectedValue({
				message: 'RxNorm API error',
				code: 'RXNORM_NDCS_ERROR'
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(
				result.warnings.some(
					(w) => w.includes('NDC codes') || w.includes('RxNorm') || w.includes('retrieve')
				)
			).toBe(true);
		});

		it('should handle FDA API failure gracefully', async () => {
			const input: CalculationInput = {
				drugNameOrNDC: 'Lisinopril 10mg',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			};

			vi.mocked(normalizer.validateDrugInput).mockReturnValue({
				valid: true,
				cleaned: 'Lisinopril 10mg',
				errors: []
			});

			vi.mocked(quantityCalculator.validateDaysSupply).mockReturnValue({
				valid: true,
				errors: []
			});

			const mockRxCUI: RxCUIResult = {
				rxcui: '29046',
				name: 'Lisinopril 10 MG Oral Tablet'
			};

			vi.mocked(normalizer.normalizeDrug).mockResolvedValue(mockRxCUI);
			vi.mocked(openai.parseSIG).mockResolvedValue({
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				instructions: 'Take 1 tablet daily',
				isAmbiguous: false
			});
			vi.mocked(rxnorm.getRxCUINDCs).mockResolvedValue(['68180-046-01']);
			vi.mocked(fdaNdc.getMultipleNDCPackages).mockRejectedValue({
				message: 'FDA API error',
				code: 'FDA_NDC_ERROR'
			});
			vi.mocked(quantityCalculator.calculateQuantity).mockReturnValue({
				totalQuantityNeeded: 30,
				unit: 'tablet',
				daysSupply: 30,
				dailyDose: 1
			});
			vi.mocked(quantityCalculator.isQuantityReasonable).mockReturnValue({
				reasonable: true,
				warnings: []
			});

			const result = await calculatePrescription(input);

			expect(result.success).toBe(false);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(
				result.warnings.some(
					(w) => w.includes('package information') || w.includes('FDA') || w.includes('retrieve')
				)
			).toBe(true);
		});
	});
});

