# Quick Start Deployment Guide

## Prerequisites
1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project YOUR_PROJECT_ID`

## App Engine Deployment (Recommended)

### 1. Update API Key
Edit `app.yaml` and replace `your-openai-api-key-here` with your actual OpenAI API key.

### 2. Deploy
```bash
npm run deploy:appengine
```

Or manually:
```bash
npm run build
gcloud app deploy
```

### 3. Access
Your app will be available at: `https://YOUR_PROJECT_ID.appspot.com`

## Cloud Run Deployment (Alternative)

### 1. Build and Deploy
```bash
# Set variables
export PROJECT_ID=your-project-id
export SERVICE_NAME=ndc-calculator
export REGION=us-central1

# Build container
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="OPENAI_API_KEY=your-key-here,RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST,FDA_NDC_API_BASE_URL=https://api.fda.gov/drug/ndc.json,NODE_ENV=production" \
  --memory 512Mi
```

## Environment Variables

Required:
- `OPENAI_API_KEY`: Your OpenAI API key

Optional (defaults provided):
- `RXNORM_API_BASE_URL`: https://rxnav.nlm.nih.gov/REST
- `FDA_NDC_API_BASE_URL`: https://api.fda.gov/drug/ndc.json

## Security Note

⚠️ **Never commit API keys to git!** Use Secret Manager for production:

```bash
# Create secret
echo -n "your-api-key" | gcloud secrets create openai-api-key --data-file=-

# Update app.yaml to reference secret (see DEPLOYMENT.md for details)
```

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
