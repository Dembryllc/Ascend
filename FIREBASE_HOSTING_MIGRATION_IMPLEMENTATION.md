# Firebase Hosting Migration — Implementation Record

**Date:** 2026-05-28  
**Branch:** `claude/ascend-project-migration-Bw1rM`  
**Status:** Ready for preview verification. Production deploy pending your approval.

---

## What Was Done

### Summary

The Firebase Hosting configuration was brought in from the `main` branch (where it already existed from prior work), applied to this migration branch, and enhanced with HTTP caching headers. The critical `vite.config.ts` PDF worker fix was also brought in — the feature branch was forked before that fix was merged to `main`.

---

## Files Changed

### 1. `firebase.json` — **Created/Enhanced**

**Why:** This file did not exist on the migration branch. It was brought from `main` and enhanced with `Cache-Control` headers.

**What changed from the `main` version:**

| Addition | Rule | Value | Reason |
|---|---|---|---|
| Cache header | `/index.html` | `no-cache, no-store, must-revalidate` | The SPA entry point must never be cached. Users must always receive the latest `index.html` to pick up new JS/CSS asset filenames after a deploy. |
| Cache header | `/assets/**` | `public, max-age=31536000, immutable` | Vite content-hashes every JS and CSS chunk in `dist/assets/`. The filename changes on every build, so it is safe to cache for 1 year (`immutable` tells CDNs the content will never change for a given URL). |
| Cache header | `/pdf.worker.mjs` | `public, max-age=86400` | The PDF.js worker is deliberately placed at a stable, unhashed URL (`/pdf.worker.mjs`) so iOS Safari can load it reliably. It rarely changes. A 1-day cache is a safe middle ground between performance and freshness. |

**Existing headers preserved (unchanged):**
- `**/*.mjs → Content-Type: application/javascript` — required for iOS Safari; without it Safari rejects module scripts.
- `**/*.js → Content-Type: application/javascript` — defense-in-depth for MIME type enforcement.

**SPA rewrite preserved (unchanged):**
- `** → /index.html` — all routes fall back to the React app, equivalent to Netlify's `/* → /index.html 200`.

---

### 2. `.firebaserc` — **Created (no changes from main)**

**Why:** Not on the migration branch. Contains `{"projects":{"default":"ascend-annotate"}}` — tells the Firebase CLI which project to target. Required for `firebase deploy` and `firebase hosting:channel:deploy` to work without `--project` flag.

---

### 3. `.github/workflows/firebase-deploy.yml` — **Created (no changes from main)**

**Why:** Not on the migration branch. This is the CI/CD pipeline that builds and deploys to Firebase Hosting on every push to `main`.

Pipeline steps:
1. Checkout → Node 22 → `npm ci --legacy-peer-deps`
2. `npm run build` (with all `VITE_FIREBASE_*` env vars set inline)
3. Firebase CLI deploy via service account JSON (`FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE` secret)
4. Deploy scope: `--only hosting` (Firestore/Storage rules are not deployed by CI)

---

### 4. `vite.config.ts` — **Updated (fix from main)**

**Why:** The migration branch was forked before the PDF worker fix was merged. The pre-fix version had no `pdfWorkerPlugin`, meaning `pdf.worker.mjs` would not be copied to `dist/` at build time. Without it, the app throws:

```
PDF.js error: Setting up fake worker failed: "Importing a module script failed."
```

