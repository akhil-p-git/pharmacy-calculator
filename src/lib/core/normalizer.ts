import { drugNameToRxCUI, ndcToRxCUI } from '$lib/api/rxnorm';
import type { RxCUIResult, APIError } from '$lib/types';

/**
 * Detect if input looks like an NDC code
 * NDC formats: XXXXX-XXXX-XX (5-4-2), or 10-11 digits with optional dashes/spaces
 */
export function isNDCFormat(input: string): boolean {
	// Remove spaces and dashes
	const cleaned = input.replace(/[\s-]/g, '');

	// Check if it's 10 or 11 digits
	if (!/^\d{10,11}$/.test(cleaned)) {
		return false;
	}

	return true;
}

/**
 * Normalize drug input (either name or NDC) to RxCUI
 * This is the main entry point for drug normalization
 */
export async function normalizeDrug(input: string): Promise<RxCUIResult> {
	if (!input || input.trim().length === 0) {
		const error: APIError = {
			message: 'Drug name or NDC is required',
			code: 'INVALID_INPUT'
		};
		throw error;
	}

	const trimmedInput = input.trim();

	try {
		// Detect if input is NDC or drug name
		if (isNDCFormat(trimmedInput)) {
			return await ndcToRxCUI(trimmedInput);
		} else {
			return await drugNameToRxCUI(trimmedInput);
		}
	} catch (error) {
		// Re-throw with additional context
		const apiError: APIError = {
			message: `Failed to normalize drug: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			code: 'NORMALIZATION_ERROR',
			details: error
		};
		throw apiError;
	}
}

/**
 * Validate and clean drug input
 */
export function validateDrugInput(input: string): {
	valid: boolean;
	cleaned: string;
	errors: string[];
} {
	const errors: string[] = [];

	if (!input || input.trim().length === 0) {
		errors.push('Drug name or NDC is required');
		return { valid: false, cleaned: '', errors };
	}

	const cleaned = input.trim();

	// Check minimum length
	if (cleaned.length < 2) {
		errors.push('Drug name or NDC must be at least 2 characters');
	}

	// Check maximum length
	if (cleaned.length > 200) {
		errors.push('Drug name or NDC is too long (max 200 characters)');
	}

	// Check if input might be attempting to be an NDC
	const digitsOnly = cleaned.replace(/[\s-]/g, '');
	const looksLikeNDC = /^[\d\s-]+$/.test(cleaned); // Only contains digits, spaces, dashes

	if (looksLikeNDC && !isNDCFormat(cleaned)) {
		// It looks like an NDC attempt but isn't valid
		errors.push('Invalid NDC format (must be 10 or 11 digits)');
	}

	return {
		valid: errors.length === 0,
		cleaned,
		errors
	};
}
