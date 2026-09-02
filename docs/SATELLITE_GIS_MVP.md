# Satellite GIS MVP

## What is live

The `/demo` console searches the Copernicus Data Space Sentinel-2 Level-2A
catalogue through the Catalyst TypeScript backend. The browser receives a
validated `catalyst.satellite.catalog.v1` response containing acquisition time,
cloud cover, snow cover, ground sampling, platform, footprint, preview, source,
and attribution.

This is separate from the GPS connection-state lab below it. GPS states remain
simulated until a real tracking device or feed is selected.

## Request flow

```text
Browser
  -> /api/satellite/catalog or /api/satellite/render
  -> CATALYST_BACKEND_URL/api/v1/gis/satellite/*
  -> Copernicus Data Space
```

The website never receives Copernicus OAuth credentials. The public catalogue
works without credentials. Processed true-colour PNG rendering requires
`COPERNICUS_CLIENT_ID` and `COPERNICUS_CLIENT_SECRET` on the backend.

## Current development defaults

- Area: `76.48,35.70,76.56,35.78` (temporary Karakoram development AOI)
- Date range: latest 60 days
- Maximum cloud cover: 30%
- Collection: Sentinel-2 Level-2A
- MVP target: 20–50 m operational display, with provider source sampling shown

Replace the AOI with the client's route or GPX before the pilot is presented as
their expedition. Imagery is planning and awareness context; it must not be
described as proving a route or hazard safe.

## Technology roles

- ArcGIS Maps SDK for JavaScript renders the interactive global 3D scene and
  world elevation. It is loaded from Esri's CDN only on the GIS surface.
- PostgreSQL + PostGIS will store expedition, route, camp, waypoint, and spatial
  records.
- Copernicus supplies free satellite observations.
- QGIS Desktop is optional for analyst authoring and inspection; it is not the
  website frontend and QGIS Server is not required for this MVP.
- Higher-resolution Planet or Maxar data can be added behind the same Catalyst
  API contract in a paid tier.
