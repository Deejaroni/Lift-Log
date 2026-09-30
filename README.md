# Lift Log — standalone app

A workout journal that installs on a phone like a regular app and works offline.
No accounts. Each person's data stays in their own browser on their own device.

- **iPhone:** open the link in **Safari** → Share button → **Add to Home Screen**.
- **Android:** open the link in **Chrome** → ⋮ menu → **Install app** (or *Add to Home screen*).

After that it opens full-screen from the home screen and works without a connection.

## Important for users: backups

Data lives only in that phone's browser. It does **not** sync between devices, and it's erased if
the app is deleted from the home screen or the browser's website data is cleared.
Tap **Export CSV** (bottom of the app) now and then and save the file somewhere safe.
**Import CSV** restores it, or moves it to a new phone. Importing never creates duplicates.

Tip: on iPhone, the home-screen app and Safari keep separate data — log from the home-screen icon.

## Updating the app

Edit the files, then open `sw.js` and change `VERSION` (e.g. `liftlog-v2`) before re-uploading.
Users get the new version the next time they open the app with a connection. Their data is untouched.
