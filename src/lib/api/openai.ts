import OpenAI from 'openai';
import type { ParsedSIG, APIError } from '$lib/types';

// Medical abbreviations dictionary for reference
const MEDICAL_ABBREVIATIONS: Record<string, string> = {
	QD: 'once daily',
	BID: 'twice daily',
	TID: 'three times daily',
	QID: 'four times daily',
	Q4H: 'every 4 hours',
	Q6H: 'every 6 hours',
	Q8H: 'every 8 hours',
	Q12H: 'every 12 hours',
	PRN: 'as needed',
	AC: 'before meals',
	PC: 'after meals',
	HS: 'at bedtime',
	PO: 'by mouth',
	SL: 'sublingual',
	IM: 'intramuscular',
	IV: 'intravenous',
	TOP: 'topical'
};

let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client (call this once at app startup)
 */
export function initializeOpenAI(apiKey: string): void {
	if (!apiKey) {
		throw new Error('OpenAI API key is required');
	}
	openaiClient = new OpenAI({ apiKey });
}

/**
 * Get or create OpenAI client instance
 */
function getClient(): OpenAI {
	if (!openaiClient) {
		// Try to get from environment (works in both Node.js and SvelteKit)
		const apiKey = typeof process !== 'undefined' && process.env
			? process.env.OPENAI_API_KEY
			: undefined;
		if (!apiKey) {
			throw new Error('OpenAI API key not configured');
		}
		initializeOpenAI(apiKey);
	}
	return openaiClient!;
}

/**
 * Parse prescription SIG (instructions) into structured data
 */
export async function parseSIG(sig: string): Promise<ParsedSIG> {
	try {
		const client = getClient();

		const prompt = `You are a pharmacy prescription parser. Parse this prescription SIG (instruction) into structured data.

SIG: "${sig}"

Medical abbreviations reference:
${Object.entries(MEDICAL_ABBREVIATIONS)
	.map(([abbr, meaning]) => `- ${abbr}: ${meaning}`)
	.join('\n')}

Extract the following information:
1. dose: The numeric dose per administration (just the number)
2. doseUnit: The unit for the dose (tablet, capsule, ml, mg, g, mcg, puff, patch, applicator, etc.)
3. frequency: Number of times per day (convert abbreviations to numbers: QD=1, BID=2, TID=3, QID=4, etc.)
   - If "as needed" or PRN, use frequency=0
   - If every X hours, convert to times per day (Q6H = 4 times/day)
4. route: Route of administration (oral, topical, sublingual, etc.)
5. instructions: Full readable English instructions
6. isAmbiguous: true if the SIG is unclear or impossible to parse accurately
7. clarificationNeeded: If ambiguous, what clarification is needed

Return ONLY a JSON object with these exact fields, no additional text:
{
  "dose": number,
  "doseUnit": "string",
  "frequency": number,
  "route": "string",
  "instructions": "string",
  "isAmbiguous": boolean,
  "clarificationNeeded": "string or null"
}

Examples:
- "Take 1 tablet by mouth twice daily" → dose: 1, doseUnit: "tablet", frequency: 2, route: "oral"
- "Apply 1 patch topically every 24 hours" → dose: 1, doseUnit: "patch", frequency: 1, route: "topical"
- "Inhale 2 puffs Q6H PRN" → dose: 2, doseUnit: "puff", frequency: 0, route: "inhalation"
- "Take 5ml PO BID" → dose: 5, doseUnit: "ml", frequency: 2, route: "oral"`;

		const response = await client.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content:
						'You are a pharmacy prescription parser that ONLY returns valid JSON. Never add explanation or extra text.'
				},
				{
					role: 'user',
					content: prompt
				}
			],
			temperature: 0.1, // Low temperature for consistency
			max_tokens: 500,
			response_format: { type: 'json_object' }
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error('No response from OpenAI');
		}

		const parsed = JSON.parse(content);

		// Validate the response has required fields
		if (
			typeof parsed.dose !== 'number' ||
			typeof parsed.doseUnit !== 'string' ||
			typeof parsed.frequency !== 'number' ||
			typeof parsed.route !== 'string' ||
			typeof parsed.instructions !== 'string' ||
			typeof parsed.isAmbiguous !== 'boolean'
		) {
			throw new Error('Invalid response format from OpenAI');
		}

		const result: ParsedSIG = {
			dose: parsed.dose,
			doseUnit: parsed.doseUnit.toLowerCase(),
			frequency: parsed.frequency,
			route: parsed.route.toLowerCase(),
			instructions: parsed.instructions,
			isAmbiguous: parsed.isAmbiguous,
			clarificationNeeded: parsed.clarificationNeeded || undefined
		};

		return result;
	} catch (error) {
		// If JSON parsing fails, create a fallback ambiguous response
		if (error instanceof SyntaxError) {
			return {
				dose: 0,
				doseUnit: 'unknown',
				frequency: 0,
				route: 'unknown',
				instructions: sig,
				isAmbiguous: true,
				clarificationNeeded:
					'Unable to parse prescription instructions. Please review manually.'
			};
		}

		const apiError: APIError = {
			message: error instanceof Error ? error.message : 'Unknown error',
			code: 'OPENAI_ERROR',
			details: error
		};
		throw apiError;
	}
}

