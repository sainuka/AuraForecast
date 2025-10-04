# Wellness Tracker - Women's Health Application

A personalized women's health tracking application that integrates with Ultrahuman devices to provide AI-powered wellness forecasts. Track sleep, HRV, recovery, glucose, temperature, steps, menstrual cycles, and set health goals with intelligent insights powered by OpenAI.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

## Features

### Core Health Tracking
- **Health Metrics Tracking**: Sleep score, sleep duration, HRV (Heart Rate Variability), resting heart rate, recovery score, glucose levels, body temperature, steps, and VO2 Max
- **Ultrahuman Integration**: Direct access token integration to sync health data from Ultrahuman devices (last 7 days)
- **Data Visualization**: Interactive charts showing health metric trends over time with 7-day, 30-day, and 90-day views

### Menstrual Cycle Tracking
- Track period start/end dates, cycle length, flow intensity (light/medium/heavy)
- Log symptoms (cramps, bloating, mood changes, headaches, fatigue, breast tenderness, acne)
- Add personal notes for each cycle
- Automatic cycle phase calculation (Menstrual, Follicular, Ovulation, Luteal)
- Visual phase indicators on dashboard

### AI-Powered Wellness Forecasts
- Personalized wellness predictions using OpenAI GPT-4
- Cycle-aware insights that consider menstrual cycle phase
- Actionable recommendations based on your health data
- Supports both Supabase Edge Functions and direct OpenAI API integration

### Historical Data Analysis
- **Trend Detection**: AI-powered analysis comparing recent vs historical data
- **Anomaly Detection**: Statistical z-score analysis identifies unusual patterns (>2σ from mean)
- **Correlation Heatmap**: Visualize relationships between different health metrics
- **30-Day Time-Series Charts**: Track individual metric trends over time

### Health Goal Setting
- Create personalized health goals with three types:
  - **Improve**: Increase a metric to reach target value
  - **Reduce**: Decrease a metric below target value
  - **Maintain**: Keep a metric stable within tolerance range
- Visual progress tracking with progress bars
- Optional deadline management with days remaining/overdue indicators
- Baseline preservation for accurate progress tracking
- Smart completion logic based on goal type

### User Experience
- Dark/Light mode theme toggle with persistent preference
- Supabase Auth for secure authentication (email/password)
- Responsive design optimized for mobile and desktop
- Data export to CSV for health metrics and cycle tracking

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **Shadcn UI** for component library
- **Recharts** for data visualization
- **TanStack Query (React Query)** for data fetching and caching
- **Wouter** for lightweight routing
- **React Hook Form** with Zod validation

### Backend
- **Express.js** on Node.js
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **PostgreSQL** (Supabase-hosted via Neon pooler)

### Authentication & Database
- **Supabase Auth** for user authentication
- **Supabase PostgreSQL** for database (via Neon pooler at port 6543)
- UUID-based primary keys for Supabase Auth compatibility

### AI & Integrations
- **OpenAI GPT-4** for AI wellness forecasting
- **Ultrahuman Partner API** for health data sync (direct access token)
- **Supabase Edge Functions** (optional) for secure AI forecasting

## Prerequisites

Before setting up the application, you need:

1. **Node.js 18+** and npm installed
2. **Supabase Account**: 
   - Create a project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key from Project Settings → API
