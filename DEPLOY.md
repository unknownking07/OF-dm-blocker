# Deploying

## Package the extension

```sh
chmod +x package.sh
./package.sh
```

This builds `site/downloads/of-block.zip` (and a versioned copy `site/downloads/of-block-v<VERSION>.zip`). The site links to the unversioned filename, so re-running this script ships an update without touching the HTML.

## Deploy the landing page to Cloudflare Pages

### Option 1 — Direct upload (no git)

1. Run `./package.sh` so the zip exists under `site/downloads/`.
2. Go to **Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets**.
3. Drag and drop the **`site/`** directory (not the project root).
4. Give the project a name. Cloudflare assigns `<name>.pages.dev` automatically.
5. Add a custom domain later under the project's **Custom domains** tab.

### Option 2 — Git-connected (auto-deploy on push)

1. Push the project to GitHub / GitLab.
2. **Cloudflare Dashboard → Pages → Connect to Git** → pick the repo.
3. Build configuration:
   - **Framework preset:** None
   - **Build command:** `./package.sh`
   - **Build output directory:** `site`
4. Cloudflare runs `package.sh` on every push, regenerates the zip, and publishes `site/`.

The included `site/_headers` sets cache + security headers, and `site/_redirects` exposes `/download` → the zip and `/install` → the install section.

## Updating the extension

1. Bump `version` in `manifest.json`.
2. Make changes.
3. `./package.sh`.
4. (Git workflow) Commit and push — Cloudflare redeploys automatically.

The unversioned `of-block.zip` always points at the latest. Existing users would need to manually replace their unpacked folder — there's no auto-update for unpacked extensions until/unless this ships through the Chrome Web Store.
