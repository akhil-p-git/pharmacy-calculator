import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, OPTIONS } from '../../src/routes/api/calculate/+server';
import * as calculator from '../../src/lib/core/calculator';
import * as openai from '../../src/lib/api/openai';
import type { CalculationResult } from '../../src/lib/types';

// Mock the calculator and OpenAI modules
vi.mock('../../src/lib/core/calculator');
vi.mock('../../src/lib/api/openai');

describe('POST /api/calculate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Set OPENAI_API_KEY for tests
		process.env.OPENAI_API_KEY = 'test-key';
	});

	describe('Request Validation', () => {
		it('should return 400 for missing drugNameOrNDC', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('VALIDATION_ERROR');
			expect(data.error.details).toBeDefined();
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		});

		it('should return 400 for missing sig', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 for missing daysSupply', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily'
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 for invalid daysSupply (too low)', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 0
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 for invalid daysSupply (too high)', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 400
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 for non-integer daysSupply', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30.5
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 for drugNameOrNDC too short (less than 2 chars)', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'A',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 for sig too short (less than 5 chars)', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 for invalid JSON', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'invalid json'
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('INVALID_JSON');
		});
	});

	describe('Successful Calculation', () => {
		it('should return 200 with calculation result for valid request', async () => {
			const mockResult: CalculationResult = {
				success: true,
				input: {
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				},
				normalizedDrug: {
					rxcui: '29046',
					name: 'Lisinopril'
				},
				parsedSIG: {
					dose: 1,
					doseUnit: 'tablet',
					frequency: 1,
					route: 'oral',
					instructions: 'Take 1 tablet daily',
					isAmbiguous: false
				},
				calculation: {
					totalQuantityNeeded: 30,
					unit: 'tablet',
					daysSupply: 30,
					dailyDose: 1
				},
				selectedNDCs: [
					{
						ndc: '12345-0001-30',
						packageSize: 30,
						packageUnit: 'tablet',
						quantityToDispense: 30,
						numberOfPackages: 1,
						overfillPercentage: 0,
						productName: 'Lisinopril 10mg',
						manufacturer: 'Test Pharma'
					}
				],
				warnings: [],
				timestamp: new Date().toISOString()
			};

			vi.mocked(calculator.calculatePrescription).mockResolvedValue(mockResult);

			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data).toBeDefined();
			expect(data.data.success).toBe(true);
			expect(data.data.selectedNDCs).toBeDefined();
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
			expect(calculator.calculatePrescription).toHaveBeenCalledWith({
				drugNameOrNDC: 'Lisinopril 10mg',
				sig: 'Take 1 tablet daily',
				daysSupply: 30
			});
		});

		it('should return 200 even with warnings', async () => {
			const mockResult: CalculationResult = {
				success: true,
				input: {
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take as needed',
					daysSupply: 30
				},
				normalizedDrug: {
					rxcui: '29046',
					name: 'Lisinopril'
				},
				parsedSIG: {
					dose: 1,
					doseUnit: 'tablet',
					frequency: 0,
					route: 'oral',
					instructions: 'Take as needed',
					isAmbiguous: true,
					clarificationNeeded: 'PRN medication'
				},
				calculation: {
					totalQuantityNeeded: 0,
					unit: 'tablet',
					daysSupply: 30,
					dailyDose: 0
				},
				selectedNDCs: [],
				warnings: ['Quantity could not be calculated (PRN or ambiguous SIG)'],
				timestamp: new Date().toISOString()
			};

			vi.mocked(calculator.calculatePrescription).mockResolvedValue(mockResult);

			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take as needed',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.warnings.length).toBeGreaterThan(0);
		});
	});

	describe('Error Handling', () => {
		it('should return 404 for drug not found', async () => {
			const mockResult: CalculationResult = {
				success: false,
				input: {
					drugNameOrNDC: 'InvalidDrug123',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				},
				selectedNDCs: [],
				warnings: [],
				errors: ['Drug not found: InvalidDrug123'],
				timestamp: new Date().toISOString()
			};

			vi.mocked(calculator.calculatePrescription).mockResolvedValue(mockResult);

			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'InvalidDrug123',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('NOT_FOUND');
			expect(data.error.message).toContain('not found');
		});

		it('should return 500 for unexpected errors', async () => {
			vi.mocked(calculator.calculatePrescription).mockRejectedValue(
				new Error('Unexpected error')
			);

			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
			expect(data.error.message).toBe('Unexpected error');
		});

		it('should handle errors without message property', async () => {
			vi.mocked(calculator.calculatePrescription).mockRejectedValue('String error');

			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
			expect(data.error.message).toBe('An unexpected error occurred during calculation');
		});
	});

	describe('CORS Headers', () => {
		it('should include CORS headers in response', async () => {
			const mockResult: CalculationResult = {
				success: true,
				input: {
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				},
				selectedNDCs: [],
				warnings: [],
				timestamp: new Date().toISOString()
			};

			vi.mocked(calculator.calculatePrescription).mockResolvedValue(mockResult);

			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		});

		it('should handle OPTIONS preflight request', async () => {
			const request = new Request('http://localhost/api/calculate', {
				method: 'OPTIONS'
			});

			const response = await OPTIONS({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
			expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
		});
	});

	describe('Rate Limiting Headers', () => {
		it('should include rate limiting headers in response', async () => {
			const mockResult: CalculationResult = {
				success: true,
				input: {
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				},
				selectedNDCs: [],
				warnings: [],
				timestamp: new Date().toISOString()
			};

			vi.mocked(calculator.calculatePrescription).mockResolvedValue(mockResult);

			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
			expect(response.headers.get('X-RateLimit-Remaining')).toBe('99');
			expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
		});
	});

	describe('OpenAI Initialization', () => {
		it('should initialize OpenAI if API key is available', async () => {
			const mockResult: CalculationResult = {
				success: true,
				input: {
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				},
				selectedNDCs: [],
				warnings: [],
				timestamp: new Date().toISOString()
			};

			vi.mocked(calculator.calculatePrescription).mockResolvedValue(mockResult);
			vi.mocked(openai.initializeOpenAI).mockImplementation(() => {});

			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			// Check that initializeOpenAI was called (API key comes from .env file)
			expect(openai.initializeOpenAI).toHaveBeenCalled();
			// Verify it was called with a string (the actual key value doesn't matter for this test)
			const callArgs = vi.mocked(openai.initializeOpenAI).mock.calls[0];
			expect(typeof callArgs[0]).toBe('string');
			expect(callArgs[0].length).toBeGreaterThan(0);
		});

		it('should continue even if OpenAI initialization fails', async () => {
			process.env.OPENAI_API_KEY = 'invalid-key';

			const mockResult: CalculationResult = {
				success: true,
				input: {
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				},
				selectedNDCs: [],
				warnings: [],
				timestamp: new Date().toISOString()
			};

			vi.mocked(calculator.calculatePrescription).mockResolvedValue(mockResult);
			vi.mocked(openai.initializeOpenAI).mockImplementation(() => {
				throw new Error('Invalid API key');
			});

			const request = new Request('http://localhost/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drugNameOrNDC: 'Lisinopril 10mg',
					sig: 'Take 1 tablet daily',
					daysSupply: 30
				})
			});

			const response = await POST({
				request,
				getClientAddress: () => '127.0.0.1'
			} as any);

			// Should still succeed (OpenAI will fail later if needed)
			expect(response.status).toBe(200);
		});
	});
});
