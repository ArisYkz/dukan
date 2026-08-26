# Duken

SaaS platform for Kazakhstani entrepreneurs to create mobile-friendly online storefronts. Supports Kaspi QR payments, Telegram notifications, Instagram/TikTok integration, and full trilingual UI (Kazakh, Russian, English).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, shadcn/ui |
| State | TanStack React Query 5 |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Payments | Kaspi QR |
| Notifications | Telegram Bot |
| Deploy | Vercel + Docker / GHCR |

## Prerequisites

- Node.js 18+
- Bun (for local dev) or npm
- Supabase account (for auth, DB, storage)
- Vercel account (for deployment)

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Test
npm test
```

Create a `.env.local` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start Vite dev server (port 8080) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm test` | Run vitest unit tests |
| `npm run build:analyze` | Build with bundle analyzer |

## Project Structure

```
src/
  pages/       Route-level page components
  components/  Shared UI (dashboard/, landing/, ui/)
  hooks/       Custom hooks + React Query wrappers
  services/    Supabase data access layer
  lib/         Utilities (formatting, image optimization, validation)
  constants/   Business logic, i18n translations, labels
  contexts/    React contexts (Language)
  test/        Unit tests
supabase/
  functions/   12 Deno edge functions
  migrations/  43 PostgreSQL migrations
```

## Languages

- English, Russian, Kazakh — configurable via language toggle
- Language preference persisted in localStorage

## License

MIT
