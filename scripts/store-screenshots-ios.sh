#!/usr/bin/env bash
set -euo pipefail

# Runs only on the ephemeral macOS CI machine. No signing/auth credentials,
# production writes, notification registrations or account creation are used.
ROOT="$(pwd)"
OUT="$ROOT/artifacts/store-screenshots"
MODE="${1:-all}"
case "$MODE" in all|build|capture) ;; *) echo 'Unknown screenshot mode' >&2; exit 1 ;; esac
mkdir -p "$OUT"
if [[ "$(uname -s)" != Darwin ]]; then
  echo 'An iOS Simulator on macOS is required.' >&2
  exit 1
fi
export DEVELOPER_DIR=/Applications/Xcode_26.6.app/Contents/Developer
xcodebuild -version
git rev-parse HEAD > "$OUT/source-commit.txt"

curl --fail --location --silent --show-error \
  https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.12.0/maestro.zip \
  --output "$RUNNER_TEMP/maestro.zip"
echo 'a6044a84542f522f434c5dc3d609e60c7446d423f3ed1b2ae513f5c48663ec5e  '"$RUNNER_TEMP/maestro.zip" | shasum -a 256 -c -
unzip -q "$RUNNER_TEMP/maestro.zip" -d "$RUNNER_TEMP/maestro-cli"
MAESTRO="$RUNNER_TEMP/maestro-cli/maestro/bin/maestro"
"$MAESTRO" --version

if [[ "$MODE" == capture ]]; then
  mkdir -p "$RUNNER_TEMP/amatora-simulator-app"
  tar -xzf "$SIMULATOR_APP_ARCHIVE" -C "$RUNNER_TEMP/amatora-simulator-app"
  APP="$(find "$RUNNER_TEMP/amatora-simulator-app" -maxdepth 1 -name '*.app' -print -quit)"
else
npx expo prebuild --platform ios --no-install
pod install --project-directory=ios > "$OUT/pods.log" 2>&1 || {
  tail -n 80 "$OUT/pods.log"
  exit 1
}
WORKSPACE="$(find ios -maxdepth 1 -name '*.xcworkspace' -print -quit)"
if [[ -z "$WORKSPACE" ]]; then
  echo 'Expected one generated app workspace.' >&2
  exit 1
fi
xcodebuild -list -json -workspace "$WORKSPACE" > "$RUNNER_TEMP/app-schemes.json"
SCHEME="$(python3 - "$RUNNER_TEMP/app-schemes.json" <<'PY'
import json,sys
schemes=json.load(open(sys.argv[1]))['workspace']['schemes']
matches=[s for s in schemes if s.lower()=='amatora']
assert len(matches)==1, 'Expected the amatora app scheme'
print(matches[0])
PY
)"
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" \
  -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$RUNNER_TEMP/amatora-derived" \
  CODE_SIGNING_ALLOWED=NO ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  > "$OUT/native-build.log" 2>&1 || {
    tail -n 100 "$OUT/native-build.log"
    exit 1
  }
APP="$(find "$RUNNER_TEMP/amatora-derived/Build/Products/Release-iphonesimulator" -maxdepth 1 -name '*.app' -print -quit)"
if [[ -z "$APP" ]]; then
  echo 'The native simulator app was not produced.' >&2
  exit 1
fi
tar -czf "$OUT/amatora-simulator-app.tar.gz" -C "$(dirname "$APP")" "$(basename "$APP")"
if [[ "$MODE" == build ]]; then exit 0; fi
fi
if [[ -z "$APP" ]]; then echo 'Missing simulator app artifact' >&2; exit 1; fi
xcrun simctl list runtimes -j > "$RUNNER_TEMP/runtimes.json"
xcrun simctl list devicetypes -j > "$RUNNER_TEMP/device-types.json"
python3 - "$RUNNER_TEMP/runtimes.json" "$RUNNER_TEMP/device-types.json" "${SCREENSHOT_DEVICE:-all}" > "$RUNNER_TEMP/screenshot-devices.tsv" <<'PY'
import json,sys
runtimes=json.load(open(sys.argv[1]))['runtimes']
ios=[r for r in runtimes if r.get('isAvailable') and '.iOS-' in r['identifier']]
assert ios, 'An available iOS runtime is required'
runtime=max(ios,key=lambda r:tuple(map(int,r['version'].split('.'))))['identifier']
types=json.load(open(sys.argv[2]))['devicetypes']
phone=[d for d in types if d['name']=='iPhone 16']
pad=[d for d in types if d['name'].startswith('iPad Pro 13-inch (M4)')]
assert len(phone)==1 and pad, 'The requested screenshot device types are unavailable'
for label,device in [('iphone',phone[0]),('ipad',pad[0])]:
    if sys.argv[3] in ('all',label):
        print(label,device['identifier'],runtime,sep='\t')
PY

capture_device() {
  local label="$1" device_type="$2" runtime="$3" sim_udid result
  local folder="$OUT/$label"
  mkdir -p "$folder"
  sim_udid="$(xcrun simctl create "AMATORA-$label" "$device_type" "$runtime")" || return
  xcrun simctl boot "$sim_udid" || return
  xcrun simctl bootstatus "$sim_udid" -b || return
  xcrun simctl status_bar "$sim_udid" override --time '9:41' --dataNetwork wifi --wifiBars 3 --batteryState charged --batteryLevel 100 || return
  xcrun simctl ui "$sim_udid" appearance light || return
  xcrun simctl install "$sim_udid" "$APP" || return
  if "$MAESTRO" --device "$sim_udid" test \
      --test-output-dir "$folder" --format junit \
      --output "$folder/results.xml" --debug-output "$folder/debug" \
      "$ROOT/.maestro/store-screenshots.yml"; then
    result=0
    # XCTest's image conversion dropped one pixel on iPhone in the first run.
    # Capture the actual simulator framebuffer instead of resizing that image.
    xcrun simctl io "$sim_udid" screenshot "$folder/home-canonical.png" || return
    python3 - "$label" "$folder/home-canonical.png" <<'PY'
import struct,sys
with open(sys.argv[2],'rb') as image:
    header=image.read(24)
size=struct.unpack('>II',header[16:24])
expected={'iphone':(1179,2556),'ipad':(2064,2752)}[sys.argv[1]]
assert size==expected, f'Unexpected native screenshot dimensions: {size}, expected {expected}'
print(f'Native screenshot verified: {size[0]}x{size[1]}')
PY
    if [[ "$?" != 0 ]]; then result=1; fi
  else
    result=$?
    xcrun simctl io "$sim_udid" screenshot "$folder/failure-screen.png" || true
  fi
  xcrun simctl shutdown "$sim_udid" || true
  return "$result"
}

result=0
while IFS=$'\t' read -r label device_type runtime; do
  if ! capture_device "$label" "$device_type" "$runtime"; then
    result=1
  fi
done < "$RUNNER_TEMP/screenshot-devices.tsv"
exit "$result"
