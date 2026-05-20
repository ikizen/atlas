# Atlas

A fast, minimal personal launcher for the folders, client spreadsheets and
links you open every day. Built to replace Toby with your own clean design.

**Live:** <https://atlas-six-ashen.vercel.app>

- **Stack:** Next.js (App Router) · TypeScript · Tailwind v4 · shadcn/ui ·
  Zustand · dnd-kit
- **Phase 1 (this build):** no login, no backend — everything is stored in your
  browser's `localStorage`. Your only backup is Export/Import.
- **Phase 2 (not built yet):** Google login + Drive auto-sync via Supabase. The
  data layer is already behind a `DataProvider` interface so Phase 2 is a
  provider swap, not a rewrite.

## Features

- Folders with a name and an accent color; create, rename, recolor, reorder
  (drag), delete.
- Links with auto-fetched favicons; add, edit, reorder (drag), delete. Manual
  URLs are normalized (`vercel.com` → `https://vercel.com`).
- Click opens in a new tab (`_blank`, `noopener`). "Open all" opens a whole
  folder; if the browser blocks pop-ups you get a one-time hint.
- Global search: `⌘K` / `Ctrl+K` or `/`. Fuzzy-matches titles, URLs and folder
  names. `Enter` opens the top result.
- Pinned and Recent (last 10) strips at the top.
- Export / Import your whole dataset as JSON (lossless round-trip).
- Light / dark mode (dark default), no flash on load.

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3210
```

```bash
pnpm build        # production build
pnpm lint         # eslint
```

## Deploy to Vercel

The app deploys with zero configuration. You need to be logged into the Vercel
CLI once (this opens a browser — only you can do this):

```bash
npx vercel login
```

Then, from this directory:

```bash
npx vercel --prod
```

Copy the production URL it prints (e.g. `https://atlas-xxxx.vercel.app`) — you
need it for the Chrome extension below.

> Alternatively, push this folder to a GitHub repo and import it at
> vercel.com/new; Vercel auto-detects Next.js.

## Chrome new-tab extension

See [`extension/README.md`](extension/README.md). In short: paste your Vercel
URL into `extension/config.js`, then load the `extension/` folder unpacked at
`chrome://extensions`.

## Data & backups

All data lives under the `atlas:v1` key in `localStorage`. Use the gear menu →
**Export data** regularly — in Phase 1 that JSON file is your only backup.
Restore with **Import data**.

## Project structure

```
app/                 Next.js App Router (layout, page, theme no-flash script)
components/           UI: header, folder card, link row, dialogs, search…
components/ui/        shadcn primitives
lib/types.ts          Typed schema (versioned)
lib/data/provider.ts  DataProvider interface  ← Phase 2 swap point
lib/data/localStorageProvider.ts
lib/store.ts          Zustand store; persists via the provider only
hooks/                useOpen, useMounted
extension/            Minimal MV3 new-tab override (no app logic)
```
