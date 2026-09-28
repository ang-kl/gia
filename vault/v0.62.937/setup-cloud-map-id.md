# Setting up the Cloud Map ID

> **Status:** v0.30.9 (01-05 '26 SGT). Closes outstanding-list item L.

The Sanctuary Map TMA at `/app/map` uses Google Maps JS API with a Cloud Map ID for vector styling. Without one, the map renders but with default raster tiles — functional but not branded.

This is a **one-time, ~3-minute** setup in Google Cloud Console. After it's done, soleat picks up the change automatically on the next request.

---

## Step-by-step

### 1. Open Google Cloud Console → Maps Platform → Map Management

Direct link: https://console.cloud.google.com/google/maps-apis/studio/maps

Sign in with the same account that owns your `GOOGLE_MAPS_API_KEY`.

### 2. Click "Create Map ID"

Pick:

- **Map name:** `soleat-sanctuary` (or anything memorable)
- **Map type:** **JS** (JavaScript)
- **Raster or vector:** **Vector** (required for AdvancedMarkerElement)

Click "Save".

### 3. Copy the Map ID string

It looks like `a1b2c3d4e5f6g7h8`. **Copy this.**

### 4. (Optional) Apply a custom map style

In the same Map Management page → click your new Map ID → "Map Style" tab → either:
- Pick a preset (e.g. "Aubergine", "Silver"), or
- Click "Customize" → start from a preset → tweak colors

For soleat's solo-female-diner aesthetic, recommend something like **Aubergine** or **Silver** with low POI density and de-emphasised highways.

Save the style.

### 5. Set the env var in Railway

Railway → soleat service → **Variables** → add:

```
MAP_ID=<the Map ID string from step 3>
```

Save → auto-redeploys.

### 6. Verify

Railway logs should show:

```
[Boot] MAP_ID configured: a1b2c3d4e5f6g7h8…
```

(Instead of the prior warning `MAP_ID env var unset — Sanctuary Map TMA will render with default Google Maps styling`.)

Open `/app/map` in the bot — the map should now render with your custom style (and AdvancedMarkerElement pins remain pin-shaped instead of falling back to default markers).

---

## Cost

**Free.** Map IDs and Map Styles are at no charge. Maps Platform billing is based on map loads + Places API calls — same regardless of whether a Map ID is registered.

## What if MAP_ID is wrong?

Google Maps JS will throw `InvalidMapId` in the browser console and render a blank tile. Server-side at `/maps-key`, the response carries `mapIdSource: 'env:MAP_ID'` so we know we tried; the actual validity check happens client-side at map-load time.

If you see a blank map, double-check the Map ID is for **JS Vector** type (not Android/iOS Vector or Raster).

## Removing the Map ID

To revert: Railway → Variables → delete `MAP_ID`. Auto-redeploys. Logs revert to `MAP_ID env var unset — using placeholder…` and `/app/map` falls back to the un-branded default style.
