#!/usr/bin/env bash
# Build the demo site and push it to the Forgejo Pages branch.
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

echo "Building @fiduswriter/editor..."
npm run build

echo "Preparing pages build..."
BUILD_DIR="$ROOT/.pages-build"
rm -rf "$BUILD_DIR"
mkdir "$BUILD_DIR"

cp -r "$ROOT/demo/"* "$BUILD_DIR/"
cp -r "$ROOT/dist" "$BUILD_DIR/"

# Bundle demo entry points into the pages build.
echo "Bundling demos..."
PAGES_BUILD_DIR="$BUILD_DIR" node "$ROOT/scripts/build-demo.js"

# Copy fwtoolkit CSS and editor CSS so the demo has consistent styling
# without a CDN. The demo's staticUrl() maps "css/..." paths to this directory.
mkdir -p "$BUILD_DIR/css"
for css in "$ROOT/node_modules/fwtoolkit/css/"*.css; do
    cp "$css" "$BUILD_DIR/css/"
done
cp "$ROOT/node_modules/prosemirror-view/style/prosemirror.css" "$BUILD_DIR/css/"
cp "$ROOT/node_modules/cropperjs/dist/cropper.min.css" "$BUILD_DIR/css/"
for css in "$ROOT/css/"*.css; do
    cp "$css" "$BUILD_DIR/css/"
done
# Bibliography styles are provided by @fiduswriter/bibliography-manager.
cp "$ROOT/node_modules/@fiduswriter/bibliography-manager/css/bibliography.css" "$BUILD_DIR/css/"

# Copy static assets (fonts, images, audio) referenced by the editor.
mkdir -p "$BUILD_DIR/static"
cp -r "$ROOT/static/"* "$BUILD_DIR/static/"
cp -r "$ROOT/demo/static/"* "$BUILD_DIR/static/"

# Copy Font Awesome CSS and webfonts used by fwtoolkit and the editor.
mkdir -p "$BUILD_DIR/css/fontawesome/css"
mkdir -p "$BUILD_DIR/css/fontawesome/webfonts"
cp "$ROOT/node_modules/@fortawesome/fontawesome-free/css/all.css" "$BUILD_DIR/css/fontawesome/css/"
cp "$ROOT/node_modules/@fortawesome/fontawesome-free/webfonts/"* "$BUILD_DIR/css/fontawesome/webfonts/"

# Copy MathLive static assets bundled by @fiduswriter/document.
mkdir -p "$BUILD_DIR/css/libs"
cp -r "$ROOT/node_modules/@fiduswriter/document/static-libs/css/libs/"* "$BUILD_DIR/css/libs/"

# Copy localization catalogs used by the startup dialog and gettext fallback.
mkdir -p "$BUILD_DIR/locale"
cp -r "$ROOT/locale/"* "$BUILD_DIR/locale/"

# Copy the package logo used by the landing page and favicon.
cp "$ROOT/logo.svg" "$BUILD_DIR/logo.svg"

# Remove TypeScript sources and declaration/source-map files from the pages build.
find "$BUILD_DIR" -name "*.ts" -delete
find "$BUILD_DIR/dist" \( -name "*.d.ts" -o -name "*.map" \) -delete

cd "$BUILD_DIR"
git init
git checkout -b pages
git add .
# A committer identity is required when running in CI (fresh runner image).
git config user.name "CI"
git config user.email "ci@fiduswriter.org"
git commit -m "Deploy @fiduswriter/editor demo to Forgejo Pages"

# Prefer the HTTPS push URL passed from CI (org-level PAGES_TOKEN); fall back
# to the locally configured SSH remote for manual deploys.
if [ -n "${PAGES_REMOTE:-}" ]; then
    REMOTE="$PAGES_REMOTE"
    echo "Pushing to pages branch via CI token..."
else
    REMOTE=$(cd "$ROOT" && git remote get-url origin)
    echo "Pushing to $REMOTE pages branch..."
fi
git remote add origin "$REMOTE"
git push -f origin pages

cd "$ROOT"
rm -rf "$BUILD_DIR"
echo "Done. The demo should be available at https://fiduswriter.pages.fiduswriter.org/fiduswriter-editor-ts/"