The fix:
- `pdfWorkerPlugin` added: a Vite `writeBundle` hook that copies `pdf.worker.mjs` from `node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.mjs` (or root if present) to `dist/pdf.worker.mjs`.
- Uses `existsSync` (ESM-compatible `import { existsSync } from 'fs'`), not `require('fs').accessSync` (CJS, which throws `ReferenceError` in Vite's ESM context and caused a silent build fallback on prior builds).

---

### 5. `firestore.rules`, `firestore.indexes.json`, `storage.rules` — **Created (no changes from main)**

**Why:** `firebase.json` references these files (`"rules": "firestore.rules"`, etc.). Without them, `firebase deploy` would fail with "file not found" errors even for a hosting-only deploy. They are backend rules, not hosting config — no changes were made to their content.

---

### 6. `CLAUDE.md` — **Created (no changes from main)**

**Why:** Project context document for AI-assisted development. Not present on the migration branch. No content changes.

---

## Netlify Translation — Behavior Map

| Netlify feature (`netlify.toml`) | Firebase equivalent (`firebase.json`) | Status |
|---|---|---|
| `command = "npm run build"` | GitHub Actions workflow `npm run build` | ✅ Equivalent |
| `publish = "dist"` | `"public": "dist"` | ✅ Equivalent |
| `/* → /index.html 200` (SPA redirect) | `{"source":"**","destination":"/index.html"}` rewrite | ✅ Equivalent |
| No custom headers in toml | Firebase headers with MIME + Cache-Control | ✅ Better — Netlify had no caching headers |
| No Netlify Functions | n/a | ✅ Not needed |
| No Netlify Forms | n/a | ✅ Not needed |
| No Netlify Edge functions | n/a | ✅ Not needed |

Firebase Hosting is a **strict superset** of what Netlify was providing for this app.

---

## Remaining Netlify Dependencies

| Item | Status | Action |
|---|---|---|
| `netlify.toml` | Still in repo | Safe to keep — has no effect when Netlify is not the host. Remove in Phase 9 cleanup (after 2+ weeks). |
| Netlify site (dashboard) | Still active | Do NOT delete yet — rollback target. Delete after DNS is confirmed stable for 2+ weeks. |
| Netlify deploy URL (`*.netlify.app`) | Still serving | Harmless. Already in Firebase Auth authorized domains list. |

There are **no code dependencies on Netlify** in the application. No Netlify-specific imports, functions, forms, or identity features are used.

---

## Local Build Verification — Results

```
✓ TypeScript: tsc -b passed (zero errors)
✓ Vite build: 2019 modules transformed in 3.26s
✓ dist/index.html              0.49 kB
✓ dist/assets/index-*.css     33.77 kB (gzip: 7.05 kB)
✓ dist/assets/purify.es-*.js  23.73 kB (gzip: 9.37 kB)
✓ dist/assets/index.es-*.js  151.38 kB (gzip: 48.88 kB)
✓ dist/assets/html2canvas-*.js 199.56 kB (gzip: 46.78 kB)
✓ dist/assets/index-*.js    1485.06 kB (gzip: 456.18 kB)
✓ dist/pdf.worker.mjs           1.9 MB  (stable unhashed URL — correct)
```

Note: The `index-*.js` chunk size warning (>500 kB) is a pre-existing Vite advisory, not an error. It does not affect functionality.

---

## Firebase Deploy Commands

### Preview channel deploy (use this first — does NOT touch production)

```bash
# Requires firebase-tools and authentication
npm install -g firebase-tools
firebase login                          # or use service account

# Deploy to a preview channel (isolated URL, not production)
firebase hosting:channel:deploy easy-annotate-migration --project ascend-annotate
```

This creates a time-limited preview URL at:
```
https://ascend-annotate--easy-annotate-migration-<hash>.web.app
```

Test this URL fully before approving the production deploy.

### Production deploy (do NOT run until you approve)

```bash
firebase deploy --only hosting --project ascend-annotate
```

Or push to `main` — the GitHub Actions workflow will deploy automatically.

### Check current hosting channels

```bash
firebase hosting:channel:list --project ascend-annotate
```

---

## Rollback Instructions

### Immediate rollback (DNS-level — fastest)

If something goes wrong after DNS cutover, point DNS back to Netlify:

1. Log into your DNS registrar.
2. Replace Firebase's A records with Netlify's IP addresses (find them in Netlify Dashboard → Domain management → DNS panel or use `dig` on the current production address before cutover).
3. Save. With TTL at 300s, propagation takes ~5 minutes.

### Firebase Hosting rollback (without DNS change)

Firebase Hosting keeps all previous deploys. You can roll back to any prior release:

```bash
# List releases
firebase hosting:releases:list --project ascend-annotate

# Roll back to a specific release ID
firebase hosting:rollback --project ascend-annotate
# (rolls back to the previous release automatically)
```

This is instant — no build required.

### Netlify rollback

Netlify also keeps all deploys. From the Netlify dashboard:
1. Go to Deploys.
2. Click any prior deploy → "Publish deploy".

---

## QA Checklist — Before Approving Production Deploy

Run these tests against the preview channel URL (`ascend-annotate--easy-annotate-migration-*.web.app`) before approving.

### Core functionality
- [ ] App loads at the preview URL (no blank screen, no console errors on load)
- [ ] Sign in with an existing account works
- [ ] Sign up with a new account works
- [ ] Sign out works and redirects to login
- [ ] `/` (student home) loads after login
- [ ] `/teacher` (teacher home) loads for a teacher account
- [ ] A book opens in the PDF reader (confirms Firebase Storage CORS is fine)
- [ ] PDF renders pages correctly
- [ ] Next/previous page navigation works
- [ ] Text selection triggers the floating emoji bar
- [ ] Tapping an emoji opens the annotation panel
- [ ] Saving an annotation persists to Firestore (appears in sidebar)
- [ ] Editing an existing annotation works
- [ ] Deleting an annotation works
- [ ] "Read aloud" button reads the page; "Stop" button stops it
- [ ] Reading progress saves (page counter updates in StudentHome after reading)

### PDF.js worker (critical — was the root cause of prior failures)
- [ ] Open DevTools → Network → filter for `pdf.worker.mjs`
- [ ] Confirm: HTTP 200 (not 404, not the HTML fallback)
- [ ] Confirm: `Content-Type: application/javascript` (not `text/html`)
- [ ] Confirm: `Cache-Control: public, max-age=86400`
- [ ] Test on **iOS Safari** — this is the browser that previously rejected the worker with MIME errors

### Caching headers
- [ ] `/index.html`: `Cache-Control: no-cache, no-store, must-revalidate`
- [ ] Any `/assets/*.js` file: `Cache-Control: public, max-age=31536000, immutable`
- [ ] `/pdf.worker.mjs`: `Cache-Control: public, max-age=86400`

### Routing (SPA fallback)
- [ ] Navigate to `/` → loads app
- [ ] Navigate directly to `/reading/<some-book-id>` → loads app (not 404)
- [ ] Navigate directly to `/teacher/books` → loads app (not 404)
- [ ] Reload the page on any deep route → does NOT 404

### Auth domain (before DNS cutover only)
- [ ] `easy-annotate.com` is in Firebase Console → Authentication → Settings → Authorized domains
- [ ] `www.easy-annotate.com` is also listed (if www is in use)

---

## What Remains Before Going Live

The two steps that cannot be done from code — they require the Firebase Console and your DNS registrar:

1. **Add `easy-annotate.com` to Firebase Auth authorized domains**
   - Firebase Console → Authentication → Settings → Authorized domains → Add domain
   - Do this BEFORE updating DNS. If skipped, all logins will fail immediately after DNS switches.

2. **Add custom domain in Firebase Hosting, then update DNS**
   - Firebase Console → Hosting → Add custom domain → `easy-annotate.com`
   - Firebase will provide two A records. Apply them at your DNS registrar.
   - Full instructions in `FIREBASE_HOSTING_MIGRATION_PLAN.md` phases 3–5.

Everything in the codebase is ready. The CI/CD pipeline is active. Firebase Hosting is already receiving every push to `main`.
