# Our Date Planner ❤️

A mobile-first shared couple date planner built with Next.js, TypeScript, Tailwind CSS, Supabase Magic Login, invite links, favorites, a spinning picker wheel, counters, stats, and realtime list syncing.

## Features

- Magic Link login with Supabase Auth
- One-time partner invite links
- Two-user couple limit for now, flexible schema for future groups
- Shared date idea lists
- Favorites
- Random animated picker wheel
- Pick counters
- Stats page
- Mobile bottom navigation
- Last-tab memory
- Realtime syncing between partners

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with your Supabase project URL and anon key.

## Supabase Setup

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Run `supabase/schema.sql`.
4. Go to Authentication > URL Configuration.
5. Add your local and production URLs:
   - `http://localhost:3000`
   - your Vercel URL after deployment

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial Our Date Planner app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/our-date-planner.git
git push -u origin main
```

## Deploy to Vercel

1. Import the GitHub repo into Vercel.
2. Add environment variables from `.env.local`.
3. Deploy.

## Notes

This repo is configured as a single-couple app for now, but the database model can support future public/multi-user expansion.
