# My Moments

A minimalist app to share, prepare, and track life’s moments.

<!-- ![Screenshot](docs/screenshot.png) -->

## 🛠️ Tech Stack
- Vite + React + TypeScript
- Tailwind CSS
- React Router, Zustand, Framer Motion
- Supabase (Auth, DB, Realtime)
- Deployed on Vercel

## 🚀 Quick Start
```bash
pnpm install
pnpm run dev --filter ./apps/web-old
# Open http://localhost:5173
```

## ⚙️ Environment Variables
Set these in your shell or Vercel project:
```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 📦 Build & Preview
```bash
pnpm run build:web-old
cd apps/web-old
pnpm run preview
# Open http://localhost:4173
```

## 🧩 Project Structure (Monorepo)
```
/ (root)
├─ apps/
│  └─ web-old/        # My Moments web app (v2)
├─ packages/
│  └─ shared/         # Shared store, supabase client, utils
└─ README.md
```

## 🔔 Features (v2)
- Realtime notifications and shared moments
- Clean top bar with avatar and notifications
- “Preparations” tab and task filtering
- Mobile responsive and accessible UI
- Loading skeletons and friendly empty states
- Route-level lazy loading and optimized build

## 🚢 Deploy (Vercel)
- Root directory: `apps/web-old`
- Build command: `pnpm run build`
- Output directory: `dist`
- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## 📝 Changelog
See `CHANGELOG.md` for the v2.0 release notes.

