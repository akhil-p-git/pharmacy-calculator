import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { calculatePrescription } from '$lib/core/calculator';
import { initializeOpenAI } from '$lib/api/openai';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Zod schema for request validation
const CalculationRequestSchema = z.object({
	drugNameOrNDC: z
		.string()
		.min(2, 'Drug name or NDC must be at least 2 characters')
		.max(200, 'Drug name or NDC is too long (max 200 characters)'),
	sig: z
		.string()
		.min(5, 'Prescription instructions (SIG) must be at least 5 characters')
		.max(500, 'Prescription instructions are too long (max 500 characters)'),
	daysSupply: z
		.number()
		.int('Days supply must be a whole number')
		.min(1, 'Days supply must be at least 1')
		.max(365, 'Days supply cannot exceed 365 days')
});

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	console.log('[POST /api/calculate] Request received');
	
	// Initialize OpenAI if API key is available
	const openaiApiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
	if (openaiApiKey) {
		try {
			initializeOpenAI(openaiApiKey);
		} catch (err) {
			console.error('[POST /api/calculate] Failed to initialize OpenAI:', err);
			if (err instanceof Error) {
				console.error('[POST /api/calculate] OpenAI initialization error stack:', err.stack);
			}
			// Continue without OpenAI - will fail later if needed
		}
	}

	// Parse and validate request body
	let body;
	try {
		body = await request.json();
		console.log('[POST /api/calculate] Incoming request body:', JSON.stringify(body, null, 2));
	} catch (err) {
		console.error('[POST /api/calculate] JSON parse error:', err);
		if (err instanceof Error) {
			console.error('[POST /api/calculate] JSON parse error stack:', err.stack);
		}
		return json(
			{
				success: false,
				error: {
					message: 'Invalid JSON in request body',
					code: 'INVALID_JSON'
				}
			},
			{
				status: 400,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'X-RateLimit-Limit': '100'
				}
			}
		);
	}

	// Validate with Zod schema
	const validationResult = CalculationRequestSchema.safeParse(body);
	if (!validationResult.success) {
		const errors = validationResult.error.issues.map((err) => {
			const path = err.path.join('.');
			return `${path}: ${err.message}`;
		});

		return json(
			{
				success: false,
				error: {
					message: 'Validation failed',
					code: 'VALIDATION_ERROR',
					details: errors
				}
			},
			{
				status: 400,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'X-RateLimit-Limit': '100'
				}
			}
		);
	}

	const input = validationResult.data;
	console.log('[POST /api/calculate] Validated input:', JSON.stringify(input, null, 2));

	// Call the calculator orchestrator
	try {
		const result = await calculatePrescription(input);

		// Check for "not found" errors (drug not found)
		if (result.errors && result.errors.some((e) => e.toLowerCase().includes('not found'))) {
			return json(
				{
					success: false,
					error: {
						message: result.errors[0] || 'Drug not found',
						code: 'NOT_FOUND'
					}
				},
				{
					status: 404,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'X-RateLimit-Limit': '100'
					}
				}
			);
		}

		// Success response with wrapped format
		console.log('[POST /api/calculate] Calculation successful:', {
			success: result.success,
			selectedNDCsCount: result.selectedNDCs?.length || 0,
			warningsCount: result.warnings?.length || 0,
			errorsCount: result.errors?.length || 0
		});
		console.log('[POST /api/calculate] Final result before returning:', JSON.stringify(result, null, 2));
		
		return json(
			{
				success: true,
				data: result
			},
			{
				status: 200,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'X-RateLimit-Limit': '100',
					'X-RateLimit-Remaining': '99', // In production, implement actual rate limiting
					'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString() // 1 hour from now
				}
			}
		);
	} catch (err) {
		// Handle unexpected errors
		console.error('[POST /api/calculate] Calculation error:', err);
		if (err instanceof Error) {
			console.error('[POST /api/calculate] Calculation error stack:', err.stack);
		}

		const errorMessage =
			err instanceof Error ? err.message : 'An unexpected error occurred during calculation';

		// Check for "not found" errors in exception message
		if (errorMessage.toLowerCase().includes('not found')) {
			return json(
				{
					success: false,
					error: {
						message: errorMessage,
						code: 'NOT_FOUND'
					}
				},
				{
					status: 404,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'X-RateLimit-Limit': '100'
					}
				}
			);
		}

		return json(
			{
				success: false,
				error: {
					message: errorMessage,
					code: 'INTERNAL_SERVER_ERROR'
				}
			},
			{
				status: 500,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'X-RateLimit-Limit': '100'
				}
			}
		);
	}
};

// OPTIONS handler for CORS preflight
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400' // 24 hours
		}
	});
};

