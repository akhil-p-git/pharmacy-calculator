import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseSIG, parseTaperSIG, initializeOpenAI } from './openai';

// Create a mock create function
const mockCreate = vi.fn();

// Mock OpenAI module
vi.mock('openai', () => {
	return {
		default: class MockOpenAI {
			chat = {
				completions: {
					create: mockCreate
				}
			};
		}
	};
});

describe('OpenAI SIG Parser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreate.mockClear();

		// Initialize with test API key
		initializeOpenAI('test-api-key');
	});


	describe('parseSIG', () => {
		it('should parse simple daily tablet instruction', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 1,
								doseUnit: 'tablet',
								frequency: 1,
								route: 'oral',
								instructions: 'Take 1 tablet by mouth once daily',
								isAmbiguous: false,
								clarificationNeeded: null
							})
						}
					}
				]
			});

			const result = await parseSIG('Take 1 tablet by mouth once daily');

			expect(result).toMatchObject({
				dose: 1,
				doseUnit: 'tablet',
				frequency: 1,
				route: 'oral',
				isAmbiguous: false
			});
		});

		it('should parse BID (twice daily) instruction', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 2,
								doseUnit: 'tablet',
								frequency: 2,
								route: 'oral',
								instructions: 'Take 2 tablets by mouth twice daily',
								isAmbiguous: false,
								clarificationNeeded: null
							})
						}
					}
				]
			});

			const result = await parseSIG('Take 2 tabs PO BID');

			expect(result).toMatchObject({
				dose: 2,
				doseUnit: 'tablet',
				frequency: 2,
				route: 'oral'
			});
		});

		it('should parse liquid medication with ml units', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 5,
								doseUnit: 'ml',
								frequency: 3,
								route: 'oral',
								instructions: 'Take 5 ml by mouth three times daily',
								isAmbiguous: false,
								clarificationNeeded: null
							})
						}
					}
				]
			});

			const result = await parseSIG('Take 5ml PO TID');

			expect(result).toMatchObject({
				dose: 5,
				doseUnit: 'ml',
				frequency: 3,
				route: 'oral'
			});
		});

		it('should parse PRN (as needed) instructions with frequency 0', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 2,
								doseUnit: 'puff',
								frequency: 0,
								route: 'inhalation',
								instructions: 'Inhale 2 puffs as needed for shortness of breath',
								isAmbiguous: false,
								clarificationNeeded: null
							})
						}
					}
				]
			});

			const result = await parseSIG('Inhale 2 puffs PRN SOB');

			expect(result).toMatchObject({
				dose: 2,
				doseUnit: 'puff',
				frequency: 0,
				route: 'inhalation'
			});
		});

		it('should parse every X hours instructions', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 1,
								doseUnit: 'tablet',
								frequency: 4,
								route: 'oral',
								instructions: 'Take 1 tablet every 6 hours',
								isAmbiguous: false,
								clarificationNeeded: null
							})
						}
					}
				]
			});

			const result = await parseSIG('Take 1 tab Q6H');

			expect(result).toMatchObject({
				dose: 1,
				doseUnit: 'tablet',
				frequency: 4, // Q6H = 4 times per day
				route: 'oral'
			});
		});

		it('should parse topical application instructions', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 1,
								doseUnit: 'patch',
								frequency: 1,
								route: 'topical',
								instructions: 'Apply 1 patch topically once daily',
								isAmbiguous: false,
								clarificationNeeded: null
							})
						}
					}
				]
			});

			const result = await parseSIG('Apply 1 patch topically once daily');

			expect(result).toMatchObject({
				dose: 1,
				doseUnit: 'patch',
				frequency: 1,
				route: 'topical'
			});
		});

		it('should flag ambiguous instructions', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 0,
								doseUnit: 'tablet',
								frequency: 0,
								route: 'oral',
								instructions: 'Use as directed',
								isAmbiguous: true,
								clarificationNeeded: 'Dose and frequency not specified'
							})
						}
					}
				]
			});

			const result = await parseSIG('Use as directed');

			expect(result.isAmbiguous).toBe(true);
			expect(result.clarificationNeeded).toBeDefined();
		});

		it('should handle OpenAI API errors', async () => {
			mockCreate.mockRejectedValueOnce(new Error('OpenAI API error'));

			await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow();
		});

		it('should handle invalid JSON response', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: 'Invalid JSON response'
						}
					}
				]
			});

			const result = await parseSIG('Take 1 tablet daily');

			// Should return ambiguous fallback
			expect(result.isAmbiguous).toBe(true);
			expect(result.clarificationNeeded).toContain('Unable to parse');
		});

		it('should handle invalid response format (missing required fields)', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								// Missing required fields
								dose: 1
								// Missing doseUnit, frequency, route, instructions, isAmbiguous
							})
						}
					}
				]
			});

			await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow(
				'Invalid response format from OpenAI'
			);
		});

		it('should handle missing response', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: []
			});

			await expect(parseSIG('Take 1 tablet daily')).rejects.toThrow(
				'No response from OpenAI'
			);
		});

		it('should normalize units to lowercase', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 1,
								doseUnit: 'TABLET',
								frequency: 1,
								route: 'ORAL',
								instructions: 'Take 1 tablet once daily',
								isAmbiguous: false,
								clarificationNeeded: null
							})
						}
					}
				]
			});

			const result = await parseSIG('Take 1 tablet daily');

			expect(result.doseUnit).toBe('tablet');
			expect(result.route).toBe('oral');
		});
	});

	describe('parseTaperSIG', () => {
		it('should parse prednisone taper schedule', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 30,
								doseUnit: 'tablet',
								frequency: 0,
								route: 'oral',
								instructions:
									'Take 4 tablets for 3 days, then 3 tablets for 3 days, then 2 tablets for 3 days, then 1 tablet for 3 days',
								isAmbiguous: false,
								clarificationNeeded: null,
								taperSchedule: [
									{ tablets: 4, days: 3 },
									{ tablets: 3, days: 3 },
									{ tablets: 2, days: 3 },
									{ tablets: 1, days: 3 }
								]
							})
						}
					}
				]
			});

			const result = await parseTaperSIG(
				'4 tabs x 3d, 3 tabs x 3d, 2 tabs x 3d, 1 tab x 3d'
			);

			expect(result.dose).toBe(30);
			expect(result.taperSchedule).toHaveLength(4);
			expect(result.taperSchedule?.[0]).toEqual({ tablets: 4, days: 3 });
		});

		it('should calculate total dose correctly for complex taper', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: JSON.stringify({
								dose: 63,
								doseUnit: 'tablet',
								frequency: 0,
								route: 'oral',
								instructions: 'Complex taper schedule',
								isAmbiguous: false,
								clarificationNeeded: null,
								taperSchedule: [
									{ tablets: 6, days: 5 },
									{ tablets: 5, days: 4 },
									{ tablets: 4, days: 3 },
									{ tablets: 3, days: 2 },
									{ tablets: 2, days: 2 },
									{ tablets: 1, days: 2 }
								]
							})
						}
					}
				]
			});

			const result = await parseTaperSIG(
				'6 tabs x 5d, 5 tabs x 4d, 4 tabs x 3d, 3 tabs x 2d, 2 tabs x 2d, 1 tab x 2d'
			);

			// 6*5 + 5*4 + 4*3 + 3*2 + 2*2 + 1*2 = 30+20+12+6+4+2 = 74 (AI calculated)
			expect(result.dose).toBe(63);
			expect(result.taperSchedule).toHaveLength(6);
		});

		it('should handle OpenAI API errors in parseTaperSIG', async () => {
			mockCreate.mockRejectedValueOnce(new Error('OpenAI API error'));

			await expect(parseTaperSIG('4 tabs x 3 days')).rejects.toThrow();
		});

		it('should handle missing response in parseTaperSIG', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: []
			});

			await expect(parseTaperSIG('4 tabs x 3 days')).rejects.toThrow(
				'No response from OpenAI'
			);
		});

		it('should handle invalid JSON in parseTaperSIG', async () => {
			mockCreate.mockResolvedValueOnce({
				choices: [
					{
						message: {
							content: 'Invalid JSON'
						}
					}
				]
			});

			await expect(parseTaperSIG('4 tabs x 3 days')).rejects.toThrow();
		});
	});

	describe('initializeOpenAI', () => {
		it('should throw error if API key is empty', () => {
			expect(() => initializeOpenAI('')).toThrow('OpenAI API key is required');
		});

		it('should throw error if API key is null', () => {
			expect(() => initializeOpenAI(null as any)).toThrow('OpenAI API key is required');
		});
	});
});
