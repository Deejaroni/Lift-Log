# Lift Log — standalone app

A workout journal that installs on a phone like a regular app and works offline.
No accounts. Each person's data stays in their own browser on their own device.

## Put it online (free, ~10 minutes)

**Option A — Netlify Drop (easiest, no coding)**
1. Unzip this folder.
2. Go to https://app.netlify.com/drop and drag the unzipped `liftlog` folder onto the page.
3. Netlify gives you a link. Create a free account to keep the site permanently and rename the link (e.g. `yourname-liftlog.netlify.app`).
4. To update later, drag the folder onto your site's **Deploys** page.

**Option B — GitHub Pages**
1. Create a free GitHub account and a new public repository (e.g. `liftlog`).
2. Upload everything inside this folder (Add file → Upload files), keeping the `fonts`, `icons` and `vendor` folders.
3. Repository **Settings → Pages** → Source: *Deploy from a branch* → branch `main`, folder `/ (root)` → Save.
4. After a minute your app is at `https://<username>.github.io/liftlog/`.

The site must be served over **https** (both options do this) for install and offline mode to work.
Opening `index.html` straight from your computer works for testing, but won't install or work offline.

## What to send people

Send the link, plus:

- **iPhone:** open the link in **Safari** → Share button → **Add to Home Screen**.
- **Android:** open the link in **Chrome** → ⋮ menu → **Install app** (or *Add to Home screen*).

After that it opens full-screen from the home screen and works without a connection.

## Important for users: backups

Data lives only in that phone's browser. It does **not** sync between devices, and it's erased if
the app is deleted from the home screen or the browser's website data is cleared.
Tap **Export CSV** (bottom of the app) now and then and save the file somewhere safe.
**Import CSV** restores it, or moves it to a new phone. Importing never creates duplicates.

Tip: on iPhone, the home-screen app and Safari keep separate data — log from the home-screen icon.

## Moving your own data from the Claude version

In the Claude-hosted Lift Log, tap **Export CSV**, then **Import CSV** in this app.

## Updating the app

Edit the files, then open `sw.js` and change `VERSION` (e.g. `liftlog-v2`) before re-uploading.
Users get the new version the next time they open the app with a connection. Their data is untouched.
