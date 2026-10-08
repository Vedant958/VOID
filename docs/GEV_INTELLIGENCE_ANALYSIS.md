# GOD'S EYE VIEW (GEV) — SYSTEM ARCHITECTURE & INTELLIGENCE FEEDS ANALYSIS

> **Extracted Dossier & Reverse-Engineering Report**  
> **Source Platform:** *God's Eye View* (`gods-eye-view`) by Bilawal Sidhu  
> **Target Integration:** VOID Tactical Intelligence Console (`MOD_02 // GOD'S EYE` & `DATASYS`)  
> **Date:** September 2026

---

## 1. Executive Summary & Core Tech Stack

*God's Eye View* is a high-performance, browser-based real-time geospatial intelligence (GEOINT / OSINT) console. It aggregates live worldwide defense, aerospace, maritime, weather, and environmental data onto photorealistic 3D globes with hands-free voice control and multimodal telemetry.

### Core Dependencies & Infrastructure

| Component | Library / Engine | Purpose & Capability |
| :--- | :--- | :--- |
| **3D Rendering** | `cesium` (`^1.124.0`), `vite-plugin-cesium` | Photorealistic 3D Tiles, WGS-84 ellipsoid, Google 3D Earth Tiles |
| **Orbital Ephemeris**| `satellite.js` (`^6.0.2`) | Real-time SGP4 orbital propagation, TLE propagation, ECI/ECEF coordinates |
| **Video Streaming** | `hls.js` (`^1.7.3`) | Low-latency HTTP Live Streaming (HLS / m3u8) for traffic cameras |
| **Vector Geometry** | `@mapbox/vector-tile`, `pbf` | High-speed binary protobuf tile parsing for vector features |
| **Radio / SDR** | `@jtarrio/webrtlsdr` (`^3.0.6`) | Browser-native WebRTC RTL-SDR & WebSDR radio signal interception |
| **Weather/GRIB** | `@meri-imperiumi/eccodes-wasm` | WebAssembly GRIB2 meteorological weather grid decoding |
| **Geodesy & Grid** | `egm96-universal`, `mgrs` | Military Grid Reference System (MGRS) & Earth Gravitational Model |
| **Reactive State** | `@jtarrio/signals` (`^0.10.0`) | Fine-grained reactive state management without UI framework overhead |

---

## 2. Complete Intelligence Layers & Public Endpoints

The package exposes modular layers covering virtually all domains of open-source spatial intelligence:

```
├── AIRSPACE & AEROSPACE
│   ├── ADS-B Flights (OpenSky Network & adsb.lol)
│   ├── Military Air Operations & Ingestion (/layers/military)
│   ├── Space Operations: Satellites, Constellations, Rocket Launches
├── MARITIME & NAVAL
│   ├── AIS Vessel Tracking & Global Ingestion (/layers/vessels)
│   ├── Submarine Fiber-Optic Communications Cables (bundled & live)
├── INFRASTRUCTURE & RECON
│   ├── CCTV Traffic & Surveillance Proxy (TfL, Caltrans, TxDOT, Street View)
│   ├── ALPR (Automatic License Plate Recognition feeds)
│   ├── Military Bases & Strategic Installations (Overpass / OSM query)
│   ├── GBFS Bikeshare & Micromobility Networks
│   ├── Transit (GTFS Realtime / Multimodal Transit Proxy)
├── ENVIRONMENTAL & DISASTER SURVEILLANCE
│   ├── NOAA NHC / CPHC Tropical Cyclones & Hurricane Forecast Cones
│   ├── NIFC WFIGS Interagency Active Wildfire Perimeters
│   ├── NASA FIRMS Active Thermal Anomalies (MODIS / VIIRS Fire Data)
│   ├── Global Earthquakes (USGS real-time seismic feeds)
└── SIGNALS & RADIO
    ├── WebSDR / RTL-SDR Radio Interception
    ├── Radio-Browser worldwide live audio streams
```

---

## 3. Deep Dive: CCTV & Ground Surveillance Architecture

### Architecture Overview (`server/providers/cctv.js`)
The CCTV subsystem acts as a resilient proxy server with a **3-tier graceful degradation pipeline**:
1. **Tier 1 — Live Stream / Upstream Snapshot:** Direct query to state/municipal DOTs (Caltrans, TxDOT, TfL JamCams, NSW). Supports live HLS (`.m3u8` with lease management) and MJPEG/JPEG snapshots.
2. **Tier 2 — Google Street View Fallback:** If live upstream fails or has no snapshot, server issues an IP-restricted server-side query to the Google Street View Static API with heading, FOV, and pitch matching the camera's orientation.
3. **Tier 3 — Synthetic Tactical SVG Testcard:** If all external sources fail or lack keys, generates a zero-dependency SVG testcard featuring live UTC timestamp, scanlines, crosshairs, camera ID, and tactical warning banner.

### API Routes Exposed

