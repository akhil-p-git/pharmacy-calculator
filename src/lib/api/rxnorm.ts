import type { RxCUIResult, APIError } from '$lib/types';

const RXNORM_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

// Simple in-memory cache with TTL
interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

class SimpleCache<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private ttl: number;

	constructor(ttlMinutes: number = 60) {
		this.ttl = ttlMinutes * 60 * 1000;
	}

	get(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const now = Date.now();
		if (now - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	set(key: string, data: T): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now()
		});
	}

	clear(): void {
		this.cache.clear();
	}
}

const rxcuiCache = new SimpleCache<RxCUIResult>(60); // 60 minute TTL

/**
 * Normalize drug name to RxCUI using RxNorm API
 */
export async function drugNameToRxCUI(drugName: string): Promise<RxCUIResult> {
	const cacheKey = `name:${drugName.toLowerCase().trim()}`;
	const cached = rxcuiCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		// Try exact match first
		const exactUrl = `${RXNORM_BASE_URL}/rxcui.json?name=${encodeURIComponent(drugName)}`;
		const exactResponse = await fetch(exactUrl);

		if (!exactResponse.ok) {
			throw new Error(`RxNorm API error: ${exactResponse.status} ${exactResponse.statusText}`);
		}

		const exactData = await exactResponse.json();
		const exactMatch = exactData?.idGroup?.rxnormId?.[0];

		if (exactMatch) {
			// Get the full concept details
			const detailsUrl = `${RXNORM_BASE_URL}/rxcui/${exactMatch}/property.json?propName=RxNorm%20Name`;
			const detailsResponse = await fetch(detailsUrl);
			const detailsData = await detailsResponse.json();

			const result: RxCUIResult = {
				rxcui: exactMatch,
				name: detailsData?.propConceptGroup?.propConcept?.[0]?.propValue || drugName
			};

			rxcuiCache.set(cacheKey, result);
			return result;
		}

		// If no exact match, try approximate match
		const approxUrl = `${RXNORM_BASE_URL}/approximateTerm.json?term=${encodeURIComponent(drugName)}&maxEntries=5`;
		const approxResponse = await fetch(approxUrl);

		if (!approxResponse.ok) {
			throw new Error(`RxNorm API error: ${approxResponse.status} ${approxResponse.statusText}`);
		}

		const approxData = await approxResponse.json();
		const candidates = approxData?.approximateGroup?.candidate;

		if (!candidates || candidates.length === 0) {
			throw new Error(`No RxCUI found for drug name: ${drugName}`);
		}

		// Take the best match (highest score)
		const bestMatch = candidates[0];
		const result: RxCUIResult = {
			rxcui: bestMatch.rxcui,
			name: bestMatch.name,
			synonym: drugName
		};

		rxcuiCache.set(cacheKey, result);
		return result;
	} catch (error) {
		const apiError: APIError = {
			message: error instanceof Error ? error.message : 'Unknown error',
			code: 'RXNORM_API_ERROR',
			details: error
		};
		throw apiError;
	}
}

/**
 * Normalize NDC to RxCUI using RxNorm API
 */
export async function ndcToRxCUI(ndc: string): Promise<RxCUIResult> {
	// Normalize NDC format (remove dashes/spaces)
	const normalizedNDC = ndc.replace(/[-\s]/g, '');

	const cacheKey = `ndc:${normalizedNDC}`;
	const cached = rxcuiCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const url = `${RXNORM_BASE_URL}/ndcstatus.json?ndc=${normalizedNDC}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`RxNorm API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		const rxcui = data?.ndcStatus?.rxcui;

		if (!rxcui) {
			throw new Error(`No RxCUI found for NDC: ${ndc}`);
		}

		// Get the concept name
		const nameUrl = `${RXNORM_BASE_URL}/rxcui/${rxcui}/property.json?propName=RxNorm%20Name`;
		const nameResponse = await fetch(nameUrl);
		const nameData = await nameResponse.json();

		const result: RxCUIResult = {
			rxcui: rxcui,
			name: nameData?.propConceptGroup?.propConcept?.[0]?.propValue || 'Unknown'
		};

		rxcuiCache.set(cacheKey, result);
		return result;
	} catch (error) {
		const apiError: APIError = {
			message: error instanceof Error ? error.message : 'Unknown error',
			code: 'RXNORM_NDC_ERROR',
			details: error
		};
		throw apiError;
	}
}

/**
 * Get all NDCs for a given RxCUI
 */
export async function getRxCUINDCs(rxcui: string): Promise<string[]> {
	try {
		const url = `${RXNORM_BASE_URL}/rxcui/${rxcui}/ndcs.json`;
		console.log('[RxNorm] Getting NDCs for RxCUI:', rxcui);
		console.log('[RxNorm] URL being called:', url);
		
		const response = await fetch(url);

		if (!response.ok) {
			console.error('[RxNorm] API error:', response.status, response.statusText);
			throw new Error(`RxNorm API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		console.log('[RxNorm] API Response:', JSON.stringify(data, null, 2));
		
		const ndcs = data?.ndcGroup?.ndcList?.ndc || [];
		console.log('[RxNorm] NDCs returned:', ndcs);
		console.log('[RxNorm] NDCs count:', ndcs.length);

		return ndcs;
	} catch (error) {
		console.error('[RxNorm] Error in getRxCUINDCs:', error);
		const apiError: APIError = {
			message: error instanceof Error ? error.message : 'Unknown error',
			code: 'RXNORM_NDCS_ERROR',
			details: error
		};
		throw apiError;
	}
}

/**
 * Check if RxCUI is active/current
 */
export async function isRxCUIActive(rxcui: string): Promise<boolean> {
	try {
		const url = `${RXNORM_BASE_URL}/rxcui/${rxcui}/status.json`;
		const response = await fetch(url);

		if (!response.ok) {
			return false;
		}

		const data = await response.json();
		const status = data?.rxcuiStatus?.status;

		return status === 'Active' || status === 'Current';
	} catch {
		return false;
	}
}

// Export cache for testing purposes
export const __cache = rxcuiCache;
