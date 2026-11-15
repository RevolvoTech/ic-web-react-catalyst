# Nanga Parbat offline basemap

This regional Protomaps vector archive contains OpenStreetMap and Natural Earth
context for longitude 74.35–74.85, latitude 35.05–35.45, zooms 0–14. Its actual
size is 1,601,198 bytes; the brief's approximate 200 MB is not a minimum.

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright),
[Protomaps](https://protomaps.com), Natural Earth.
Distributed under the [Protomaps basemap Produced Work terms](https://docs.protomaps.com/basemaps/downloads)
with [ODbL source data](https://opendatacommons.org/licenses/odbl/1-0/).
The archive retains upstream metadata and attribution. The source dataset is
available from [Protomaps builds](https://maps.protomaps.com/builds/) and
[OpenStreetMap](https://planet.openstreetmap.org/).

See `nanga-parbat.json` for exact source time, coverage, size and SHA-256.
Rebuild with the official `pmtiles` CLI (1.31.2 was used):

```text
pmtiles extract https://build.protomaps.com/20261114.pmtiles nanga-parbat.pmtiles --bbox=74.35,35.05,74.85,35.45 --maxzoom=14 --download-threads=4
pmtiles verify nanga-parbat.pmtiles
```

Daily source URLs expire; select an available build before regenerating. Update
the manifest and its checksum after rebuilding. This is a vector context map,
not an offline elevation DEM or evidence of field readiness. Do not download
public OpenStreetMap tile-server imagery in bulk.
