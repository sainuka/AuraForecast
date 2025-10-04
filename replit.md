# Wellness Tracker - Women's Health Application

## Overview
A personalized women's health tracking application that integrates with Ultrahuman devices to provide AI-powered wellness forecasts. The app uses Supabase for authentication and database, with AI forecasting via Supabase Edge Functions calling OpenAI.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: Express.js, Node.js
- **Database**: Neon PostgreSQL (transitioning to full Supabase)
- **Authentication**: Supabase Auth (replacing custom bcrypt auth)
- **AI**: OpenAI GPT-4 via Supabase Edge Functions
- **Health Data**: Ultrahuman Partner API (OAuth 2.0)

## Features
1. **User Authentication**: Supabase Auth with email/password (migrated from bcrypt)
2. **Ultrahuman OAuth Integration**: Connect to Ultrahuman devices for health data
3. **Health Metrics Tracking**: Sleep, HRV, recovery, glucose, temperature, steps
4. **AI Wellness Forecasts**: Personalized predictions via Supabase Edge Functions
5. **Data Visualization**: Interactive charts showing health metric trends
6. **Dark/Light Mode**: Theme toggle with persistent user preference

## Environment Variables
Required secrets in Replit Secrets:
- `DATABASE_URL`: Neon PostgreSQL connection string (will migrate to Supabase)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key for client auth
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for server-side token validation (required)
- `OPENAI_API_KEY`: OpenAI API key (used in edge functions)
- `ULTRAHUMAN_CLIENT_ID`: Ultrahuman Partner API client ID
- `ULTRAHUMAN_CLIENT_SECRET`: Ultrahuman Partner API client secret
- `USE_EDGE_FUNCTIONS`: Set to 'true' to use Supabase Edge Functions for AI (optional)

## Database Schema
- **users**: User accounts (UUID primary keys for Supabase Auth compatibility)
- **ultrahuman_tokens**: OAuth tokens for Ultrahuman API access
- **health_metrics**: Daily health metrics from Ultrahuman devices
- **wellness_forecasts**: AI-generated wellness predictions and recommendations

## API Routes
### Configuration
- `GET /api/config/supabase`: Get Supabase config for client initialization

### Authentication
- `POST /api/users/sync`: Sync Supabase Auth user to local database
- Authentication handled by Supabase Auth (client-side)

### Ultrahuman Integration
- `POST /api/ultrahuman/callback`: OAuth callback handler
- `POST /api/ultrahuman/sync`: Sync health data from Ultrahuman

### Health Data
- `GET /api/metrics/:userId`: Get user's health metrics
- `GET /api/forecast/:userId`: Get latest wellness forecast
- `POST /api/forecast/generate`: Generate AI forecast (uses Edge Function if enabled)

## User Flow
1. Sign up or log in to the application
2. Connect Ultrahuman device via OAuth flow
3. Sync health data from the past 7 days
4. View personalized AI wellness forecast on dashboard
5. Explore health metrics and trends over time

## Development
The workflow "Start application" runs `npm run dev` which starts both Express backend and Vite frontend on the same port.

## Design System
- **Primary Color**: Purple (wellness, trust)
- **Fonts**: Inter (body), DM Sans (headings)
- **Spacing**: Consistent 4px grid system
- **Components**: Shadcn UI with custom health-focused design

## Recent Changes (Oct 2025)

### Supabase Migration
- **Database**: Migrated schema to use UUID primary keys for Supabase Auth compatibility
- **Authentication**: Replaced custom bcrypt auth with Supabase Auth
  - Client-side auth using @supabase/supabase-js
  - Dynamic Supabase client initialization via /api/config/supabase endpoint
  - User sync endpoint to maintain local user records
- **Edge Functions**: Created Supabase Edge Function for AI forecasting
  - Function: `generate-forecast` calls OpenAI securely
  - Backend supports both edge function and direct OpenAI (controlled by USE_EDGE_FUNCTIONS env var)
  - Deployment instructions in supabase/functions/README.md

### Architecture
- SSL certificate handling for Neon database connection
- Async Supabase client initialization in frontend
- Backward-compatible AI forecasting (edge function + fallback)

### Previous Changes
- Initial implementation with full MVP features
- OpenAI GPT-4 integration for wellness forecasting
- Ultrahuman OAuth 2.0 flow implemented
- Responsive dashboard with health visualizations
