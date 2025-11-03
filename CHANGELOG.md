# My Moments v2.0 — Stable Release

## ✨ New Features
- Realtime notifications and shared moments via Supabase Realtime
- Top-bar notifications dropdown with unread badge and “Mark all as read”
- Cleaner, smaller top navigation with avatar menu and mobile-friendly dropdown
- Dedicated “Preparations” view and quick access from top bar
- Past moments handling (memories) with reflection support
- Mobile-responsive layouts across dashboard, details, auth, and modals
- Loading skeletons and graceful empty states for Moments and Preparations

## 🧹 Fixes & Optimizations
- Default sort for moments by event date (soonest first)
- Removed broken profile image upload; initials avatar or no avatar UI
- Eliminated duplicate notification bells and overlapping badges
- Stabilized auth: session persistence and instant logout redirect (no flashing)
- Performance: route-level lazy loading, CSS code split, esbuild minification
- Reduced unnecessary re-renders; consistent card sizing and spacing
- Build-ready for Vercel/Netlify, environment config verified

## 🧠 Developer Notes
- Monorepo; web app is in `apps/web-old`
- Environment variables (required at build and runtime):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Quick Start
```bash
pnpm install
pnpm run dev --filter ./apps/web-old
# open http://localhost:5173
```

### Build & Preview
```bash
pnpm run build:web-old
cd apps/web-old
pnpm run preview
# open http://localhost:4173
```

### Deploy (Vercel)
- Root: `apps/web-old`
- Build command: `pnpm run build`
- Output: `dist`
- Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---
Release branch: `release/v2.0`  •  Tag: `v2.0`

