import type { NDCPackage, APIError } from '$lib/types';

const FDA_BASE_URL = 'https://api.fda.gov/drug/ndc.json';

/**
 * Parse package description to extract size and unit
 * Examples: "100 TABLET in 1 BOTTLE", "30 mL in 1 VIAL"
 */
function parsePackageDescription(description: string): { size: number; unit: string } {
	// Try to match patterns like "100 TABLET", "30 mL", etc.
	const match = description.match(/^(\d+(?:\.\d+)?)\s+([A-Za-z]+)/i);

	if (match) {
		return {
			size: parseFloat(match[1]),
			unit: match[2].toLowerCase()
		};
	}

	// Default fallback
	return {
		size: 1,
		unit: 'unit'
	};
}

/**
 * Normalize NDC format to match FDA API format
 * FDA uses format: XXXXX-XXXX-XX (5-4-2)
 */
export function normalizeNDC(ndc: string): string {
	// Remove all non-numeric characters
	const digitsOnly = ndc.replace(/\D/g, '');

	if (digitsOnly.length === 11) {
		// Already 11 digits, format as 5-4-2
		return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 9)}-${digitsOnly.slice(9)}`;
	} else if (digitsOnly.length === 10) {
		// 10 digits - could be 4-4-2 or 5-3-2, pad to 5-4-2
		// Common convention: assume 4-4-2 and pad labeler code
		return `0${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 8)}-${digitsOnly.slice(8)}`;
	}

	// Return as-is if we can't normalize
	return ndc;
}

/**
 * Check if an NDC is currently active based on marketing dates
 */
function isNDCActive(
	startDate: string | undefined,
	endDate: string | undefined
): boolean {
	if (!startDate) return false;

	const now = new Date();
	const start = parseMarketingDate(startDate);

	if (!start || start > now) {
		return false;
	}

	if (endDate) {
		const end = parseMarketingDate(endDate);
		if (end && end < now) {
			return false;
		}
	}

	return true;
}

/**
 * Parse FDA marketing date format (YYYYMMDD)
 */
function parseMarketingDate(dateStr: string): Date | null {
	if (!dateStr || dateStr.length !== 8) return null;

	const year = parseInt(dateStr.slice(0, 4));
	const month = parseInt(dateStr.slice(4, 6)) - 1; // JS months are 0-indexed
	const day = parseInt(dateStr.slice(6, 8));

	return new Date(year, month, day);
}

/**
 * Get NDC package information from FDA API
 */
export async function getNDCPackageInfo(ndc: string): Promise<NDCPackage | null> {
	const normalizedNDC = normalizeNDC(ndc);
	console.log('[FDA] Looking up NDC:', ndc, '(normalized:', normalizedNDC + ')');

	try {
		// Search by product NDC (first 9 digits) or package NDC
		const productNDC = normalizedNDC.split('-').slice(0, 2).join('-');
		const url = `${FDA_BASE_URL}?search=product_ndc:"${productNDC}" OR packaging.package_ndc:"${normalizedNDC}"&limit=1`;
		console.log('[FDA] URL for NDC lookup:', url);

		const response = await fetch(url);

		if (!response.ok) {
			if (response.status === 404) {
				console.log('[FDA] Package not found (404) for NDC:', ndc);
				return null;
			}
			console.error('[FDA] API error for NDC', ndc, ':', response.status, response.statusText);
			throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		console.log('[FDA] Response for NDC', ndc, ':', JSON.stringify(data, null, 2));

		if (!data.results || data.results.length === 0) {
			console.log('[FDA] No results found for NDC:', ndc);
			return null;
		}

		const result = data.results[0];

		// Find the specific package if multiple packages exist
		let packageInfo = result.packaging?.[0];
		if (result.packaging && result.packaging.length > 1) {
			const exactMatch = result.packaging.find(
				(pkg: any) => pkg.package_ndc === normalizedNDC
			);
			if (exactMatch) {
				packageInfo = exactMatch;
			}
		}

		if (!packageInfo) {
			console.log('[FDA] No package info found for NDC:', ndc);
			return null;
		}

		const { size, unit } = parsePackageDescription(packageInfo.description || '');

		const ndcPackage: NDCPackage = {
			ndc: packageInfo.package_ndc || normalizedNDC,
			packageDescription: packageInfo.description || '',
			packageSize: size,
			packageUnit: unit,
			productName: result.brand_name || result.generic_name || 'Unknown',
			manufacturer: result.labeler_name || 'Unknown',
			active: isNDCActive(
				packageInfo.marketing_start_date,
				result.marketing_end_date
			),
			startMarketingDate: packageInfo.marketing_start_date,
			endMarketingDate: result.marketing_end_date
		};

		console.log('[FDA] Package found:', JSON.stringify(ndcPackage, null, 2));
		return ndcPackage;
	} catch (error) {
		console.error('[FDA] Error looking up NDC', ndc, ':', error);
		const apiError: APIError = {
			message: error instanceof Error ? error.message : 'Unknown error',
			code: 'FDA_NDC_ERROR',
			details: error
		};
		throw apiError;
	}
}

/**
 * Get all packages for multiple NDCs
 */
export async function getMultipleNDCPackages(ndcs: string[]): Promise<NDCPackage[]> {
	console.log('[FDA] getMultipleNDCPackages called with', ndcs.length, 'NDCs');
	const packages: NDCPackage[] = [];
	const nullNDCs: string[] = [];
	const validNDCs: string[] = [];

	// Process in batches to avoid rate limiting
	const batchSize = 5;
	for (let i = 0; i < ndcs.length; i += batchSize) {
		const batch = ndcs.slice(i, i + batchSize);
		console.log('[FDA] Processing batch', Math.floor(i / batchSize) + 1, 'of', Math.ceil(ndcs.length / batchSize), '- NDCs:', batch);
		
		const promises = batch.map((ndc) =>
			getNDCPackageInfo(ndc).catch(() => null)
		);
		const results = await Promise.all(promises);

		// Track which NDCs returned null vs valid packages
		results.forEach((result, index) => {
			const ndc = batch[index];
			if (result === null) {
				nullNDCs.push(ndc);
				console.log('[FDA] NDC returned null:', ndc);
			} else {
				validNDCs.push(ndc);
				console.log('[FDA] NDC returned valid package:', ndc);
			}
		});

		packages.push(...results.filter((pkg): pkg is NDCPackage => pkg !== null));

		// Small delay between batches to be respectful of API
		if (i + batchSize < ndcs.length) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	console.log('[FDA] getMultipleNDCPackages complete:', {
		totalRequested: ndcs.length,
		validPackages: packages.length,
		nullResults: nullNDCs.length,
		validNDCs: validNDCs,
		nullNDCs: nullNDCs
	});

	return packages;
}

/**
 * Search NDCs by drug name
 */
export async function searchNDCsByDrugName(drugName: string, limit: number = 10): Promise<NDCPackage[]> {
	try {
		const url = `${FDA_BASE_URL}?search=brand_name:"${encodeURIComponent(drugName)}" OR generic_name:"${encodeURIComponent(drugName)}"&limit=${limit}`;

		const response = await fetch(url);

		if (!response.ok) {
			if (response.status === 404) {
				return [];
			}
			throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		if (!data.results) {
			return [];
		}

		const packages: NDCPackage[] = [];

		for (const result of data.results) {
			if (!result.packaging) continue;

			for (const pkg of result.packaging) {
				const { size, unit } = parsePackageDescription(pkg.description || '');

				packages.push({
					ndc: pkg.package_ndc,
					packageDescription: pkg.description || '',
					packageSize: size,
					packageUnit: unit,
					productName: result.brand_name || result.generic_name || 'Unknown',
					manufacturer: result.labeler_name || 'Unknown',
					active: isNDCActive(pkg.marketing_start_date, result.marketing_end_date),
					startMarketingDate: pkg.marketing_start_date,
					endMarketingDate: result.marketing_end_date
				});
			}
		}

		return packages;
	} catch (error) {
		const apiError: APIError = {
			message: error instanceof Error ? error.message : 'Unknown error',
			code: 'FDA_SEARCH_ERROR',
			details: error
		};
		throw apiError;
	}
}
