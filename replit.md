# Wellness Tracker - Women's Health Application

## Overview
A personalized women's health tracking application that integrates with Ultrahuman devices to provide AI-powered wellness forecasts. The app securely stores health metrics in Supabase and uses OpenAI to generate personalized health insights and recommendations.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL) via Drizzle ORM
- **AI**: OpenAI GPT-5 for wellness forecasting
- **Health Data**: Ultrahuman Partner API (OAuth 2.0)

## Features
1. **User Authentication**: Secure signup/login with bcrypt password hashing
2. **Ultrahuman OAuth Integration**: Connect to Ultrahuman devices for health data
3. **Health Metrics Tracking**: Sleep, HRV, recovery, glucose, temperature, steps
4. **AI Wellness Forecasts**: Personalized predictions based on recent health trends
5. **Data Visualization**: Interactive charts showing health metric trends
6. **Dark/Light Mode**: Theme toggle with persistent user preference

## Environment Variables
Required secrets in Replit Secrets:
- `DATABASE_URL`: Supabase PostgreSQL connection string (Transaction pooler)
- `OPENAI_API_KEY`: OpenAI API key for AI forecasting
- `ULTRAHUMAN_CLIENT_ID`: Ultrahuman Partner API client ID
- `ULTRAHUMAN_CLIENT_SECRET`: Ultrahuman Partner API client secret

## Database Schema
- **users**: User accounts with email/password authentication
- **ultrahuman_tokens**: OAuth tokens for Ultrahuman API access
- **health_metrics**: Daily health metrics from Ultrahuman devices
- **wellness_forecasts**: AI-generated wellness predictions and recommendations

## API Routes
### Authentication
- `POST /api/auth/signup`: Create new user account
- `POST /api/auth/login`: User login

### Ultrahuman Integration
- `POST /api/ultrahuman/callback`: OAuth callback handler
- `POST /api/ultrahuman/sync`: Sync health data from Ultrahuman

### Health Data
- `GET /api/metrics/:userId`: Get user's health metrics
- `GET /api/forecast/:userId`: Get latest wellness forecast
- `POST /api/forecast/generate`: Generate new AI forecast

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

## Recent Changes
- Initial implementation with full MVP features
- Database schema created and pushed to Supabase
- OpenAI GPT-5 integration for wellness forecasting
- Ultrahuman OAuth 2.0 flow implemented
- Responsive dashboard with health visualizations
