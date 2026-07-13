# Deployment Guide

This guide covers deploying Sakeenah to production environments.

## Option 1: Cloudflare Workers (Recommended)

Deploy full-stack application to Cloudflare's edge network.

### Steps

1. **Authenticate with Cloudflare:**

   ```bash
   wrangler login
   ```

2. **Create Hyperdrive connection:**

   ```bash
   wrangler hyperdrive create sakeenah-db \
     --connection-string="postgresql://user:pass@host:5432/sakeenah"
   ```

3. **Update `wrangler.jsonc`** with your Hyperdrive ID and custom domain

4. **Deploy:**

   ```bash
   bun run deploy
   ```

### Benefits

- Global edge distribution (100+ locations)
- Sub-50ms response times
- Automatic SSL certificates
- 100,000 requests/day (free tier)

## Option 2: Separate Hosting

Deploy frontend and backend to different providers.

### Frontend Options

- Vercel
- Netlify
- Cloudflare Pages

Deploy the `dist/` folder after running `bun run build`.

### Backend Options

- VPS with Bun runtime
- Railway
- Fly.io
- Render

### Database Options

- Supabase
- Neon
- Railway PostgreSQL

### Environment Variables

```env
VITE_API_URL=https://api.yourdomain.com
DATABASE_URL=postgresql://user:pass@production-host:5432/sakeenah
```

## Hostinger Application + Supabase

This project can run frontend and backend together in one Node application.
The build generates the Vite frontend and the Hono server entry in `dist/`.

### Build settings

```bash
npm install
npm run build
npm run start
```

Use `dist` as the static output directory only when the platform asks for a
frontend output folder. The Node start command must still be `npm run start`
so the `/api` routes stay online.

### Supabase setup

1. Open Supabase SQL Editor.
2. Run `docs/supabase-migration.sql`.
3. In Hostinger, set `DATABASE_URL` to the Supabase Postgres connection string
   with `sslmode=require`.

The Supabase anon key is only needed for future direct client-side Supabase
features. The current app uses the backend API, so confirmations, comments and
gifts all go through `/api` and are persisted in Postgres.

### Build Commands

```bash
bun run build    # Frontend production build
bun run server   # Backend production server
```

## Scripts Reference

```bash
# Development
bun run dev              # Run client + server concurrently
bun run dev:client       # Frontend only (Vite)
bun run dev:server       # Backend only (Hono API)

# Production
bun run build            # Build frontend to dist/
bun run preview          # Preview production build
bun run server           # Run backend server

# Cloudflare Workers
bun run deploy           # Build + deploy to Workers
bun run cf:dev           # Test with Workers runtime
bun run cf:tail          # View live deployment logs

# Utilities
bun run generate-links   # Generate personalized guest links
bun run lint             # ESLint code validation
```
