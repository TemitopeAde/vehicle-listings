# Promo video

`output/vehicle-listings-promo.mp4` is a 1920×1080, 30 fps, ~48 s H.264 video with
AAC audio. It shows the real dashboard (Vehicles), the storefront listings and the
inline vehicle details, with motion graphics and synthesized click and keystroke
sounds (no music).

## Re-rendering

1. Copy the mount pages into the app for the capture, then remove them afterwards
   (they must not ship in the Wix build):

   ```sh
   mkdir -p src/pages/promo src/promo-temp
   cp promo/mount/*.astro src/pages/promo/
   cp promo/mount/*-view.tsx src/promo-temp/
   cp promo/mount/astro.promo.config.mjs ./astro.promo.tmp.mjs
   ```

2. Start the app in local demo mode, with a scratch data file so the tracked
   `.data/` files are not touched:

   ```sh
   CAR_LISTING_DEMO=1 PUBLIC_CAR_LISTING_DEMO=1 \
   CAR_LISTING_DEMO_DATA=/tmp/promo-data/local-demo.json \
   npx astro dev --config astro.promo.tmp.mjs --port 4350
   ```

   `astro.promo.tmp.mjs` leaves out the `@wix/astro` integration, which needs live
   Wix OAuth and returns 500 for every request in local development.

3. Capture and render (`FFMPEG` must point to an ffmpeg build with libx264):

   ```sh
   node promo/capture.mjs
   FFMPEG=/path/to/ffmpeg node promo/render.mjs
   ```

4. Remove the temporary files: `src/pages/promo`, `src/promo-temp`,
   `astro.promo.tmp.mjs` and `promo/build`.

## How it works

- `runtime.js` is injected into each page. It adds the animated cursor, click
  ripples, title and end cards, lower-third captions, page wipes and camera moves.
  It does not change app data or behaviour.
- `capture.mjs` drives the app with Playwright, records screencast frames over CDP,
  and logs every click and keystroke on the same clock as the frames.
- `render.mjs` builds the frame timeline from the real capture timestamps, makes
  the click and key sounds at the logged times, and muxes everything into the MP4.
