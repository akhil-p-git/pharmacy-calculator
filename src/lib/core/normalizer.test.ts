import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeDrug, isNDCFormat, validateDrugInput } from './normalizer';
import * as rxnorm from '$lib/api/rxnorm';

// Mock the rxnorm API module
vi.mock('$lib/api/rxnorm', () => ({
	drugNameToRxCUI: vi.fn(),
	ndcToRxCUI: vi.fn()
}));

describe('Drug Normalizer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('isNDCFormat', () => {
		it('should identify 11-digit NDC with dashes', () => {
			expect(isNDCFormat('12345-6789-01')).toBe(true);
		});

		it('should identify 11-digit NDC without dashes', () => {
			expect(isNDCFormat('12345678901')).toBe(true);
		});

		it('should identify 10-digit NDC', () => {
			expect(isNDCFormat('1234567890')).toBe(true);
		});

		it('should identify NDC with spaces', () => {
			expect(isNDCFormat('12345 6789 01')).toBe(true);
		});

		it('should reject drug names', () => {
			expect(isNDCFormat('Lisinopril')).toBe(false);
		});

		it('should reject drug names with numbers', () => {
			expect(isNDCFormat('Lisinopril 10mg')).toBe(false);
		});

		it('should reject short numbers', () => {
			expect(isNDCFormat('12345')).toBe(false);
		});

		it('should reject long numbers', () => {
			expect(isNDCFormat('123456789012')).toBe(false);
		});
	});

	describe('validateDrugInput', () => {
		it('should validate correct drug name', () => {
			const result = validateDrugInput('Lisinopril 10mg');
			expect(result.valid).toBe(true);
			expect(result.cleaned).toBe('Lisinopril 10mg');
			expect(result.errors).toHaveLength(0);
		});

		it('should validate correct NDC', () => {
			const result = validateDrugInput('12345-6789-01');
			expect(result.valid).toBe(true);
			expect(result.cleaned).toBe('12345-6789-01');
		});

		it('should reject empty input', () => {
			const result = validateDrugInput('');
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Drug name or NDC is required');
		});

		it('should reject whitespace-only input', () => {
			const result = validateDrugInput('   ');
			expect(result.valid).toBe(false);
		});

		it('should reject input that is too short', () => {
			const result = validateDrugInput('A');
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				'Drug name or NDC must be at least 2 characters'
			);
		});

		it('should reject input that is too long', () => {
			const result = validateDrugInput('A'.repeat(201));
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				'Drug name or NDC is too long (max 200 characters)'
			);
		});

		it('should trim whitespace', () => {
			const result = validateDrugInput('  Lisinopril  ');
			expect(result.valid).toBe(true);
			expect(result.cleaned).toBe('Lisinopril');
		});

		it('should reject invalid NDC format', () => {
			const result = validateDrugInput('123-456-78');
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				'Invalid NDC format (must be 10 or 11 digits)'
			);
		});
	});

	describe('normalizeDrug', () => {
		it('should call drugNameToRxCUI for drug names', async () => {
			const mockResult = { rxcui: '161', name: 'Acetaminophen' };
			vi.mocked(rxnorm.drugNameToRxCUI).mockResolvedValueOnce(mockResult);

			const result = await normalizeDrug('Tylenol');

			expect(rxnorm.drugNameToRxCUI).toHaveBeenCalledWith('Tylenol');
			expect(result).toEqual(mockResult);
		});

		it('should call ndcToRxCUI for NDC inputs', async () => {
			const mockResult = { rxcui: '161', name: 'Acetaminophen' };
			vi.mocked(rxnorm.ndcToRxCUI).mockResolvedValueOnce(mockResult);

			const result = await normalizeDrug('00603-0657-21');

			expect(rxnorm.ndcToRxCUI).toHaveBeenCalledWith('00603-0657-21');
			expect(result).toEqual(mockResult);
		});

		it('should handle 11-digit NDC without dashes', async () => {
			const mockResult = { rxcui: '161', name: 'Acetaminophen' };
			vi.mocked(rxnorm.ndcToRxCUI).mockResolvedValueOnce(mockResult);

			await normalizeDrug('00603065721');

			expect(rxnorm.ndcToRxCUI).toHaveBeenCalled();
			expect(rxnorm.drugNameToRxCUI).not.toHaveBeenCalled();
		});

		it('should reject empty input', async () => {
			await expect(normalizeDrug('')).rejects.toThrow('Drug name or NDC is required');
		});

		it('should reject whitespace-only input', async () => {
			await expect(normalizeDrug('   ')).rejects.toThrow(
				'Drug name or NDC is required'
			);
		});

		it('should trim input before processing', async () => {
			const mockResult = { rxcui: '161', name: 'Acetaminophen' };
			vi.mocked(rxnorm.drugNameToRxCUI).mockResolvedValueOnce(mockResult);

			await normalizeDrug('  Tylenol  ');

			expect(rxnorm.drugNameToRxCUI).toHaveBeenCalledWith('Tylenol');
		});

		it('should handle API errors gracefully', async () => {
			vi.mocked(rxnorm.drugNameToRxCUI).mockRejectedValueOnce(
				new Error('API Error')
			);

			await expect(normalizeDrug('InvalidDrug')).rejects.toThrow(
				'Failed to normalize drug'
			);
		});

		it('should work with drug names containing numbers', async () => {
			const mockResult = { rxcui: '197361', name: 'Lisinopril 10 MG' };
			vi.mocked(rxnorm.drugNameToRxCUI).mockResolvedValueOnce(mockResult);

			const result = await normalizeDrug('Lisinopril 10mg');

			expect(rxnorm.drugNameToRxCUI).toHaveBeenCalledWith('Lisinopril 10mg');
			expect(result).toEqual(mockResult);
		});

		it('should distinguish between NDC and drug name with numbers', async () => {
			const mockResult = { rxcui: '197361', name: 'Lisinopril 10 MG' };
			vi.mocked(rxnorm.drugNameToRxCUI).mockResolvedValueOnce(mockResult);

			// "Lisinopril 10mg" has numbers but isn't 10-11 digits, so it's a name
			await normalizeDrug('Lisinopril 10mg');

			expect(rxnorm.drugNameToRxCUI).toHaveBeenCalled();
			expect(rxnorm.ndcToRxCUI).not.toHaveBeenCalled();
		});
	});
});
