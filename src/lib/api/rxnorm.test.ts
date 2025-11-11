import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	drugNameToRxCUI,
	ndcToRxCUI,
	getRxCUINDCs,
	isRxCUIActive,
	__cache
} from './rxnorm';

// Mock fetch globally
global.fetch = vi.fn();

describe('RxNorm API Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		__cache.clear();
	});

	describe('drugNameToRxCUI', () => {
		it('should return RxCUI for exact match', async () => {
			// Mock exact match response
			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						idGroup: {
							rxnormId: ['161']
						}
					})
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						propConceptGroup: {
							propConcept: [
								{
									propValue: 'Acetaminophen'
								}
							]
						}
					})
				});

			const result = await drugNameToRxCUI('Acetaminophen');

			expect(result).toEqual({
				rxcui: '161',
				name: 'Acetaminophen'
			});
		});

		it('should use approximate match when exact match fails', async () => {
			// Mock exact match failure, then approximate match success
			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						idGroup: {}
					})
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						approximateGroup: {
							candidate: [
								{
									rxcui: '161',
									name: 'Acetaminophen',
									score: '100'
								}
							]
						}
					})
				});

			const result = await drugNameToRxCUI('tylenol');

			expect(result).toEqual({
				rxcui: '161',
				name: 'Acetaminophen',
				synonym: 'tylenol'
			});
		});

		it('should throw error when no match found', async () => {
			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						idGroup: {}
					})
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						approximateGroup: {}
					})
				});

			await expect(drugNameToRxCUI('invaliddrugname123456')).rejects.toThrow(
				'No RxCUI found for drug name'
			);
		});

		it('should use cache for repeated requests', async () => {
			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						idGroup: {
							rxnormId: ['161']
						}
					})
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						propConceptGroup: {
							propConcept: [{ propValue: 'Acetaminophen' }]
						}
					})
				});

			// First call
			await drugNameToRxCUI('Acetaminophen');

			// Second call should use cache
			const result = await drugNameToRxCUI('Acetaminophen');

			expect(result.rxcui).toBe('161');
			// fetch should only be called twice (once for exact, once for details)
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('ndcToRxCUI', () => {
		it('should normalize NDC and return RxCUI', async () => {
			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						ndcStatus: {
							rxcui: '161'
						}
					})
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						propConceptGroup: {
							propConcept: [{ propValue: 'Acetaminophen' }]
						}
					})
				});

			const result = await ndcToRxCUI('00603-0657-21');

			expect(result).toEqual({
				rxcui: '161',
				name: 'Acetaminophen'
			});

			// Verify NDC was normalized (dashes removed)
			expect((global.fetch as any).mock.calls[0][0]).toContain('ndc=0060306572');
		});

		it('should throw error when NDC not found', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					ndcStatus: {}
				})
			});

			await expect(ndcToRxCUI('invalid-ndc')).rejects.toThrow('No RxCUI found for NDC');
		});
	});

	describe('getRxCUINDCs', () => {
		it('should return list of NDCs for RxCUI', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					ndcGroup: {
						ndcList: {
							ndc: ['00603-0657-21', '00603-0657-32', '00093-2748-01']
						}
					}
				})
			});

			const result = await getRxCUINDCs('161');

			expect(result).toHaveLength(3);
			expect(result).toContain('00603-0657-21');
		});

		it('should return empty array when no NDCs found', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					ndcGroup: {}
				})
			});

			const result = await getRxCUINDCs('999999');

			expect(result).toEqual([]);
		});
	});

	describe('isRxCUIActive', () => {
		it('should return true for active RxCUI', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					rxcuiStatus: {
						status: 'Active'
					}
				})
			});

			const result = await isRxCUIActive('161');

			expect(result).toBe(true);
		});

		it('should return true for current RxCUI', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					rxcuiStatus: {
						status: 'Current'
					}
				})
			});

			const result = await isRxCUIActive('161');

			expect(result).toBe(true);
		});

		it('should return false for inactive RxCUI', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					rxcuiStatus: {
						status: 'Obsolete'
					}
				})
			});

			const result = await isRxCUIActive('999999');

			expect(result).toBe(false);
		});

		it('should return false on API error', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false
			});

			const result = await isRxCUIActive('invalid');

			expect(result).toBe(false);
		});
	});
});
