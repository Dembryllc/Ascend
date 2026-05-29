# Firebase Hosting Migration Plan — Easy Annotate

**Date:** 2026-05-28  
**Status:** Ready to execute  
**Migration type:** DNS cutover (infrastructure already in place)

---

## Executive Summary

Firebase Hosting is **already configured and deploying** for Easy Annotate. Every push to `main` builds the app and deploys it to Firebase Hosting via GitHub Actions. The migration from Netlify to Firebase Hosting is not a technical migration — it is a **DNS cutover**. There is nothing left to configure in the app, in `firebase.json`, or in CI/CD. The only remaining steps are:

1. Add `easy-annotate.com` as a custom domain in Firebase Hosting.
2. Update DNS records at your registrar to point to Firebase's servers.
3. Add `easy-annotate.com` to Firebase Auth's authorized domains list.
4. Verify the live site and monitor for 24–48 hours.
5. Optionally remove Netlify after confidence is established.

**Firebase readiness score: 9/10.** All config exists and is correct. The CI/CD pipeline is green.

---

## Current State Audit

### Framework
| Item | Value |
|---|---|
| Framework | React 19 + TypeScript + Vite 8 SPA |
| Node requirement | 22+ (Vite 8 + TypeScript 6 do not run on Node 20) |
| Build command | `npm run build` → `dist/` |
| Build time | ~47 seconds in CI |
| Install flag | `--legacy-peer-deps` required |

### Netlify Setup (`netlify.toml`)
| Feature | Status |
|---|---|
| Build command | `npm run build` |
| Publish dir | `dist` |
| SPA redirect `/* → /index.html 200` | ✅ Present |
| Netlify Functions | ❌ None used |
| Netlify Forms | ❌ None used |
| Custom headers | ❌ None in toml |
| Environment variables in toml | ❌ None |
| Edge functions | ❌ None used |
| Split testing | ❌ None |

There are **no Netlify-specific features** in use. This app uses Netlify purely as a static host with a single SPA redirect rule.

### Firebase Hosting Setup (`firebase.json` + `.firebaserc`)
| Feature | Status |
|---|---|
| Public dir | `dist` ✅ Matches Netlify |
| SPA rewrite `** → /index.html` | ✅ Present |
| MIME headers for `.mjs` | ✅ Present (critical for iOS Safari + PDF.js worker) |
| MIME headers for `.js` | ✅ Present |
| Firebase project | `ascend-annotate` ✅ |
| `.firebaserc` default project | `ascend-annotate` ✅ |

### CI/CD (`.github/workflows/firebase-deploy.yml`)
| Step | Status |
|---|---|
| Trigger | Push to `main` ✅ |
| Node version | 22 ✅ |
| Install | `npm ci --legacy-peer-deps` ✅ |
| All `VITE_FIREBASE_*` env vars | ✅ Hardcoded in workflow |
| Deploy method | Firebase CLI via service account JSON ✅ |
| GitHub Secret | `FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE` ✅ |
| Deploy scope | `--only hosting` ✅ |
| Last run | Green ✅ |

### What Firebase Hosting does NOT yet have
| Item | Action required |
|---|---|
| Custom domain `easy-annotate.com` | Add in Firebase Console → Hosting → Add custom domain |
| `easy-annotate.com` in Auth authorized domains | Add in Firebase Console → Authentication → Settings → Authorized domains |

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **DNS propagation delay** — TTL-dependent, up to 48h for full propagation | Medium | Lower DNS TTL to 300s (5 min) at least 24h before cutover. Keep Netlify live during propagation. |
| 2 | **Firebase Auth rejects logins from new domain** — `easy-annotate.com` not in authorized domains list | High | Add domain to Firebase Auth before updating DNS. Otherwise all sign-in/sign-up will fail with `auth/unauthorized-domain`. |
| 3 | **SSL certificate provisioning delay** — Firebase provisions a free TLS cert via Let's Encrypt after DNS is pointed | Low | Firebase typically provisions in under 1 hour after DNS propagates. Site will show cert warning during this window. Brief, not permanent. |
| 4 | **Firestore indexes not in CI** — `firestore.indexes.json` is not deployed by the workflow (`--only hosting`) | Low | Indexes already exist in the live project from prior manual deployment. No change to indexes needed for this migration. Do not redeploy them unless rules have changed. |
| 5 | **Netlify serving stale build during overlap** — the `require('fs').accessSync` bug caused Netlify to fall back to an older deploy. Now fixed by the `existsSync` patch (commit `55cc7a2`). | Resolved | Fix is pushed. Netlify's next build will produce a correct `dist/pdf.worker.mjs`. Confirm Netlify's deploy log shows a successful build after that commit. |
| 6 | **Firebase Storage CORS** — if Storage bucket CORS was customized to only allow `*.netlify.app` or the Netlify URL | Very Low | Easy Annotate does not use custom Storage CORS rules. The Storage security rules enforce access at the Firebase level; CORS is not scoped to a specific origin in this project. |
| 7 | **Old Netlify deploy URL remains active** — `*.netlify.app` subdomain will still serve the app after cutover | Acceptable | This is harmless. Firebase Auth's authorized domain list controls which origins can authenticate — the Netlify subdomain is already there. Leave it; removing it is optional cleanup. |