/**
 * Parse a complex taper SIG (e.g., prednisone tapers)
 * This is a specialized parser for step-down regimens
 */
export async function parseTaperSIG(sig: string): Promise<ParsedSIG & { taperSchedule?: Array<{ tablets: number; days: number }> }> {
	try {
		const client = getClient();

		const prompt = `You are a pharmacy prescription parser specializing in taper schedules. Parse this taper prescription:

SIG: "${sig}"

Identify if this is a taper (step-down dosing schedule). If it is, extract:
1. The taper schedule as an array of steps: [{ tablets: number, days: number }, ...]
2. Calculate the total tablets needed
3. The dose unit (usually tablets for tapers)

Return ONLY a JSON object:
{
  "dose": total_tablets_needed,
  "doseUnit": "tablet",
  "frequency": 0,
  "route": "oral",
  "instructions": "readable instructions",
  "isAmbiguous": false,
  "clarificationNeeded": null,
  "taperSchedule": [{ "tablets": number, "days": number }, ...]
}

Example:
"4 tabs x 3 days, 3 tabs x 3 days, 2 tabs x 3 days, 1 tab x 3 days"
→ taperSchedule: [{"tablets": 4, "days": 3}, {"tablets": 3, "days": 3}, {"tablets": 2, "days": 3}, {"tablets": 1, "days": 3}]
→ dose: 30 (total tablets: 4*3 + 3*3 + 2*3 + 1*3 = 30)`;

		const response = await client.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: 'You are a pharmacy taper parser that ONLY returns valid JSON.'
				},
				{
					role: 'user',
					content: prompt
				}
			],
			temperature: 0.1,
			max_tokens: 500,
			response_format: { type: 'json_object' }
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error('No response from OpenAI');
		}

		const parsed = JSON.parse(content);

		return {
			dose: parsed.dose,
			doseUnit: parsed.doseUnit.toLowerCase(),
			frequency: parsed.frequency || 0,
			route: parsed.route.toLowerCase(),
			instructions: parsed.instructions,
			isAmbiguous: parsed.isAmbiguous || false,
			clarificationNeeded: parsed.clarificationNeeded || undefined,
			taperSchedule: parsed.taperSchedule
		};
	} catch (error) {
		const apiError: APIError = {
			message: error instanceof Error ? error.message : 'Unknown error',
			code: 'OPENAI_TAPER_ERROR',
			details: error
		};
		throw apiError;
	}
}

// Export for testing
export const __test = {
	MEDICAL_ABBREVIATIONS
};
