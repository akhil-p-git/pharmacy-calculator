# NDC Packaging & Quantity Calculator

## AI-powered prescription fulfillment assistant for pharmacies

## Overview

The NDC Packaging & Quantity Calculator is an intelligent web application designed to help pharmacists quickly and accurately calculate prescription quantities and select optimal NDC (National Drug Code) packages. The system automates the complex process of interpreting prescription instructions (SIG), normalizing drug names, and matching them with available packaging options from pharmaceutical databases.

By leveraging AI-powered natural language processing and real-time API integrations with RxNorm and FDA databases, the calculator reduces manual lookup time and minimizes calculation errors in pharmacy workflows.

## Features

- **Drug normalization using RxNorm API** - Automatically converts drug names or NDC codes to standardized RxCUI identifiers
- **AI-powered SIG parsing with OpenAI** - Intelligently interprets prescription instructions (e.g., "Take 1 tablet by mouth twice daily") using GPT-4o-mini
- **Automatic quantity calculation** - Calculates total quantity needed based on dose, frequency, and days supply
- **Optimal NDC package selection** - Selects the best package combinations to minimize waste while meeting prescription requirements
- **Overfill/underfill detection** - Warns when selected packages result in significant overfill or underfill
- **Inactive NDC warnings** - Alerts pharmacists when selected NDCs are no longer actively marketed

## Tech Stack

- **TypeScript** - Type-safe development
- **SvelteKit** - Modern full-stack framework
- **OpenAI API (GPT-4o-mini)** - Natural language processing for SIG parsing
- **RxNorm API** - Drug name normalization and NDC lookup
- **FDA NDC Directory API** - Package information and availability
- **Vitest** - Testing framework with 100+ tests

## Architecture

The application follows a modular architecture with clear separation of concerns:

1. **API Layer** (`src/lib/api/`)
   - `openai.ts` - Handles AI-powered SIG parsing
   - `rxnorm.ts` - Drug name normalization and RxCUI/NDC lookups
   - `fda-ndc.ts` - FDA package information retrieval

2. **Core Logic** (`src/lib/core/`)
   - `normalizer.ts` - Drug input validation and normalization
   - `quantity-calculator.ts` - Prescription quantity calculations
   - `ndc-selector.ts` - Optimal package selection algorithm
   - `calculator.ts` - Main orchestration function

3. **API Endpoint** (`src/routes/api/calculate/`)
   - RESTful POST endpoint for calculation requests
   - Request validation with Zod schemas
   - Error handling and response formatting

4. **Frontend** (`src/routes/`)
   - SvelteKit page components
   - Form handling and result display
   - Error and warning presentation

The system processes requests through a sequential pipeline:
1. Input validation
2. Drug normalization (name/NDC → RxCUI)
3. SIG parsing (natural language → structured data)
4. NDC retrieval (RxCUI → NDC codes)
5. Package lookup (NDC codes → package details)
6. Quantity calculation
7. Optimal package selection

## Known Limitations

### NDC Data Availability

Due to limitations in the public RxNorm and FDA APIs, not all drugs have associated NDC codes available. The free government databases (RxNorm, FDA NDC Directory) have incomplete coverage, particularly for:

- Generic medications
- Certain drug strengths/formulations
- Older or discontinued drugs

**Production Solution:** A commercial pharmaceutical database subscription (e.g., First Databank, Medi-Span, or Wolters Kluwer) would provide comprehensive NDC coverage (99%+ of active prescriptions).

**Current Behavior:** When NDCs are unavailable, the system correctly displays a warning: "No NDC codes found for this drug" - prompting pharmacists to look up the NDC manually through their pharmacy system.

## Setup Instructions

1. **Clone the repository**
   ```sh
   git clone <repository-url>
   cd ndc-calculator
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   > Note: The RxNorm and FDA APIs are public and do not require API keys.

4. **Run development server**
   ```sh
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

5. **Build for production**
   ```sh
   npm run build
   npm run preview
   ```

## Testing

The project includes comprehensive test coverage with Vitest:

- **Watch mode** (recommended for development):
  ```sh
  npm test
  ```

- **Single test run**:
  ```sh
  npm run test:run
  ```

- **Coverage report**:
  ```sh
  npm run test:coverage
  ```

- **Interactive UI**:
  ```sh
  npm run test:ui
  ```

Test files are located in:
- `src/lib/**/*.test.ts` - Unit tests
- `tests/integration/` - Integration tests

## API Documentation

### POST `/api/calculate`

Calculates prescription quantity and selects optimal NDC packages.

#### Request Body

```typescript
{
  drugNameOrNDC: string;  // Drug name or NDC code (2-200 characters)
  sig: string;            // Prescription instructions (5-500 characters)
  daysSupply: number;     // Days supply (1-365)
}
```

#### Example Request

```json
{
  "drugNameOrNDC": "lisinopril",
  "sig": "Take 1 tablet by mouth twice daily",
  "daysSupply": 30
}
```

#### Response

**Success (200):**
```typescript
{
  success: true;
  data: CalculationResult;
}
```

**Error (400/404/500):**
```typescript
{
  success: false;
  error: {
    message: string;
    code: string;
    details?: string[];
  };
}
```

#### CalculationResult Type

```typescript
interface CalculationResult {
  success: boolean;
  input: CalculationInput;
  normalizedDrug?: RxCUIResult;      // Normalized drug information
  parsedSIG?: ParsedSIG;              // Parsed prescription instructions
  calculation?: QuantityCalculation;  // Calculated quantities
  selectedNDCs: NDCSelection[];       // Recommended packages
  alternativeNDCs?: NDCSelection[];   // Alternative options
  warnings: string[];                 // Non-critical warnings
  errors?: string[];                  // Critical errors
  timestamp: string;                  // ISO timestamp
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "success": true,
    "input": {
      "drugNameOrNDC": "lisinopril",
      "sig": "Take 1 tablet by mouth twice daily",
      "daysSupply": 30
    },
    "normalizedDrug": {
      "rxcui": "2903",
      "name": "Lisinopril"
    },
    "parsedSIG": {
      "dose": 1,
      "doseUnit": "tablet",
      "frequency": 2,
      "route": "oral",
      "instructions": "Take 1 tablet by mouth twice daily",
      "isAmbiguous": false
    },
    "calculation": {
      "totalQuantityNeeded": 60,
      "unit": "tablet",
      "daysSupply": 30,
      "dailyDose": 2
    },
    "selectedNDCs": [
      {
        "ndc": "12345-678-90",
        "packageSize": 90,
        "packageUnit": "tablet",
        "quantityToDispense": 90,
        "numberOfPackages": 1,
        "overfillPercentage": 50,
        "productName": "Lisinopril 10mg",
        "manufacturer": "Generic Pharma Inc"
      }
    ],
    "warnings": [
      "Selected package provides 50% overfill (90 tablets vs 60 needed)"
    ],
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Codes

- `VALIDATION_ERROR` (400) - Request validation failed
- `INVALID_JSON` (400) - Malformed JSON in request body
- `NOT_FOUND` (404) - Drug not found in database
- `INTERNAL_SERVER_ERROR` (500) - Unexpected server error

## Success Metrics (from PRD)

- ✅ Medication normalization working
- ✅ AI SIG parsing functional
- ✅ Quantity calculation accurate
- ✅ NDC selection algorithm implemented
- ✅ 100+ tests passing

## Additional Resources

- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [TESTING.md](./TESTING.md) - Detailed testing documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions

## License

[Add your license information here]
