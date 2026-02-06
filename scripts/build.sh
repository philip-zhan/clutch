#!/bin/bash
#
# Build Tauri app bundle
# Usage: ./build.sh [all|dmg|app]
#
# Arguments:
#   all  - Build both .app and DMG (default)
#   dmg  - Build DMG installer only
#   app  - Build .app bundle only
#

set -e

cd "$(dirname "$0")/.."

# Load environment variables from .env file
if [ -f ".env.prod" ]; then
    set -a
    source .env.prod
    set +a
fi

# Parse bundle format argument (default to "all")
BUNDLE_FORMAT="${1:-all}"

case "$BUNDLE_FORMAT" in
    all|dmg|app)
        if [ -n "$1" ]; then shift; fi
        ;;
    --help|-h)
        echo "Usage: $0 [all|dmg|app]"
        echo ""
        echo "Build Tauri app bundle."
        echo ""
        echo "Arguments:"
        echo "  all  - Build both .app and DMG (default)"
        echo "  dmg  - Build DMG installer only"
        echo "  app  - Build .app bundle only"
        exit 0
        ;;
    *)
        echo "Error: Invalid bundle format '$BUNDLE_FORMAT'"
        echo "Valid options: all, dmg, app"
        exit 1
        ;;
esac

export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/clutch.key")"
export VITE_API_URL="https://api.clutch.computer"

echo "Building Tauri app..."
echo "VITE_API_URL: $VITE_API_URL"
echo "Bundle format: $BUNDLE_FORMAT"
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_PASSWORD" ] && [ -n "$APPLE_TEAM_ID" ]; then
    echo "Notarization: Enabled (APPLE_ID=$APPLE_ID)"
else
    echo "Notarization: Disabled (set APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID in .env)"
fi
echo ""

if [ "$BUNDLE_FORMAT" = "all" ]; then
    bun run tauri build --bundles app,dmg "$@"
else
    bun run tauri build --bundles "$BUNDLE_FORMAT" "$@"
fi
