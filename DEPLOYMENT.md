# Google Cloud Platform Deployment Guide

This guide covers deploying the NDC Calculator to Google Cloud Platform using either App Engine or Cloud Run.

## Prerequisites

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Authenticate: `gcloud auth login`
3. Set your project: `gcloud config set project YOUR_PROJECT_ID`
4. Enable required APIs:
   ```bash
   gcloud services enable appengine.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

## Option 1: App Engine Deployment

### Step 1: Update app.yaml

Edit `app.yaml` and replace `your-openai-api-key-here` with your actual OpenAI API key:

```yaml
env_variables:
  OPENAI_API_KEY: "sk-proj-your-actual-key-here"
```

### Step 2: Build the Application

```bash
npm run build
```

### Step 3: Deploy to App Engine

```bash
gcloud app deploy
```

When prompted:
- Choose a region (e.g., `us-central`)
- Confirm deployment

### Step 4: Access Your Application

After deployment, your app will be available at:
```
https://YOUR_PROJECT_ID.appspot.com
```

### Step 5: Update Environment Variables (Alternative)

Instead of hardcoding the API key in `app.yaml`, you can use Secret Manager:

1. Create a secret:
   ```bash
   echo -n "your-openai-api-key" | gcloud secrets create openai-api-key --data-file=-
   ```

2. Grant access:
   ```bash
   gcloud secrets add-iam-policy-binding openai-api-key \
     --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. Update `app.yaml`:
   ```yaml
   env_variables:
     OPENAI_API_KEY: "projects/YOUR_PROJECT_ID/secrets/openai-api-key/versions/latest"
   ```

## Option 2: Cloud Run Deployment (Containerized)

### Step 1: Build and Push Container

```bash
# Set your project ID
export PROJECT_ID=your-project-id
export SERVICE_NAME=ndc-calculator
export REGION=us-central1

# Build the container
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Or use Docker directly
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME .
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME
```

### Step 2: Deploy to Cloud Run

```bash
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="OPENAI_API_KEY=your-openai-api-key-here,RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST,FDA_NDC_API_BASE_URL=https://api.fda.gov/drug/ndc.json,NODE_ENV=production" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### Step 3: Access Your Application

After deployment, Cloud Run will provide a URL:
```
https://SERVICE_NAME-xxxxx-uc.a.run.app
```

### Step 4: Using Secret Manager (Recommended for Production)

1. Create secrets:
   ```bash
   echo -n "your-openai-api-key" | gcloud secrets create openai-api-key --data-file=-
   ```

2. Deploy with secrets:
   ```bash
   gcloud run deploy $SERVICE_NAME \
     --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
     --platform managed \
     --region $REGION \
     --allow-unauthenticated \
     --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
     --set-env-vars="RXNORM_API_BASE_URL=https://rxnav.nlm.nih.gov/REST,FDA_NDC_API_BASE_URL=https://api.fda.gov/drug/ndc.json,NODE_ENV=production" \
     --memory 512Mi \
     --cpu 1
   ```

## Environment Variables

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `RXNORM_API_BASE_URL`: RxNorm API base URL (default: https://rxnav.nlm.nih.gov/REST)
- `FDA_NDC_API_BASE_URL`: FDA NDC API base URL (default: https://api.fda.gov/drug/ndc.json)
- `NODE_ENV`: Set to `production` for production deployments

## Monitoring and Logs

### View Logs (App Engine)
```bash
gcloud app logs tail -s default
```

### View Logs (Cloud Run)
```bash
gcloud run services logs read $SERVICE_NAME --region $REGION
```

### View in Console
- App Engine: https://console.cloud.google.com/appengine
- Cloud Run: https://console.cloud.google.com/run

## Troubleshooting

### Build Failures
- Ensure all dependencies are in `package.json`
- Check that `npm run build` works locally
- Review build logs: `gcloud app logs tail -s default`

### Runtime Errors
- Check environment variables are set correctly
- Verify API keys are valid
- Review application logs for errors

### Performance Issues
- Increase instance class in `app.yaml` (App Engine)
- Increase memory/CPU allocation (Cloud Run)
- Enable auto-scaling

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to App Engine
        run: gcloud app deploy --quiet
```

## Security Best Practices

1. **Never commit API keys** - Use Secret Manager or environment variables
2. **Enable HTTPS only** - Both App Engine and Cloud Run enforce HTTPS
3. **Set up IAM roles** - Limit access to deployment credentials
4. **Monitor usage** - Set up billing alerts
5. **Use least privilege** - Grant minimal permissions to service accounts

## Cost Optimization

- **App Engine**: Use automatic scaling with min_instances: 0 for development
- **Cloud Run**: Set min-instances: 0 to scale to zero when not in use
- **Monitor usage**: Set up billing alerts in GCP Console

## Next Steps

1. Set up custom domain (optional)
2. Configure Cloud CDN for static assets
3. Set up monitoring and alerting
4. Configure backup and disaster recovery
5. Set up CI/CD pipeline

