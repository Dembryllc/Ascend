#!/usr/bin/env bash
set -euo pipefail
SHOTS="${1:-e2e-shots}"
# Flows run in order against one emulator/vite lifecycle. The writing flow runs
# first so it sees the pristine seed; register adds students to the classroom.
FLOWS="${2:-tests/e2e/writing.e2e.mjs tests/e2e/register.e2e.mjs tests/e2e/pdftext.e2e.mjs tests/e2e/annotations.e2e.mjs tests/e2e/navigation.e2e.mjs}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Everything runs inside the emulator lifecycle so Auth+Firestore are up.
./node_modules/.bin/firebase emulators:exec \
  --config firebase.emulator.json --project demo-ascend "
set -e
echo '--- seeding ---'
node tests/e2e/seed.mjs
node tests/e2e/seed-pdfs.mjs
node tests/e2e/seed-annotations.mjs

echo '--- starting vite (emulator mode) ---'
VITE_USE_EMULATORS=true \
VITE_FIREBASE_API_KEY=demo \
VITE_FIREBASE_PROJECT_ID=demo-ascend \
VITE_FIREBASE_AUTH_DOMAIN=demo-ascend.firebaseapp.com \
VITE_FIREBASE_STORAGE_BUCKET=demo-ascend.appspot.com \
VITE_FIREBASE_MESSAGING_SENDER_ID=demo \
VITE_FIREBASE_APP_ID=demo \
npm run dev > /tmp/vite-e2e.log 2>&1 &
VITE_PID=\$!

echo '--- waiting for vite ---'
for i in \$(seq 1 60); do
  if curl -sf http://127.0.0.1:5173 >/dev/null 2>&1; then echo 'vite up'; break; fi
  sleep 1
done

echo '--- running playwright flows ---'
set +e
RC=0
for flow in $FLOWS; do
  echo \"--- flow: \$flow ---\"
  node \"\$flow\" http://127.0.0.1:5173 '$SHOTS' || RC=\$?
done
set -e
kill \$VITE_PID 2>/dev/null || true
exit \$RC
"