3. **OpenAI API Key**:
   - Sign up at [platform.openai.com](https://platform.openai.com)
   - Create an API key from the API Keys section
4. **Ultrahuman Partner API Access**:
   - Contact Ultrahuman to get Partner API access
   - Obtain your direct access token (or client ID/secret for OAuth)
5. **PostgreSQL Database**:
   - Supabase provides this automatically
   - Connection string format: `postgresql://[user]:[password]@[host]:6543/[database]?sslmode=require`

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd wellness-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory or set environment secrets in Replit:

```env
# Database
DATABASE_URL=postgresql://user:password@host:6543/database?sslmode=require

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Optional

# OpenAI
OPENAI_API_KEY=sk-...

# Ultrahuman API
ULTRAHUMAN_ACCESS_TOKEN=your-direct-access-token
ULTRAHUMAN_CLIENT_ID=your-client-id  # For OAuth (optional)
ULTRAHUMAN_CLIENT_SECRET=your-client-secret  # For OAuth (optional)

# Session Management
SESSION_SECRET=your-random-secret-key

# Optional Features
USE_EDGE_FUNCTIONS=false  # Set to 'true' to use Supabase Edge Functions for AI
```

See [Environment Variables](#environment-variables) section for detailed explanations.

### 4. Set Up Supabase

#### A. Configure Authentication

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Email provider
3. **For development**: Toggle off "Confirm email" to allow instant login
4. **For production**: Set up custom SMTP for email confirmations

#### B. Create Database Schema

The database schema is managed via Drizzle ORM. Run the following to push the schema:

```bash
npm run db:push
```

This creates the following tables:
- `users` - User accounts (UUID primary keys)
- `ultrahuman_tokens` - OAuth tokens for Ultrahuman API
- `health_metrics` - Daily health metrics
- `cycle_tracking` - Menstrual cycle data
- `health_goals` - Personal health targets
- `wellness_forecasts` - AI-generated predictions

### 5. (Optional) Set Up Supabase Edge Functions

If you want to use Supabase Edge Functions for AI forecasting:

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref your-project-ref
```

3. Deploy the edge function:
```bash
cd supabase/functions
supabase functions deploy generate-forecast --no-verify-jwt
```

4. Set the `OPENAI_API_KEY` secret for the edge function:
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

5. Set `USE_EDGE_FUNCTIONS=true` in your environment variables

### 6. Run the Application

Start the development server:

```bash
npm run dev
```

This starts both the Express backend and Vite frontend on the same port (default: 5000).

The application will be available at:
- **Development**: `http://localhost:5000`
- **Replit**: Your Replit URL

### 7. Create Your First Account

1. Navigate to the application URL
2. Click "Sign Up" and create an account with email/password
3. You'll be automatically logged in (if email confirmation is disabled)
4. The app will sync your user to the local database

### 8. Connect Ultrahuman Data

Since we're using a direct access token approach:

1. Make sure `ULTRAHUMAN_ACCESS_TOKEN` is set in your environment
2. Click "Sync Data" on the dashboard
3. The app will fetch the last 7 days of health data from Ultrahuman

Note: If you prefer OAuth flow, you can use `ULTRAHUMAN_CLIENT_ID` and `ULTRAHUMAN_CLIENT_SECRET` instead.

## Environment Variables

### Required Variables

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string | Supabase Dashboard → Project Settings → Database → Connection string (use Session mode pooler at port 6543) |
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → Project Settings → API → Project API keys → anon/public |
| `OPENAI_API_KEY` | OpenAI API key for AI forecasting | OpenAI Platform → API Keys |
| `ULTRAHUMAN_ACCESS_TOKEN` | Direct access token for Ultrahuman API | Contact Ultrahuman Partner API team |
| `SESSION_SECRET` | Random secret for Express sessions | Generate with: `openssl rand -base64 32` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for admin operations | Not required (app uses anon key) |
| `ULTRAHUMAN_CLIENT_ID` | Client ID for OAuth flow | Not required if using direct token |
| `ULTRAHUMAN_CLIENT_SECRET` | Client secret for OAuth flow | Not required if using direct token |
| `USE_EDGE_FUNCTIONS` | Use Supabase Edge Functions for AI | `false` (uses direct OpenAI API) |

### Security Notes

- Never commit `.env` file to version control
- Use different secrets for development and production
- Rotate API keys periodically
- Keep `SESSION_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` private

## Database Schema

### Users Table
```typescript
{
  id: string (UUID, primary key)
  email: string (unique)
  name: string (nullable)
  createdAt: Date
}
```

### Health Metrics Table
```typescript
{
  id: string (UUID, primary key)
  userId: string (foreign key → users.id)
  date: Date
  sleepScore: number (nullable)
  sleepDuration: number (nullable, in minutes)
  hrv: number (nullable, in milliseconds)
  restingHeartRate: number (nullable, in BPM)
  recoveryScore: number (nullable)
  steps: number (nullable)
  avgGlucose: number (nullable, in mg/dL)
  glucoseVariability: number (nullable)
  temperature: number (nullable, in Celsius)
  vo2Max: number (nullable)
  rawData: JSON (nullable, stores original API response)
  createdAt: Date
}
```

### Cycle Tracking Table
```typescript
{
  id: string (UUID, primary key)
  userId: string (foreign key → users.id)
  periodStartDate: Date
  periodEndDate: Date (nullable)
  cycleLength: number (nullable, in days)
  flowIntensity: string (nullable: 'light' | 'medium' | 'heavy')
  symptoms: string[] (nullable)
  notes: string (nullable)
  createdAt: Date
  updatedAt: Date
}
```

### Health Goals Table
```typescript
{
  id: string (UUID, primary key)
  userId: string (foreign key → users.id)
  metricType: string ('sleepScore' | 'hrv' | 'recoveryScore' | 'steps' | etc.)
  goalType: string ('improve' | 'reduce' | 'maintain')
  targetValue: number
  currentValue: number (nullable)
  baselineValue: number (nullable)
  deadline: Date (nullable)
  description: string (nullable)
  status: string ('active' | 'completed')
  createdAt: Date
  updatedAt: Date
}
```

### Wellness Forecasts Table
```typescript
{
  id: string (UUID, primary key)
  userId: string (foreign key → users.id)
  forecast: string (AI-generated text)
  insights: JSON (nullable)
  recommendations: JSON (nullable)
  generatedAt: Date
}
```

## API Documentation

### Authentication

All user-specific endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <supabase-access-token>
```

### Endpoints

#### Configuration
- `GET /api/config/supabase` - Get Supabase configuration for client initialization

#### User Management
- `POST /api/users/sync` - Sync Supabase Auth user to local database
  - Body: `{ id: string, email: string, name?: string }`

#### Health Metrics
- `GET /api/metrics/:userId` - Get user's health metrics (last 30 days)
- `POST /api/ultrahuman/sync-direct` - Sync health data from Ultrahuman (last 7 days)
  - Body: `{ userId: string, email?: string }`

#### Wellness Forecasts
- `GET /api/forecast/:userId` - Get latest wellness forecast
- `POST /api/forecast/generate` - Generate new AI forecast
  - Body: `{ userId: string, cyclePhase?: string }`

#### Cycle Tracking
- `GET /api/cycles/:userId` - Get user's cycle tracking history
- `GET /api/cycles/:userId/latest` - Get latest cycle entry
- `POST /api/cycles` - Create new cycle entry
  - Body: `{ userId, periodStartDate, periodEndDate?, cycleLength?, flowIntensity?, symptoms?, notes? }`
- `PATCH /api/cycles/:id` - Update existing cycle entry
  - Body: `{ periodEndDate?, cycleLength?, flowIntensity?, symptoms?, notes? }`

#### Health Goals
- `GET /api/goals/:userId` - Get user's health goals
  - Query params: `?status=active` (optional)
- `GET /api/goals/detail/:id` - Get specific goal details
- `POST /api/goals` - Create new health goal
  - Body: `{ userId, metricType, goalType, targetValue, currentValue?, deadline?, description? }`
- `PATCH /api/goals/:id` - Update existing goal
  - Body: `{ currentValue?, deadline?, description?, status? }`
- `DELETE /api/goals/:id` - Delete health goal

#### Data Export
- `GET /api/export/metrics/:userId` - Export health metrics as CSV
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/export/cycles/:userId` - Export cycle tracking as CSV
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

### Security Features

- All user-specific routes protected with `authenticateUser()` middleware
- Bearer token verification using Supabase Auth
- User ID matching enforced (403 for mismatches)
- PATCH payload validation with Zod schemas
- SQL injection prevention via Drizzle ORM

## Project Structure

```
wellness-tracker/
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # Shadcn UI components
│   │   │   ├── dashboard/       # Dashboard-specific components
│   │   │   ├── cycle/           # Cycle tracking components
│   │   │   └── goals/           # Health goals components
│   │   ├── contexts/            # React contexts (Auth, Theme)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utility functions
│   │   ├── pages/               # Page components
│   │   └── App.tsx              # Main app component with routing
│   └── index.html               # HTML entry point
├── server/                      # Backend Express application
│   ├── db/                      # Database connection
│   ├── lib/                     # Server utilities
│   │   ├── openai.ts            # OpenAI integration
│   │   └── ultrahuman.ts        # Ultrahuman API integration
│   ├── routes.ts                # API route handlers
│   ├── storage.ts               # Database storage layer
│   └── index.ts                 # Express server entry point
├── shared/                      # Shared code between client and server
│   └── schema.ts                # Database schema (Drizzle)
├── supabase/                    # Supabase Edge Functions
│   └── functions/
│       └── generate-forecast/   # AI forecasting edge function
├── drizzle.config.ts            # Drizzle ORM configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind CSS configuration
└── vite.config.ts               # Vite configuration
```

## Development Workflow

### Running the Development Server

```bash
npm run dev
```

This starts:
- Express backend on port 5000
- Vite dev server with HMR (Hot Module Replacement)
- Both served on the same port via Vite middleware

### Database Migrations

When you modify the schema in `shared/schema.ts`:

```bash
# Push schema changes to database
npm run db:push

# Force push (if needed)
npm run db:push --force
```

Never manually write SQL migrations - always use Drizzle's push command.

### Code Structure Best Practices

1. **Keep routes thin**: Business logic goes in `storage.ts`, not `routes.ts`
2. **Use TypeScript types**: Import types from `shared/schema.ts`
3. **Validate inputs**: Use Zod schemas for request validation
4. **Error handling**: Always wrap async operations in try-catch
5. **Security first**: Use `authenticateUser()` middleware on protected routes

### Adding New Features

1. **Update Schema**: Modify `shared/schema.ts` if database changes needed
2. **Push Schema**: Run `npm run db:push` to sync database
3. **Update Storage**: Add methods to `IStorage` interface and `DbStorage` class
4. **Add API Route**: Create endpoint in `server/routes.ts`
5. **Build Frontend**: Create components in `client/src/components`
6. **Add Page**: Create page component in `client/src/pages` and register in `App.tsx`

## Troubleshooting

### Common Issues

#### Database Connection Errors

**Error**: `ECONNREFUSED` or `Connection timeout`

**Solution**:
- Verify `DATABASE_URL` includes `:6543` port (Supabase pooler)
- Ensure connection string has `?sslmode=require` suffix
- Check Supabase project is not paused (free tier auto-pauses after inactivity)

#### Authentication Errors

**Error**: `401 Unauthorized` or `Invalid token`

**Solution**:
- Ensure `SUPABASE_ANON_KEY` matches your project
- Check Bearer token is included in Authorization header
- Verify user is logged in (check localStorage for Supabase session)

#### Ultrahuman Sync Fails

**Error**: `Failed to sync health data` or `403 Forbidden`

**Solution**:
- Verify `ULTRAHUMAN_ACCESS_TOKEN` is valid and not expired
- Contact Ultrahuman to ensure your token has required permissions
- Check Ultrahuman API status

#### AI Forecast Generation Fails

**Error**: `OpenAI API error` or `429 Too Many Requests`

**Solution**:
- Verify `OPENAI_API_KEY` is valid
- Check OpenAI account has available credits
- If using Edge Functions, ensure function has `OPENAI_API_KEY` secret set

#### Email Confirmation Required

**Error**: Can't log in after signup

**Solution**:
- Go to Supabase Dashboard → Authentication → Providers → Email
- Toggle off "Confirm email" for development
- For production, set up custom SMTP

### Debugging

#### Enable Verbose Logging

Backend logs are automatically printed to console. Check workflow logs in Replit or terminal output.

Frontend logs are in browser console (F12 → Console tab).

#### Check Database Data

Use Supabase Dashboard → Table Editor to inspect database records directly.

Or use the SQL editor:
```sql
SELECT * FROM health_metrics WHERE user_id = 'your-user-id' ORDER BY date DESC LIMIT 10;
```

#### Test API Endpoints

Use curl or Postman to test endpoints:

```bash
# Get metrics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/metrics/YOUR_USER_ID

# Sync Ultrahuman data
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID"}' \
  http://localhost:5000/api/ultrahuman/sync-direct
```

### Performance Issues

#### Slow Dashboard Loading

- Check if too many metrics are being fetched (default is 30 days)
- Ensure database indexes exist on `user_id` and `date` columns
- Clear browser cache and localStorage

#### Chart Rendering Slow

- Reduce time range (use 7D instead of 90D)
- Check browser console for errors
- Ensure data is properly formatted for Recharts

## Contributing

This is a personal project, but contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for educational and personal use. See LICENSE file for details.

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review [Supabase Docs](https://supabase.com/docs)
- Check [OpenAI API Docs](https://platform.openai.com/docs)
- Contact Ultrahuman Partner API support

---

Built with ❤️ for women's health and wellness.
