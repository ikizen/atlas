# Atlas — Chrome new-tab extension

A minimal Manifest V3 extension. It contains **no app logic** — it only
overrides Chrome's new-tab page with a page that instantly redirects to your
deployed Atlas app.

## Files

| File            | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `manifest.json` | MV3 manifest; sets `chrome_url_overrides.newtab`.    |
| `newtab.html`   | Minimal page that loads the three files below.       |
| `newtab.css`    | Dark background so there's no white flash.           |
| `config.js`     | **The one line you edit:** your Atlas URL.           |
| `redirect.js`   | Does `location.replace(window.ATLAS_URL)`.           |

> MV3 forbids inline `<script>` and `<style>` on extension pages, which is why
> the redirect and styles live in their own files.

## Setup

### 1. Point it at your Atlas URL

Open `config.js` and set your URL (no trailing slash):

```js
window.ATLAS_URL = "https://your-atlas-app.vercel.app";
```

Before deploying, you can leave it as `http://localhost:3210` and run
`pnpm dev` to use it locally.

### 2. Load it in Chrome

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked**.
4. Select this `extension/` folder.
5. Open a new tab — you should land on Atlas.

### 3. After you change the URL later

Edit `config.js`, then on `chrome://extensions` click the **reload** (↻) icon
on the Atlas card. Open a new tab to confirm.

## Notes

- No permissions are requested — it's just a static redirect page.
- The redirect uses `location.replace`, so the browser **Back** button still
  works as expected.
- Chrome only allows one extension to override the new-tab page at a time;
  disable Toby (or any other) if the new tab doesn't change.
