#!/bin/bash
#
# Upload all Tauri release bundles to Cloudflare R2
# Usage: ./upload-all.sh
#
# Uploads:
#   - DMG installer
#   - App tarball (for auto-updater)
#   - App signature (for auto-updater verification)
#
# Environment variables (or set in .env):
#   R2_ACCOUNT_ID       - Cloudflare account ID (required)
#   R2_ACCESS_KEY_ID    - R2 API access key (required, or use 'r2' AWS profile)
#   R2_SECRET_ACCESS_KEY- R2 API secret key (required, or use 'r2' AWS profile)
#   R2_BUCKET           - Bucket name (default: clutch-releases)
#   R2_PUBLIC_URL       - Public bucket URL (optional, has default)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAURI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MACOS_BUNDLE_DIR="$TAURI_DIR/src-tauri/target/release/bundle/macos"
DMG_BUNDLE_DIR="$TAURI_DIR/src-tauri/target/release/bundle/dmg"

# Load environment variables from .env file if it exists
for ENV_FILE in "$SCRIPT_DIR/.env" "$TAURI_DIR/.env"; do
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
        break
    fi
done

# Get version from tauri.conf.json
VERSION=$(grep '"version"' "$TAURI_DIR/src-tauri/tauri.conf.json" | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')

# Determine architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    ARCH_SUFFIX="aarch64"
else
    ARCH_SUFFIX="x86_64"
fi

# Define artifact paths
DMG_PATH="$DMG_BUNDLE_DIR/Clutch_${VERSION}_${ARCH_SUFFIX}.dmg"
TARBALL_PATH="$MACOS_BUNDLE_DIR/Clutch.app.tar.gz"
SIG_PATH="$MACOS_BUNDLE_DIR/Clutch.app.tar.gz.sig"

echo "========================================"
echo "  Upload All Release Bundles to R2"
echo "========================================"
echo ""
echo "Version: $VERSION"
echo "Architecture: $ARCH_SUFFIX"
echo ""

# Check all artifacts exist
MISSING=0
if [ ! -f "$DMG_PATH" ]; then
    echo "Warning: DMG not found at $DMG_PATH"
    MISSING=$((MISSING + 1))
fi
if [ ! -f "$TARBALL_PATH" ]; then
    echo "Warning: Updater tarball not found at $TARBALL_PATH"
    MISSING=$((MISSING + 1))
fi
if [ ! -f "$SIG_PATH" ]; then
    echo "Warning: Signature not found at $SIG_PATH"
    MISSING=$((MISSING + 1))
fi

if [ "$MISSING" -eq 3 ]; then
    echo ""
    echo "Error: No artifacts found. Run 'bun run tauri build' first."
    exit 1
fi

echo "Found artifacts:"
[ -f "$DMG_PATH" ] && echo "  DMG: $DMG_PATH"
[ -f "$TARBALL_PATH" ] && echo "  Tarball: $TARBALL_PATH"
[ -f "$SIG_PATH" ] && echo "  Signature: $SIG_PATH"
echo ""

# R2 configuration
R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-}"
R2_BUCKET="${R2_BUCKET:-clutch-releases}"
R2_PUBLIC_URL="${R2_PUBLIC_URL:-https://pub-349c2b6f52cb45f6b00d16404e327b0d.r2.dev}"

# Remote paths
REMOTE_DMG="tauri/v${VERSION}/Clutch_${VERSION}_${ARCH_SUFFIX}.dmg"
REMOTE_TARBALL="tauri/v${VERSION}/Clutch_${VERSION}_darwin-${ARCH_SUFFIX}.app.tar.gz"
REMOTE_SIG="tauri/v${VERSION}/Clutch_${VERSION}_darwin-${ARCH_SUFFIX}.app.tar.gz.sig"

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed."
    echo "Install it with: brew install awscli"
    exit 1
fi

# Check R2_ACCOUNT_ID
if [ -z "$R2_ACCOUNT_ID" ]; then
    echo "Error: R2_ACCOUNT_ID environment variable is not set."
    echo "Find it in Cloudflare Dashboard -> R2 -> Overview -> Account ID"
    exit 1
fi

R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Check R2 credentials
if [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ]; then
    # Check if r2 profile exists
    if ! aws configure list --profile r2 &> /dev/null 2>&1; then
        echo "Error: R2 credentials not found."
        echo "Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables,"
        echo "or configure an AWS CLI profile named 'r2'."
        exit 1
    fi
    AWS_PROFILE_ARG="--profile r2"
else
    AWS_PROFILE_ARG=""
    export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
fi

echo "Uploading to R2..."
echo "  Bucket: $R2_BUCKET"
echo "  Endpoint: $R2_ENDPOINT"
echo ""

UPLOADED=0

# Upload DMG
if [ -f "$DMG_PATH" ]; then
    echo "Uploading DMG..."
    aws s3 cp "$DMG_PATH" "s3://$R2_BUCKET/$REMOTE_DMG" \
        --endpoint-url "$R2_ENDPOINT" \
        --region auto \
        $AWS_PROFILE_ARG
    UPLOADED=$((UPLOADED + 1))
fi

# Upload tarball
if [ -f "$TARBALL_PATH" ]; then
    echo "Uploading tarball..."
    aws s3 cp "$TARBALL_PATH" "s3://$R2_BUCKET/$REMOTE_TARBALL" \
        --endpoint-url "$R2_ENDPOINT" \
        --region auto \
        $AWS_PROFILE_ARG
    UPLOADED=$((UPLOADED + 1))
fi

# Upload signature
if [ -f "$SIG_PATH" ]; then
    echo "Uploading signature..."
    aws s3 cp "$SIG_PATH" "s3://$R2_BUCKET/$REMOTE_SIG" \
        --endpoint-url "$R2_ENDPOINT" \
        --region auto \
        $AWS_PROFILE_ARG
    UPLOADED=$((UPLOADED + 1))
fi

echo ""
echo "========================================"
echo "  Upload Complete! ($UPLOADED files)"
echo "========================================"
echo ""

if [ -f "$DMG_PATH" ]; then
    echo "DMG URL: $R2_PUBLIC_URL/$REMOTE_DMG"
fi
if [ -f "$TARBALL_PATH" ]; then
    echo "Tarball URL: $R2_PUBLIC_URL/$REMOTE_TARBALL"
fi
if [ -f "$SIG_PATH" ]; then
    echo "Signature URL: $R2_PUBLIC_URL/$REMOTE_SIG"
fi

echo ""
echo "========================================"
echo "  Signature (for server env vars)"
echo "========================================"
echo ""
if [ -f "$SIG_PATH" ]; then
    echo "TAURI_SIG_DARWIN_$(echo $ARCH_SUFFIX | tr '[:lower:]' '[:upper:]')="
    cat "$SIG_PATH"
    echo ""
fi

echo ""
echo "========================================"
echo "  Next Steps"
echo "========================================"
echo ""
echo "1. Update server environment variables:"
echo "   TAURI_LATEST_VERSION=$VERSION"
if [ -f "$SIG_PATH" ]; then
    echo "   TAURI_SIG_DARWIN_$(echo $ARCH_SUFFIX | tr '[:lower:]' '[:upper:]')=<signature above>"
fi
echo ""
echo "2. Deploy server to update the updater endpoint"
echo "3. Test auto-update from an older version"
echo ""
