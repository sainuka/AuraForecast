# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Women's Health Tracker application.

## Functions

### generate-forecast

AI-powered wellness forecast generator that securely calls OpenAI with user health metrics.

**Endpoint:** `/functions/v1/generate-forecast`

**Method:** POST

**Authentication:** Required (Supabase Auth Bearer token)

**Request Body:**
```json
{
  "userId": "user-uuid",
  "metrics": [
    {
      "date": "2025-01-01",
      "hrvScore": 65,
      "sleepScore": 80,
      "glucoseLevel": 95,
      "steps": 8500,
      "restingHeartRate": 62
    }
  ],
  "cyclePhase": "follicular"
}
```

**Response:**
```json
{
  "forecast": "AI-generated wellness forecast text..."
}
```

## Deployment

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref <your-project-ref>
```

### Set Secrets

The edge function requires the following secrets:

```bash
supabase secrets set OPENAI_API_KEY=<your-openai-api-key>
supabase secrets set SUPABASE_URL=<your-supabase-url>
supabase secrets set SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Deploy Functions

Deploy all functions:
```bash
supabase functions deploy
```

Deploy specific function:
```bash
supabase functions deploy generate-forecast
```

### Local Development

Run functions locally:
```bash
supabase functions serve
```

Run specific function:
```bash
supabase functions serve generate-forecast --env-file .env.local
```

Create `.env.local` in the project root with:
```
OPENAI_API_KEY=your-key-here
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

## Enable Edge Functions in Application

Once deployed, enable edge functions by setting the environment variable:

```
USE_EDGE_FUNCTIONS=true
```

This will make the backend use Supabase Edge Functions for AI forecasting instead of direct OpenAI calls.

## Security

- **Authentication**: Edge functions validate user authentication via Supabase Auth using the anon key with user's bearer token
  - The Supabase client is initialized with the anon key but inherits the user's auth context from the Authorization header
  - This approach ensures Row Level Security (RLS) policies are enforced
  - Using service role key would bypass RLS and is not recommended for user-facing functions
- **Authorization**: Each function verifies that the userId in the request matches the authenticated user
- **API Keys**: OpenAI API key is stored securely in Supabase secrets, never exposed to the client
- **Validation**: Request payloads are validated for required fields and proper structure
- All requests require valid Supabase authentication tokens
