# NutriPlanIT

> **AI-powered meal planning app for families** — Expo + Turso + Supabase

## Features

- 🍽️ **Personalized Meal Plans**: Weekly plans tailored to each family member's caloric needs
- 👨‍👩‍👧‍👦 **Family Profiles**: Track TDEE, goals (cut/maintain/bulk), and macros for everyone
- 👨‍🍳 **Smart Portion Scaler (Cooking Mode)**: Calculate exact raw ingredients and cooked portions per person
- 📊 **Weight Tracking**: Monitor progress with visual charts
- 🛒 **Shopping Lists**: Auto-generated from meal plans
- 🔄 **Offline-First**: Local SQLite with cloud sync

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Expo SDK 54+, React 19, NativeWind 4.x |
| State | Zustand + TanStack Query |
| Forms | react-hook-form + Zod |
| DB | Turso (libSQL) + Drizzle ORM |
| Auth | Supabase Auth |
| API | Hono on Cloudflare Workers |
| Images | Cloudinary CDN |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start
pnpm exec expo start --tunnel -c

# Run on iOS/Android
pnpm ios
pnpm android
```

## Project Structure

```
├── app/                 # Expo Router pages
├── src/
│   ├── components/      # Reusable UI components
│   ├── db/              # Drizzle schema + client
│   ├── hooks/           # React Query hooks
│   ├── services/        # Business logic
│   ├── stores/          # Zustand stores
│   └── utils/           # Helper functions
├── api/                 # Cloudflare Worker (Hono)
├── recipe-manager/      # Python CLI for recipe management
└── docs/                # Documentation
```

## API Endpoints

- `GET /recipes` — List all recipes with ingredients and steps
- `GET /recipes/:id` — Single recipe details

## Development

```bash
# Type check
pnpm exec tsc --noEmit

# Lint
pnpm exec biome check ./

# Deploy API
cd api && npx wrangler deploy
```

## Documentation

- [Product Requirements](docs/PRD.md)
- [Data Models](docs/data-models.md)
- [Screen Flows](docs/screen-flow.md)
- [Task Tracker](docs/task.md)
