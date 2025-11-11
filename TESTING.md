# Testing Guide

## Quick Reference

### Always work from the project directory:
```bash
cd ndc-calculator
```

### Common Commands:
```bash
# Start dev server
npm run dev

# Run tests
npm run test:run

# Build for production
npm run build

# Run production build locally
npm start
```

## Testing the API Endpoint

### 1. Start the dev server:
```bash
cd ndc-calculator
npm run dev
```

### 2. Test with curl (corrected - note the letter O, not zero):
```bash
curl -X POST http://localhost:5173/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"drugNameOrNDC":"Lisinopril 10mg","sig":"Take 1 tablet daily","daysSupply":30}'
```

### Common Mistakes:
- ❌ `drugName0rNDC` (with zero) → Validation error
- ✅ `drugNameOrNDC` (with letter O) → Works

### Expected Response Format:
```json
{
  "success": true,
  "data": {
    "success": true/false,
    "input": { ... },
    "normalizedDrug": { ... },
    "parsedSIG": { ... },
    "calculation": { ... },
    "selectedNDCs": [ ... ],
    "warnings": [ ... ],
    "timestamp": "..."
  }
}
```

## Testing in Browser

1. Start dev server: `npm run dev`
2. Visit: http://localhost:5173
3. Fill in the form and click "Calculate"

## Understanding API Responses

### Success with Warnings:
- `success: true` at top level
- `data.success: false` if no NDCs found (but still returns data)
- Check `warnings` array for messages like "No NDC codes found"

### Validation Errors:
- `success: false` at top level
- `error.code: "VALIDATION_ERROR"`
- `error.details: [...]` contains field-specific errors

### Server Errors:
- `success: false` at top level
- `error.code: "INTERNAL_SERVER_ERROR"` or `"NOT_FOUND"`

## Troubleshooting

### "No NDC codes found" warning:
- This is expected when testing with real APIs
- Some drugs may not have NDCs in RxNorm
- The calculation still completes with available data

### Tests failing:
- Make sure you're in `ndc-calculator` directory
- Run: `cd ndc-calculator && npm run test:run`

### Dev server not starting:
- Check if port 5173 is already in use
- Try: `PORT=3001 npm run dev`

