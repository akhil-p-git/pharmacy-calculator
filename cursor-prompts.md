# Cursor AI Prompts for NDC Calculator Development

Quick copy-paste prompts to accelerate development in Cursor IDE.

---

## 🚀 Getting Started

### Initialize Development Environment
```
Set up the dev environment:
1. Copy .env.example to .env
2. Add OpenAI API key
3. Start dev server with npm run dev
4. Open test runner with npm run test:ui
```

---

## 🧪 Testing Prompts

### Create Tests for Existing Code
```
Review [filename] and create comprehensive unit tests in [filename].test.ts.
Include:
- Happy path scenarios
- Error cases
- Edge cases (empty inputs, invalid data, API failures)
- Mock any external dependencies
- Aim for 100% code coverage
Use Vitest and follow the testing patterns in rxnorm.test.ts
```

### Run Tests for Specific Feature
```
Run tests for [feature name] and fix any failing tests. Show me the test output and explain any failures.
```

### Add Integration Tests
```
Create integration tests for the complete calculation flow:
1. Input: drug name "Lisinopril 10mg", SIG "Take 1 tablet daily", days: 30
2. Mock all API calls (RxNorm, FDA, OpenAI)
3. Verify correct NDC selection and quantity calculation
4. Test in tests/integration/calculation.test.ts
```

---

## 📦 API Client Development

### Complete FDA NDC Client
```
Finish implementing the FDA NDC API client with tests:
1. Review src/lib/api/fda-ndc.ts
2. Create comprehensive tests in fda-ndc.test.ts
3. Test getNDCPackageInfo, getMultipleNDCPackages, searchNDCsByDrugName
4. Mock FDA API responses with realistic data
5. Test NDC normalization edge cases
6. Test active/inactive status detection
Run tests and show results
```

### Build OpenAI SIG Parser
```
Create OpenAI API client for parsing prescription SIG instructions in src/lib/api/openai.ts:

Features needed:
- parseSIG(sig: string): Promise<ParsedSIG>
- Extract: dose, doseUnit, frequency, route, instructions
- Handle medical abbreviations (BID=2x/day, TID=3x/day, QID=4x/day, etc.)
- Flag ambiguous instructions
- Return structured ParsedSIG type
- Include token usage tracking

Then create tests in openai.test.ts with mocked OpenAI responses.
Use the openai npm package.
```

### Add Caching to API Client
```
Add caching with TTL to [api-client.ts]:
- Use in-memory cache with configurable TTL
- Cache based on normalized input (lowercase, trimmed)
- Include cache.clear() for testing
- Follow the pattern from rxnorm.ts
```

---

## 🎯 Core Business Logic

### Build Quantity Calculator
```
Implement the quantity calculator in src/lib/core/quantity-calculator.ts:

Input: ParsedSIG, daysSupply
Output: QuantityCalculation

Logic:
- Calculate daily dose = sig.dose × sig.frequency
- Calculate total = dailyDose × daysSupply
- Handle special cases (PRN = as needed, complex tapers)
- Respect unit types

Include comprehensive tests for:
- Simple daily regimen
- Multiple times per day
- PRN medications
- Complex tapers
- Invalid inputs
```

### Build Package Matcher
```
Create package matching algorithm in src/lib/core/package-matcher.ts:

Input: NDCPackage[], QuantityCalculation
Output: Ranked list of NDC matches

Algorithm:
1. Filter active NDCs only
2. Match units (tablet, ml, etc.)
3. Calculate overfill percentage for each
4. Rank by minimal overfill
5. Support multi-pack combinations
6. Flag inactive NDCs as warnings

Write tests with various package sizes and quantity needs.
```

### Build NDC Selector
```
Implement optimal NDC selection in src/lib/core/ndc-selector.ts:

Features:
- Select single best NDC or combination
- Minimize overfill (<10% ideal)
- Prefer single package over multi-pack
- Calculate exact dispense quantity
- Return top 3 alternatives

Test cases:
- Exact match available
- Slight overfill needed
- Multi-pack required
- No perfect match (underfill warning)
```

