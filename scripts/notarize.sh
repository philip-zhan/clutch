#!/bin/bash
#
# Notarize a Tauri app bundle for macOS distribution
# Usage: ./notarize.sh [app|dmg]
#
# Prerequisites:
#   Notarization credentials stored in Keychain (run setup once):
#     xcrun notarytool store-credentials "clutch-notarize" \
#       --apple-id "your@email.com" \
#       --team-id "D22PZDCXY5" \
#       --password "app-specific-password"
#
# This script:
#   1. Creates a ZIP of the app for notarization
#   2. Submits to Apple's notarization service
#   3. Staples the notarization ticket to the app
#   4. Re-creates the updater tarball with the notarized app
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAURI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUNDLE_DIR="$TAURI_DIR/src-tauri/target/release/bundle"
MACOS_DIR="$BUNDLE_DIR/macos"
DMG_DIR="$BUNDLE_DIR/dmg"

# Notarization keychain profile name
NOTARIZE_PROFILE="clutch-notarize"

# Signing identity (must match tauri.conf.json)
SIGNING_IDENTITY="Developer ID Application: Draft Technologies Ltd (D22PZDCXY5)"

# Parse arguments
BUNDLE_TYPE="${1:-app}"

show_help() {
    echo "Usage: $0 [app|dmg]"
    echo ""
    echo "Notarize a Tauri app bundle for macOS distribution."
    echo ""
    echo "Arguments:"
    echo "  app  - Notarize the .app bundle (default)"
    echo "  dmg  - Notarize the .dmg installer"
    echo ""
    echo "Prerequisites:"
    echo "  1. Build the app first: ./scripts/build-dmg.sh app"
    echo "  2. Store notarization credentials (run once):"
    echo "     xcrun notarytool store-credentials \"$NOTARIZE_PROFILE\" \\"
    echo "       --apple-id \"your@email.com\" \\"
    echo "       --team-id \"D22PZDCXY5\" \\"
    echo "       --password \"app-specific-password\""
    exit 0
}

case "$BUNDLE_TYPE" in
    app)
        ;;
    dmg)
        ;;
    --help|-h)
        show_help
        ;;
    *)
        echo "Error: Invalid bundle type '$BUNDLE_TYPE'"
        echo "Valid options: app, dmg"
        exit 1
        ;;
esac

# Get version from tauri.conf.json
VERSION=$(grep '"version"' "$TAURI_DIR/src-tauri/tauri.conf.json" | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')

# Determine architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    ARCH_SUFFIX="aarch64"
else
    ARCH_SUFFIX="x86_64"
fi

echo "========================================"
echo "  Tauri App Notarization"
echo "========================================"
echo ""
echo "Version: $VERSION"
echo "Architecture: $ARCH_SUFFIX"
echo "Bundle type: $BUNDLE_TYPE"
echo ""

if [ "$BUNDLE_TYPE" = "dmg" ]; then
    # Notarize DMG
    DMG_PATH="$DMG_DIR/Clutch_${VERSION}_${ARCH_SUFFIX}.dmg"

    if [ ! -f "$DMG_PATH" ]; then
        echo "Error: DMG not found at $DMG_PATH"
        echo "Run './scripts/build-dmg.sh dmg' first."
        exit 1
    fi

    echo "DMG: $DMG_PATH"
    echo ""

    # Sign the DMG (Tauri may not sign it by default)
    echo "==> Signing DMG..."
    codesign --force --sign "$SIGNING_IDENTITY" "$DMG_PATH"
    echo ""

    # Submit for notarization
    echo "==> Submitting DMG to Apple notarization service..."
    xcrun notarytool submit "$DMG_PATH" \
        --keychain-profile "$NOTARIZE_PROFILE" \
        --wait
    echo ""

    # Staple the notarization ticket
    echo "==> Stapling notarization ticket to DMG..."
    xcrun stapler staple "$DMG_PATH"
    echo ""

    # Verify
    echo "==> Verifying notarization..."
    spctl --assess --type open --context context:primary-signature --verbose "$DMG_PATH" 2>&1 || {
        echo "Note: spctl assessment may fail in some environments, but notarization succeeded."
    }

else
    # Notarize app bundle
    APP_PATH="$MACOS_DIR/Clutch.app"

    if [ ! -d "$APP_PATH" ]; then
        echo "Error: App not found at $APP_PATH"
        echo "Run './scripts/build-dmg.sh app' first."
        exit 1
    fi

    echo "App: $APP_PATH"
    echo ""

    # Verify code signature before notarization
    echo "==> Verifying code signature..."
    codesign --verify --deep --strict "$APP_PATH" 2>&1 || {
        echo "Error: Code signature verification failed"
        echo "Make sure the app was built with proper signing."
        exit 1
    }
    echo "   Code signature: Valid"
    echo ""

    # Create ZIP for notarization
    NOTARIZE_ZIP="$BUNDLE_DIR/Clutch-notarize.zip"
    echo "==> Creating ZIP for notarization..."
    ditto -c -k --keepParent "$APP_PATH" "$NOTARIZE_ZIP"
    echo ""

    # Submit for notarization
    echo "==> Submitting to Apple notarization service..."
    xcrun notarytool submit "$NOTARIZE_ZIP" \
        --keychain-profile "$NOTARIZE_PROFILE" \
        --wait
    echo ""

    # Clean up notarization ZIP
    rm -f "$NOTARIZE_ZIP"

    # Staple the notarization ticket
    echo "==> Stapling notarization ticket to app..."
    xcrun stapler staple "$APP_PATH"
    echo ""

    # Verify notarization
    echo "==> Verifying notarization..."
    spctl --assess --type execute --verbose "$APP_PATH" 2>&1 || {
        echo "Note: spctl assessment may fail in some environments, but notarization succeeded."
    }
    echo ""

    # Re-create the updater tarball with the notarized app
    echo "==> Re-creating updater tarball with notarized app..."
    TARBALL_PATH="$MACOS_DIR/Clutch.app.tar.gz"

    # Create tarball (same way Tauri does it)
    tar -czf "$TARBALL_PATH" -C "$MACOS_DIR" "Clutch.app"

    # Re-sign the tarball for the updater
    echo "==> Signing updater tarball..."
    if [ -z "$TAURI_SIGNING_PRIVATE_KEY" ]; then
        export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/clutch.key")"
    fi

    # Use Tauri's signer to create the .sig file
    # The signer is bundled with tauri-cli
    cd "$TAURI_DIR"
    bunx tauri signer sign "$TARBALL_PATH" --private-key "$TAURI_SIGNING_PRIVATE_KEY"
    cd - > /dev/null

    echo ""
    echo "   Tarball: $TARBALL_PATH"
    echo "   Signature: $TARBALL_PATH.sig"
fi

echo ""
echo "========================================"
echo "  Notarization Complete!"
echo "========================================"
echo ""
if [ "$BUNDLE_TYPE" = "dmg" ]; then
    echo "Notarized DMG: $DMG_PATH"
else
    echo "Notarized app: $APP_PATH"
    echo "Updater tarball: $TARBALL_PATH"
fi
echo ""
echo "The app should now pass Gatekeeper on any Mac."
echo ""