---

## Phase-by-Phase Plan

### Phase 1 — Final Audit (Do this now, takes 5 minutes)

Confirm the Firebase Hosting deploy is current and serving correctly.

1. Open [Firebase Console → Hosting](https://console.firebase.google.com/project/ascend-annotate/hosting).
2. Verify the latest release timestamp matches the most recent push to `main`.
3. Open the Firebase-assigned preview URL (e.g., `ascend-annotate.web.app` or `ascend-annotate.firebaseapp.com`) in a browser.
4. Confirm: page loads, PDF opens, annotation saves, login/logout works.
5. Open DevTools → Network, filter by `pdf.worker.mjs` — confirm it returns HTTP 200 with `Content-Type: application/javascript` (not HTML).

**Pass criteria:** Firebase preview URL works end-to-end identically to `easy-annotate.com`.

---

### Phase 2 — Pre-cutover Auth Domain (Do this before touching DNS)

If `easy-annotate.com` is not in Firebase Auth's authorized domain list, logins will fail the moment DNS switches.

1. Open [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/ascend-annotate/authentication/settings).
2. Check whether `easy-annotate.com` (and `www.easy-annotate.com` if you use www) is already listed.
3. If not listed, click **Add domain** and add both `easy-annotate.com` and `www.easy-annotate.com`.
4. No deploy or rebuild is needed — Auth domain changes take effect immediately.

---

### Phase 3 — Lower DNS TTL (Do this 24 hours before cutover)

Lowering TTL before the cutover means DNS changes propagate faster when you execute the switch.

1. Log in to your DNS registrar (wherever `easy-annotate.com` is registered).
2. Find the A record(s) or CNAME record pointing to Netlify.
3. Lower the TTL to **300 seconds** (5 minutes).
4. Wait 24 hours (or at least one full TTL cycle of the current TTL value) before proceeding.

---

### Phase 4 — Add Custom Domain in Firebase Hosting

1. Open [Firebase Console → Hosting](https://console.firebase.google.com/project/ascend-annotate/hosting).
2. Click **Add custom domain**.
3. Enter `easy-annotate.com`. Firebase will show you DNS records to add.
4. Firebase provides two A records (IPv4) for the apex domain and a CNAME for `www`.
5. Note these values — you will apply them in Phase 5.

Firebase will begin SSL certificate provisioning once DNS is verified. It checks for the records automatically every few minutes.

---

### Phase 5 — DNS Cutover

**This is the point of no return for live traffic. Execute during low-traffic hours.**

At your DNS registrar:

1. **Replace** the existing A record(s) for `easy-annotate.com` with the two A record IP addresses Firebase gave you in Phase 4.
2. **Add or replace** the CNAME for `www.easy-annotate.com` to point to `easy-annotate.com` (or the Firebase-specified target).
3. Save the changes.

Firebase will detect the DNS change, verify ownership, and provision the TLS certificate. This usually completes within 1 hour after DNS propagates.

**Do not remove the Netlify site yet.** Netlify will continue serving traffic to any visitor whose DNS hasn't propagated yet. This is correct behavior — keep both live simultaneously for 24–48 hours.

---

### Phase 6 — Verify Firebase is Live

After DNS propagation (check with `dig easy-annotate.com` or an online DNS checker):

1. Open `https://easy-annotate.com` in an incognito browser window.
2. Confirm TLS certificate is valid and issued to `easy-annotate.com` (not a Netlify certificate).
3. Confirm the page loads, login works, a PDF opens, annotation saves correctly.
4. Open DevTools → Network: confirm `pdf.worker.mjs` loads with `Content-Type: application/javascript`.
5. Test on an iOS device in Safari — PDF.js worker MIME type handling is iOS-Safari-specific and was the root cause of prior failures.
6. Check the Firebase Console → Hosting — it should show `easy-annotate.com` as **Connected**.

---

### Phase 7 — Monitor (24–48 hours post-cutover)

Watch for:
- Firebase Hosting usage in the console (requests should ramp up as DNS propagates globally).
- Any Auth errors in Firebase Console → Authentication → Users (unusual failed sign-ins).
- Firestore usage spike (normal — same traffic, different host).
- GitHub Actions: next push to `main` should still deploy successfully to Firebase Hosting.

No application code changes are needed during monitoring.

---

### Phase 8 — Rollback Plan

If anything goes wrong after cutover:

1. **Immediate:** Log back into your DNS registrar and point the A records back to Netlify's IPs (available in Netlify Dashboard → Domain settings). Because TTL is now 300s, this propagates in ~5 minutes.
2. **Firebase Auth:** The authorized domain list can be updated in seconds — no code deploy needed.
3. **Netlify site:** Do not delete the Netlify site until at least 2 weeks after cutover is confirmed stable.

Rollback is fast because Netlify still has the current deploy (the `existsSync` fix is already deployed there too, so Netlify is serving a correct build).

---

### Phase 9 — Post-Migration Cleanup (Optional, after 2+ weeks)

Once confidence is established:

1. **Netlify:** Delete the site from the Netlify dashboard (or leave it connected to the repo for fallback — your call).
2. **`netlify.toml`:** Optionally remove from the repo. No functional impact — it does nothing when Netlify isn't the host, but it is harmless.
3. **GitHub Actions:** The `firebase-deploy.yml` workflow is the only deploy pipeline needed going forward.
4. **CLAUDE.md:** Already updated to reflect Firebase Hosting as the production host.

---

## Exact Config Verification

No config changes are needed. For reference, here is the final state of all relevant files:

### `firebase.json` (current — correct, no changes needed)
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {"source":"**/*.mjs","headers":[{"key":"Content-Type","value":"application/javascript"}]},
      {"source":"**/*.js","headers":[{"key":"Content-Type","value":"application/javascript"}]}
    ],
    "rewrites": [{"source":"**","destination":"/index.html"}]
  }
}
```

The `.mjs` MIME header is **critical** — without it, iOS Safari rejects the PDF.js worker with `"Importing a module script failed"`. It is already present.

### `netlify.toml` (current — no changes needed, leave in place until cleanup)
```toml
[build]
  command   = "npm run build"
  publish   = "dist"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