| Endpoint | Method | Functionality |
| :--- | :--- | :--- |
| `/api/cctv/sources` | `GET` | Catalog of all registered cameras (ID, GPS, heading, pitch, FOV, feedType) |
| `/api/cctv/health` | `GET` | Health/status monitor per camera (`ok`, `degraded`, `upstream`, `synthetic`) |
| `/api/cctv/stream/:id` | `GET` | Stream metadata (feedType, mediaUrl, frameUrl, provider) |
| `/api/cctv/media/:id` | `GET/DEL` | Proxies live video stream (HLS segment puller with session lease) |
| `/api/cctv/frame/:id` | `GET` | Returns single frame with full 3-tier fallback chain |

### Security & Optimization Patterns
* **SSRF Protection:** Client can *never* pass arbitrary URLs via query parameters; all upstream endpoints are verified and retrieved strictly from the server-side catalog.
* **Range Sanitization:** Custom `sanitizeCctvRangeHeader` prevents byte-range exploit vectors.
* **Downstream Abort Signal:** Client disconnects immediately cancel in-flight upstream fetches to save bandwidth.

---

## 4. Deep Dive: NOAA Tropical Cyclone & Hurricane Engine

### Upstream Sources (`server/providers/cyclones.js`)
* **Primary Status Feed (JSON):**  
  `https://www.nhc.noaa.gov/CurrentStorms.json` (Refreshed every 5 min)
* **GIS MapServer (ArcGIS REST):**  
  `https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer`
  - **Layer 5 (`points`):** Forecast Points (coordinates, forecast hour `tau`, max wind kt, gust kt)
  - **Layer 6 (`track`):** LineString historical and forecasted storm track
  - **Layer 7 (`cone`):** MultiPolygon 5-day cone of uncertainty

### Parsed Telemetry Schema
```json
{
  "id": "al012024",
  "name": "BERYL",
  "classification": "HURRICANE",
  "basin": "AL",
  "position": { "longitude": -65.4, "latitude": 13.8 },
  "windKt": 130,
  "pressureHpa": 938,
  "movement": { "directionDegrees": 290, "speedKt": 18 },
  "advisoryNumber": "14A",
  "forecastPoints": [
    { "position": { "longitude": -67.2, "latitude": 14.5 }, "tauHours": 12, "windKt": 125, "gustKt": 150 }
  ],
  "track": { "type": "LineString", "coordinates": [...] },
  "cone": { "type": "Polygon", "coordinates": [...] }
}
```

### Safety & Resilience
* Strict coordinate range validation (`|lat| <= 90`, `|lon| <= 180`).
* Coordinate budget ceiling (maximum 25,000 vertices per payload) to prevent client WebGL freezing.
* Cache TTL: 5 minutes live; falls back to cached data up to 12 hours if NOAA servers are unreachable.

---

## 5. Deep Dive: NIFC Active Wildfire Perimeters & InciWeb

### Upstream Sources (`server/providers/fire-perimeters.js`)
* **NIFC WFIGS Interagency Fire Perimeters (ArcGIS REST):**  
  `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query`
* **Query Parameters:**
  - `where=1=1`
  - `outSR=4326` (WGS84 Lat/Lon)
  - `maxAllowableOffset=0.001` (Trades ~100m vertex resolution to reduce GeoJSON payload from ~40MB to ~1MB)
  - `outFields`: `poly_IncidentName`, `attr_IncidentSize`, `attr_PercentContained`, `attr_POOState`, `attr_FireDiscoveryDateTime`, `attr_TotalIncidentPersonnel`, `attr_EstimatedCostToDate`

### InciWeb Scraper Fallback
* `https://inciweb.wildfire.gov/api/single-publication/`
* Scrapes incident HTML for `og:updated_time` and `Date of Origin` timestamps to provide incident status tracking.

---

## 6. Actionable Integration Blueprint for VOID

These patterns and public endpoints can be directly imported into VOID (`eyes.html` and `datasys.html`) with zero API key dependencies:

### Immediate High-Value Features for VOID:
1. **NOAA Cyclone Layer on 3D Earth:**
   - Query `https://www.nhc.noaa.gov/CurrentStorms.json` directly from client.
   - Render storm centers with swirling red/orange radar reticles, pulsing eye indicators, and wind-speed tags.
2. **NIFC Global Wildfire Perimeters & FIRMS:**
   - Fetch WFIGS GeoJSON polygons with `maxAllowableOffset=0.001`.
   - Render glowing thermal orange wireframes over active burn areas on the 3D globe.
3. **Multi-Camera CCTV Ground Network:**
   - Scale our 5 ground recon nodes to 25+ worldwide nodes using verified endpoints:
     - London: `https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/`
     - Caltrans D7 (LA): `https://cwwp2.dot.ca.gov/data/d7/cctv/`
     - Austin Mobility: `https://cctv.austinmobility.io/image/`
     - NYC DOT: Open Traffic snapshot endpoints
     - Live Traffic NSW (Australia)
4. **Synthetic CRT Testcard Pattern:**
   - Keep the generated SVG testcard as our universal fallback whenever an external CCTV feed has CORS or latency issues.
