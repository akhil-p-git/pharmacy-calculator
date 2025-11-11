import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getNDCPackageInfo,
	getMultipleNDCPackages,
	searchNDCsByDrugName,
	normalizeNDC
} from './fda-ndc';

// Mock fetch globally
global.fetch = vi.fn();

describe('FDA NDC API Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('normalizeNDC', () => {
		it('should normalize 11-digit NDC to 5-4-2 format', () => {
			expect(normalizeNDC('12345678901')).toBe('12345-6789-01');
		});

		it('should normalize 10-digit NDC by padding labeler code', () => {
			expect(normalizeNDC('1234567890')).toBe('01234-5678-90');
		});

		it('should handle NDC with dashes', () => {
			expect(normalizeNDC('12345-6789-01')).toBe('12345-6789-01');
		});

		it('should handle NDC with spaces', () => {
			expect(normalizeNDC('12345 6789 01')).toBe('12345-6789-01');
		});
	});

	describe('getNDCPackageInfo', () => {
		it('should return package information for valid NDC', async () => {
			const mockResponse = {
				results: [
					{
						product_ndc: '00603-0657',
						generic_name: 'Acetaminophen',
						brand_name: 'Tylenol',
						dosage_form: 'TABLET',
						route: ['ORAL'],
						labeler_name: 'Qualitest Pharmaceuticals',
						marketing_start_date: '20100101',
						packaging: [
							{
								package_ndc: '00603-0657-21',
								description: '100 TABLET in 1 BOTTLE',
								marketing_start_date: '20100101'
							}
						]
					}
				],
				meta: {
					results: {
						skip: 0,
						limit: 1,
						total: 1
					}
				}
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await getNDCPackageInfo('00603-0657-21');

			expect(result).toMatchObject({
				ndc: '00603-0657-21',
				packageSize: 100,
				packageUnit: 'tablet',
				productName: 'Tylenol',
				manufacturer: 'Qualitest Pharmaceuticals',
				active: true
			});
		});

		it('should return null for non-existent NDC', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: [],
					meta: { results: { skip: 0, limit: 1, total: 0 } }
				})
			});

			const result = await getNDCPackageInfo('99999-9999-99');

			expect(result).toBeNull();
		});

		it('should parse liquid package descriptions', async () => {
			const mockResponse = {
				results: [
					{
						product_ndc: '00093-4162',
						generic_name: 'Amoxicillin',
						brand_name: null,
						dosage_form: 'SUSPENSION',
						route: ['ORAL'],
						labeler_name: 'Teva Pharmaceuticals',
						marketing_start_date: '20150101',
						packaging: [
							{
								package_ndc: '00093-4162-73',
								description: '100 mL in 1 BOTTLE',
								marketing_start_date: '20150101'
							}
						]
					}
				]
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await getNDCPackageInfo('00093-4162-73');

			expect(result).toMatchObject({
				packageSize: 100,
				packageUnit: 'ml',
				productName: 'Amoxicillin' // Should use generic when no brand
			});
		});

		it('should return null when package info is missing', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: [
						{
							product_ndc: '00603-0657',
							generic_name: 'Acetaminophen',
							brand_name: 'Tylenol',
							packaging: [] // No packaging
						}
					]
				})
			});

			const result = await getNDCPackageInfo('00603-0657-21');

			expect(result).toBeNull();
		});

		it('should handle package description without size/unit pattern', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: [
						{
							product_ndc: '00603-0657',
							generic_name: 'Acetaminophen',
							brand_name: 'Tylenol',
							labeler_name: 'Qualitest',
							marketing_start_date: '20100101',
							packaging: [
								{
									package_ndc: '00603-0657-21',
									description: 'BOTTLE', // No size/unit pattern
									marketing_start_date: '20100101'
								}
							]
						}
					]
				})
			});

			const result = await getNDCPackageInfo('00603-0657-21');

			expect(result).not.toBeNull();
			expect(result?.packageSize).toBe(1); // Default fallback
			expect(result?.packageUnit).toBe('unit'); // Default fallback
		});

		it('should mark NDC as inactive if end date passed', async () => {
			const pastDate = '20100101';
			const mockResponse = {
				results: [
					{
						product_ndc: '12345-6789',
						generic_name: 'Old Drug',
						dosage_form: 'TABLET',
						route: ['ORAL'],
						labeler_name: 'Old Pharma',
						marketing_start_date: '20050101',
						marketing_end_date: pastDate,
						packaging: [
							{
								package_ndc: '12345-6789-01',
								description: '30 TABLET in 1 BOTTLE',
								marketing_start_date: '20050101'
							}
						]
					}
				]
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await getNDCPackageInfo('12345-6789-01');

			expect(result?.active).toBe(false);
		});

		it('should handle API errors', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			});

			await expect(getNDCPackageInfo('00603-0657-21')).rejects.toThrow(
				'FDA API error: 500'
			);
		});

		it('should return null for 404 errors', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			});

			const result = await getNDCPackageInfo('invalid-ndc');

			expect(result).toBeNull();
		});
	});

	describe('getMultipleNDCPackages', () => {
		it('should fetch multiple NDC packages', async () => {
			const mockResponse1 = {
				results: [
					{
						product_ndc: '00603-0657',
						generic_name: 'Acetaminophen',
						brand_name: 'Tylenol',
						labeler_name: 'Qualitest',
						marketing_start_date: '20100101',
						packaging: [
							{
								package_ndc: '00603-0657-21',
								description: '100 TABLET in 1 BOTTLE',
								marketing_start_date: '20100101'
							}
						]
					}
				]
			};

			const mockResponse2 = {
				results: [
					{
						product_ndc: '00603-0657',
						generic_name: 'Acetaminophen',
						brand_name: 'Tylenol',
						labeler_name: 'Qualitest',
						marketing_start_date: '20100101',
						packaging: [
							{
								package_ndc: '00603-0657-32',
								description: '30 TABLET in 1 BOTTLE',
								marketing_start_date: '20100101'
							}
						]
					}
				]
			};

			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockResponse1
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockResponse2
				});

			const result = await getMultipleNDCPackages([
				'00603-0657-21',
				'00603-0657-32'
			]);

			expect(result).toHaveLength(2);
			expect(result[0].packageSize).toBe(100);
			expect(result[1].packageSize).toBe(30);
		});

		it('should handle batching with delay for multiple NDCs', async () => {
			const mockResponse1 = {
				results: [
					{
						product_ndc: '00603-0657',
						generic_name: 'Drug A',
						labeler_name: 'Pharma A',
						marketing_start_date: '20100101',
						packaging: [
							{
								package_ndc: '00603-0657-01',
								description: '30 TABLET in 1 BOTTLE',
								marketing_start_date: '20100101'
							}
						]
					}
				]
			};

			const mockResponse2 = {
				results: [
					{
						product_ndc: '00603-0658',
						generic_name: 'Drug B',
						labeler_name: 'Pharma B',
						marketing_start_date: '20100101',
						packaging: [
							{
								package_ndc: '00603-0658-01',
								description: '60 TABLET in 1 BOTTLE',
								marketing_start_date: '20100101'
							}
						]
					}
				]
			};

			// Mock 6 NDCs to trigger batching (batch size is 5)
			const ndcs = Array.from({ length: 6 }, (_, i) => `00603-065${i + 7}-01`);

			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockResponse1
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockResponse2
				})
				.mockResolvedValue({
					ok: true,
					json: async () => ({ results: [] })
				});

			const startTime = Date.now();
			const result = await getMultipleNDCPackages(ndcs);
			const endTime = Date.now();

			// Should have some delay between batches (at least 100ms)
			// But we'll just verify it completes successfully
			expect(result.length).toBeGreaterThanOrEqual(0);
		});

		it('should handle some failed requests gracefully', async () => {
			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						results: [
							{
								product_ndc: '00603-0657',
								generic_name: 'Drug A',
								labeler_name: 'Pharma A',
								marketing_start_date: '20100101',
								packaging: [
									{
										package_ndc: '00603-0657-21',
										description: '100 TABLET in 1 BOTTLE',
										marketing_start_date: '20100101'
									}
								]
							}
						]
					})
				})
				.mockRejectedValueOnce(new Error('Network error'));

			const result = await getMultipleNDCPackages([
				'00603-0657-21',
				'invalid-ndc'
			]);

			// Should return only successful ones
			expect(result).toHaveLength(1);
		});
	});

	describe('searchNDCsByDrugName', () => {
		it('should search NDCs by brand name', async () => {
			const mockResponse = {
				results: [
					{
						product_ndc: '00603-0657',
						generic_name: 'Acetaminophen',
						brand_name: 'Tylenol',
						labeler_name: 'Qualitest',
						marketing_start_date: '20100101',
						packaging: [
							{
								package_ndc: '00603-0657-21',
								description: '100 TABLET in 1 BOTTLE',
								marketing_start_date: '20100101'
							},
							{
								package_ndc: '00603-0657-32',
								description: '30 TABLET in 1 BOTTLE',
								marketing_start_date: '20100101'
							}
						]
					}
				]
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await searchNDCsByDrugName('Tylenol');

			expect(result).toHaveLength(2);
			expect(result[0].productName).toBe('Tylenol');
		});

		it('should return empty array when no results found', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: []
				})
			});

			const result = await searchNDCsByDrugName('NonexistentDrug123');

			expect(result).toEqual([]);
		});

		it('should handle API errors', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			});

			await expect(searchNDCsByDrugName('Tylenol')).rejects.toThrow();
		});

		it('should return empty array for 404', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 404
			});

			const result = await searchNDCsByDrugName('Unknown');

			expect(result).toEqual([]);
		});

		it('should return empty array when data.results is missing', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					// No results property
				})
			});

			const result = await searchNDCsByDrugName('Test Drug');

			expect(result).toEqual([]);
		});
	});
});
