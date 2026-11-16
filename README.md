# Ebop

AI project studio. Plan it. Build it. Run it. From spark to running.

Brief: `docs/ebop-build-brief-launch.md`. Design tokens: `design/ebop-design-tokens.json`
(compiled to `src/app/tokens.css` by `npm run tokens`, which runs before `dev` and `build`).

## Run locally

1. `cp .env.example .env.local` and fill in the Supabase publishable key.
2. Apply `supabase/migrations/*.sql` to the Supabase project, in order
   (Supabase dashboard → SQL Editor, or `supabase db push`).
3. `npm install && npm run dev` → http://localhost:3000

## Stack

Next.js 16 (App Router, Cache Components) · Supabase (Postgres, Auth, RLS) · Claude API · Vercel.