### Build Normalization Orchestrator
```
Create drug normalization orchestrator in src/lib/core/normalizer.ts:

Function: normalize(input: string): Promise<RxCUIResult>

Logic:
1. Detect if input is NDC (format: XX-XXXX-XX or 10-11 digits)
2. If NDC: call ndcToRxCUI()
3. If drug name: call drugNameToRxCUI()
4. Handle errors gracefully
5. Return normalized RxCUI

Add tests for:
- NDC input (various formats)
- Drug name input
- Invalid inputs
- API failures
```

---

## 🌐 API Endpoints

### Create Main Calculation Endpoint
```
Build the main API endpoint in src/routes/api/calculate/+server.ts:

POST /api/calculate
Body: { drugNameOrNDC, sig, daysSupply }

Flow:
1. Validate input with Zod schema
2. Normalize drug → RxCUI
3. Parse SIG with OpenAI
4. Get NDCs from RxNorm
5. Get package info from FDA
6. Calculate quantity needed
7. Select optimal NDCs
8. Return CalculationResult JSON

Include error handling at each step.
Then create integration tests in tests/integration/api-calculate.test.ts
```

### Add Request Validation
```
Create Zod validation schemas in src/lib/api/validation.ts:

Schemas needed:
- CalculationInputSchema (drugNameOrNDC, sig, daysSupply)
- Validate: sig is non-empty, daysSupply > 0 and <= 365
- Include helpful error messages

Use in API routes to validate requests.
```

### Add Error Handling Middleware
```
Create error handling utility in src/lib/utils/error-handler.ts:

Convert APIError to proper HTTP responses:
- 400 for validation errors
- 404 for not found
- 500 for server errors
- Include user-friendly messages
- Log details server-side
```

---

## 🎨 Frontend Development

### Create Input Form Component
```
Build the input form in src/routes/+page.svelte:

Fields:
- Drug name or NDC (text input with placeholder)
- SIG / Instructions (textarea)
- Days' Supply (number input, 1-365)
- Submit button

Features:
- Form validation
- Loading state during API call
- Error display
- Clear/reset button
- Responsive design

Use SvelteKit form actions for submission.
```

### Create Results Display Component
```
Create results component in src/lib/components/ResultsDisplay.svelte:

Display:
- Normalized drug name and RxCUI
- Parsed SIG in readable format
- Total quantity calculated
- Selected NDC(s) with details (package size, manufacturer)
- Warnings (inactive NDCs, overfill %, etc.)
- Alternative options (collapsible)

Styling:
- Warning badges for issues
- Success indicators
- Clean, pharmacy-friendly UI
- Copy button for NDC
```

### Add Loading and Error States
```
Create reusable UI components:
1. src/lib/components/LoadingSpinner.svelte
2. src/lib/components/ErrorAlert.svelte
3. src/lib/components/WarningBadge.svelte

Use Svelte's built-in transitions for smooth UX.
```

---

## 🔧 Utilities & Helpers

### Create Unit Converter
```
Build unit conversion utility in src/lib/utils/unit-converter.ts:

Conversions:
- Tablets/capsules (discrete units)
- Liquids: ml, L, oz
- Solids: mg, g, kg
- Special: puffs, patches, applicators

Function: convertUnits(value, fromUnit, toUnit)
Include comprehensive tests.
```

### Create SIG Parser Helpers
```
Create SIG parsing helpers in src/lib/utils/sig-helpers.ts:

Functions:
- parseFrequency(text: string): number // "BID" → 2
- parseRoute(text: string): string // extract oral, topical, etc.
- isSIGAmbiguous(text: string): boolean
- Common medical abbreviations dictionary

Add tests for all abbreviation patterns.
```

### Create NDC Formatter
```
Create NDC formatting utility in src/lib/utils/ndc-formatter.ts:

Functions:
- formatNDC(ndc: string): string // Format as 5-4-2
- validateNDCFormat(ndc: string): boolean
- normalizeNDC(ndc: string): string // Remove formatting

Handle all NDC format variations (10 vs 11 digit).
```

---

## 📊 Testing Scenarios

### Test Complete Flow - Simple Case
```
Create end-to-end test for simple prescription:

Scenario: Lisinopril 10mg tablets
- Input: "Lisinopril 10mg", "Take 1 tablet daily", 30 days
- Mock RxNorm to return RxCUI
- Mock OpenAI to parse SIG correctly
- Mock FDA to return 30-count and 90-count bottles
- Verify: Selects 30-count bottle, quantity = 30
- Verify: No warnings

File: tests/integration/simple-prescription.test.ts
```

