// Core domain types for the NDC Calculator

export interface CalculationInput {
	drugNameOrNDC: string;
	sig: string;
	daysSupply: number;
}

export interface RxCUIResult {
	rxcui: string;
	name: string;
	synonym?: string;
}

export interface NDCPackage {
	ndc: string;
	packageDescription: string;
	packageSize: number;
	packageUnit: string;
	productName: string;
	manufacturer: string;
	active: boolean;
	startMarketingDate?: string;
	endMarketingDate?: string;
}

export interface ParsedSIG {
	dose: number;
	doseUnit: string;
	frequency: number; // times per day
	route: string;
	instructions: string;
	isAmbiguous: boolean;
	clarificationNeeded?: string;
}

export interface QuantityCalculation {
	totalQuantityNeeded: number;
	unit: string;
	daysSupply: number;
	dailyDose: number;
}

export interface NDCSelection {
	ndc: string;
	packageSize: number;
	packageUnit: string;
	quantityToDispense: number;
	numberOfPackages: number;
	overfillPercentage: number;
	productName: string;
	manufacturer: string;
}

export interface CalculationResult {
	success: boolean;
	input: CalculationInput;
	normalizedDrug?: RxCUIResult;
	parsedSIG?: ParsedSIG;
	calculation?: QuantityCalculation;
	selectedNDCs: NDCSelection[];
	alternativeNDCs?: NDCSelection[];
	warnings: string[];
	errors?: string[];
	timestamp: string;
}

export interface APIError {
	message: string;
	code?: string;
	details?: unknown;
}

// RxNorm API Types
export interface RxNormApproximateMatchResult {
	approximateGroup: {
		candidate: Array<{
			rxcui: string;
			name: string;
			score: string;
		}>;
	};
}

export interface RxNormRxCUIStatusResult {
	rxcuiStatus: {
		status: string;
		minConcept?: {
			rxcui: string;
			name: string;
		};
	};
}

// FDA NDC API Types
export interface FDANDCResult {
	results: Array<{
		product_ndc: string;
		generic_name: string;
		brand_name: string;
		dosage_form: string;
		route: string[];
		marketing_start_date: string;
		marketing_end_date?: string;
		labeler_name: string;
		active_ingredients: Array<{
			name: string;
			strength: string;
		}>;
		packaging: Array<{
			package_ndc: string;
			description: string;
			marketing_start_date: string;
			sample?: boolean;
		}>;
	}>;
	meta: {
		results: {
			skip: number;
			limit: number;
			total: number;
		};
	};
}

export type DosageForm =
	| 'tablet'
	| 'capsule'
	| 'solution'
	| 'suspension'
	| 'injection'
	| 'inhaler'
	| 'cream'
	| 'ointment'
	| 'other';

export type UnitType =
	| 'tablet'
	| 'capsule'
	| 'ml'
	| 'mg'
	| 'g'
	| 'mcg'
	| 'unit'
	| 'puff'
	| 'patch'
	| 'applicator';