### `vite.config.ts` (current — correct, no changes needed)
The `pdfWorkerPlugin` copies `pdf.worker.mjs` to `dist/` using `existsSync` (ESM-compatible). This works identically for both Firebase Hosting and Netlify.

---

## Commands Reference

These are the only commands you may need during the migration. No new packages or config changes required.

```bash
# Verify current local build is clean
npm run build

# Test Firebase deploy manually (if needed — CI does this automatically)
# Requires firebase-tools installed and authenticated
firebase deploy --only hosting --project ascend-annotate

# Check DNS propagation after cutover
dig easy-annotate.com A
dig www.easy-annotate.com

# Check current TTL of DNS records
dig easy-annotate.com A +noall +answer
```

---

## Unanswered Questions

Before executing the cutover, confirm these with your registrar and Firebase Console:

1. **Who is the DNS registrar for `easy-annotate.com`?** (GoDaddy, Namecheap, Google Domains, Cloudflare, etc.) — TTL and record editing steps vary.
2. **Is `www.easy-annotate.com` in use?** Some users may type `www.` — confirm whether a www redirect is needed and how it is currently handled.
3. **What is the current DNS TTL for `easy-annotate.com`?** If it is already low (≤300s), Phase 3 can be skipped.
4. **Is `easy-annotate.com` already listed in Firebase Auth → Authorized domains?** This can be checked before executing any DNS steps.

---

## Summary Checklist

- [ ] Phase 1: Verify Firebase preview URL works end-to-end
- [ ] Phase 2: Add `easy-annotate.com` to Firebase Auth authorized domains
- [ ] Phase 3: Lower DNS TTL to 300s, wait 24h
- [ ] Phase 4: Add custom domain in Firebase Hosting console, get DNS records
- [ ] Phase 5: Update DNS A records at registrar (low-traffic window)
- [ ] Phase 6: Verify live site — TLS, login, PDF, annotations, iOS Safari
- [ ] Phase 7: Monitor 24–48h
- [ ] Phase 8: (If needed) Rollback via DNS to Netlify IPs
- [ ] Phase 9: (After 2+ weeks) Remove Netlify site, optionally remove `netlify.toml`