### Test Complete Flow - Complex Case
```
Create test for complex prescription:

Scenario: Prednisone taper
- Input: "Prednisone 10mg", "4 tabs x 3d, 3 tabs x 3d, 2 tabs x 3d, 1 tab x 3d", 12 days
- Expected total: 30 tablets
- Test SIG parsing handles taper
- Test quantity calculation
- Test NDC selection

File: tests/integration/complex-prescription.test.ts
```

### Test Error Scenarios
```
Create tests for error handling:

1. Invalid drug name → returns error with helpful message
2. NDC not found → returns error
3. OpenAI API failure → fallback or error
4. FDA API failure → graceful degradation
5. No active NDCs available → warning
6. Ambiguous SIG → flag for review

File: tests/integration/error-scenarios.test.ts
```

---

## 🚢 Deployment

### Configure GCP Deployment
```
Set up deployment configuration:

1. Install @sveltejs/adapter-auto or adapter-cloudflare
2. Update svelte.config.js with adapter
3. Create build script
4. Add .gcloudignore file
5. Create app.yaml for App Engine or cloudbuild.yaml for Cloud Run
6. Document deployment steps in README

Show me the configuration files needed.
```

### Add Health Check Endpoint
```
Create health check endpoint in src/routes/api/health/+server.ts:

GET /api/health
Returns:
- status: "healthy"
- version: from package.json
- uptime: process.uptime()
- timestamp: current time

For GCP load balancer health checks.
```

---

## 📝 Documentation

### Generate API Documentation
```
Create API documentation in docs/api.md:

Document:
- POST /api/calculate endpoint
- Request/response formats
- Error codes
- Example requests
- Rate limits
- Authentication (if added)

Use markdown with code examples.
```

### Add JSDoc Comments
```
Add comprehensive JSDoc comments to all functions in [filename]:

Include:
- Function description
- @param for each parameter with type and description
- @returns with type and description
- @throws for possible errors
- @example with code example

Follow TypeScript JSDoc conventions.
```

---

## 🎯 Quick Fixes

### Fix TypeScript Errors
```
Review TypeScript errors in the project and fix them:
1. Run `npm run check`
2. Fix all type errors
3. Ensure strict mode compliance
4. Add proper return types
Show me the errors and your fixes.
```

### Fix Test Failures
```
Run all tests with `npm run test:run` and fix any failures.
Show me:
1. Which tests are failing
2. Why they're failing
3. Your fixes
4. Updated test results
```

### Improve Test Coverage
```
Check test coverage with `npm run test:coverage`.
Identify files with <80% coverage and add tests to reach 80%+.
Focus on edge cases and error paths.
```

---

## 🔍 Code Review

### Review for Best Practices
```
Review [filename] for:
- TypeScript best practices
- Error handling completeness
- Code organization
- Performance issues
- Security concerns
- Missing tests

Suggest improvements with code examples.
```

### Check Security
```
Security audit:
1. Check for exposed API keys
2. Verify input validation
3. Check for injection vulnerabilities
4. Verify CORS configuration
5. Check error messages don't expose internals

Show findings and fixes.
```

---

## 💡 Tips for Using These Prompts

1. **Always run tests after changes:** Use `npm run test:run` or `npm test`
2. **Check types:** Run `npm run check` frequently
3. **Use test:ui for debugging:** `npm run test:ui` gives visual test runner
4. **Mock external APIs:** Never hit real APIs in tests
5. **Follow existing patterns:** Look at rxnorm.ts and rxnorm.test.ts as examples
6. **Commit often:** Small, working increments

---

## 🎯 Next Steps Checklist

After using these prompts, verify:

- [ ] All tests pass (`npm run test:run`)
- [ ] TypeScript compiles (`npm run check`)
- [ ] Code is formatted (`npm run format`)
- [ ] Coverage is >80% (`npm run test:coverage`)
- [ ] Dev server runs (`npm run dev`)
- [ ] No console errors
- [ ] Documentation updated

---

**Ready to build!** Start with "Complete FDA NDC Client" then move through core logic → API endpoints → frontend.
