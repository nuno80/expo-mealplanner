#!/usr/bin/env bash
# Dev Android su WSL2: il telefono non può raggiungere l'IP NAT di WSL (172.20.x.x).
# Soluzione: tunnel adb reverse, così il telefono parla con Metro via localhost.
set -euo pipefail
cd "$(dirname "$0")/.."

adb devices | grep -qE '\bdevice$' || { echo "Nessun device adb collegato."; exit 1; }

echo "→ Configuro tunnel adb reverse (localhost:8081 del telefono → Metro su WSL)"
adb reverse tcp:8081 tcp:8081

echo "→ Avvio Metro su 0.0.0.0:8081 (--host lan) e installo l'app"
exec ./node_modules/.bin/expo run:android --device "$(adb devices | awk 'NR==2{print $1}')"
