/**
 * Mock NDC data for common medications
 * Used as fallback when RxNorm API doesn't return NDC codes
 * These are real NDC codes for demonstration purposes
 */

import type { NDCPackage } from '$lib/types';

export interface MockDrugData {
	drugName: string;
	rxcui: string;
	packages: NDCPackage[];
}

export const MOCK_NDC_DATABASE: Record<string, MockDrugData> = {
	// Lisinopril 10mg
	'316151': {
		drugName: 'lisinopril 10 MG',
		rxcui: '316151',
		packages: [
			{
				ndc: '68180-0513-01',
				brandName: 'Lisinopril',
				genericName: 'lisinopril',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '10 mg/1',
				packageSize: 30,
				packageUnit: 'TABLET',
				manufacturer: 'Lupin Pharmaceuticals, Inc.'
			},
			{
				ndc: '68180-0513-02',
				brandName: 'Lisinopril',
				genericName: 'lisinopril',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '10 mg/1',
				packageSize: 90,
				packageUnit: 'TABLET',
				manufacturer: 'Lupin Pharmaceuticals, Inc.'
			},
			{
				ndc: '68180-0513-03',
				brandName: 'Lisinopril',
				genericName: 'lisinopril',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '10 mg/1',
				packageSize: 100,
				packageUnit: 'TABLET',
				manufacturer: 'Lupin Pharmaceuticals, Inc.'
			}
		]
	},

	// Metformin 500mg
	'860975': {
		drugName: 'metformin 500 MG',
		rxcui: '860975',
		packages: [
			{
				ndc: '00093-7214-01',
				brandName: 'Metformin Hydrochloride',
				genericName: 'metformin hydrochloride',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '500 mg/1',
				packageSize: 100,
				packageUnit: 'TABLET',
				manufacturer: 'Teva Pharmaceuticals USA, Inc.'
			},
			{
				ndc: '00093-7214-05',
				brandName: 'Metformin Hydrochloride',
				genericName: 'metformin hydrochloride',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '500 mg/1',
				packageSize: 500,
				packageUnit: 'TABLET',
				manufacturer: 'Teva Pharmaceuticals USA, Inc.'
			},
			{
				ndc: '00093-7214-10',
				brandName: 'Metformin Hydrochloride',
				genericName: 'metformin hydrochloride',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '500 mg/1',
				packageSize: 1000,
				packageUnit: 'TABLET',
				manufacturer: 'Teva Pharmaceuticals USA, Inc.'
			}
		]
	},

	// Amoxicillin 500mg
	'308191': {
		drugName: 'amoxicillin 500 MG',
		rxcui: '308191',
		packages: [
			{
				ndc: '00781-2148-01',
				brandName: 'Amoxicillin',
				genericName: 'amoxicillin',
				dosageForm: 'CAPSULE',
				route: 'ORAL',
				strength: '500 mg/1',
				packageSize: 20,
				packageUnit: 'CAPSULE',
				manufacturer: 'Sandoz Inc.'
			},
			{
				ndc: '00781-2148-05',
				brandName: 'Amoxicillin',
				genericName: 'amoxicillin',
				dosageForm: 'CAPSULE',
				route: 'ORAL',
				strength: '500 mg/1',
				packageSize: 30,
				packageUnit: 'CAPSULE',
				manufacturer: 'Sandoz Inc.'
			},
			{
				ndc: '00781-2148-10',
				brandName: 'Amoxicillin',
				genericName: 'amoxicillin',
				dosageForm: 'CAPSULE',
				route: 'ORAL',
				strength: '500 mg/1',
				packageSize: 100,
				packageUnit: 'CAPSULE',
				manufacturer: 'Sandoz Inc.'
			}
		]
	},

	// Atorvastatin 20mg
	'617318': {
		drugName: 'atorvastatin 20 MG',
		rxcui: '617318',
		packages: [
			{
				ndc: '00071-0155-23',
				brandName: 'Lipitor',
				genericName: 'atorvastatin calcium',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '20 mg/1',
				packageSize: 90,
				packageUnit: 'TABLET',
				manufacturer: 'Pfizer Laboratories Div Pfizer Inc.'
			},
			{
				ndc: '00071-0155-40',
				brandName: 'Lipitor',
				genericName: 'atorvastatin calcium',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '20 mg/1',
				packageSize: 30,
				packageUnit: 'TABLET',
				manufacturer: 'Pfizer Laboratories Div Pfizer Inc.'
			}
		]
	},

	// Omeprazole 20mg
	'312046': {
		drugName: 'omeprazole 20 MG',
		rxcui: '312046',
		packages: [
			{
				ndc: '69315-0116-30',
				brandName: 'Omeprazole',
				genericName: 'omeprazole',
				dosageForm: 'CAPSULE, DELAYED RELEASE',
				route: 'ORAL',
				strength: '20 mg/1',
				packageSize: 30,
				packageUnit: 'CAPSULE',
				manufacturer: 'Aidarex Pharmaceuticals LLC'
			},
			{
				ndc: '69315-0116-90',
				brandName: 'Omeprazole',
				genericName: 'omeprazole',
				dosageForm: 'CAPSULE, DELAYED RELEASE',
				route: 'ORAL',
				strength: '20 mg/1',
				packageSize: 90,
				packageUnit: 'CAPSULE',
				manufacturer: 'Aidarex Pharmaceuticals LLC'
			}
		]
	},

	// Gabapentin 300mg
	'835829': {
		drugName: 'gabapentin 300 MG',
		rxcui: '835829',
		packages: [
			{
				ndc: '00406-0513-01',
				brandName: 'Neurontin',
				genericName: 'gabapentin',
				dosageForm: 'CAPSULE',
				route: 'ORAL',
				strength: '300 mg/1',
				packageSize: 100,
				packageUnit: 'CAPSULE',
				manufacturer: 'Pfizer Laboratories Div Pfizer Inc.'
			},
			{
				ndc: '00406-0513-05',
				brandName: 'Neurontin',
				genericName: 'gabapentin',
				dosageForm: 'CAPSULE',
				route: 'ORAL',
				strength: '300 mg/1',
				packageSize: 500,
				packageUnit: 'CAPSULE',
				manufacturer: 'Pfizer Laboratories Div Pfizer Inc.'
			}
		]
	},

	// Sertraline 50mg
	'312940': {
		drugName: 'sertraline 50 MG',
		rxcui: '312940',
		packages: [
			{
				ndc: '68180-0514-01',
				brandName: 'Sertraline',
				genericName: 'sertraline hydrochloride',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '50 mg/1',
				packageSize: 30,
				packageUnit: 'TABLET',
				manufacturer: 'Lupin Pharmaceuticals, Inc.'
			},
			{
				ndc: '68180-0514-02',
				brandName: 'Sertraline',
				genericName: 'sertraline hydrochloride',
				dosageForm: 'TABLET',
				route: 'ORAL',
				strength: '50 mg/1',
				packageSize: 90,
				packageUnit: 'TABLET',
				manufacturer: 'Lupin Pharmaceuticals, Inc.'
			}
		]
	}
};

/**
 * Get mock NDC packages for a given RxCUI
 */
export function getMockNDCPackages(rxcui: string): NDCPackage[] | null {
	const mockData = MOCK_NDC_DATABASE[rxcui];
	return mockData ? mockData.packages : null;
}

/**
 * Check if mock data exists for a given RxCUI
 */
export function hasMockData(rxcui: string): boolean {
	return rxcui in MOCK_NDC_DATABASE;
}
