# GOD'S EYE VIEW — CORE ARCHITECTURE & 3D RENDERING BUNDLE

> **Consolidated Architecture Specification and Core Implementation**  
> **Source Repository:** `gods-eye-view`  
> **Target:** 3D Globe Viewport, Camera Kinematics, Google 3D Tiles, CCTV Ground Projection & Video Streaming Pipelines.

---

## Architecture Overview

```
                                  ┌────────────────────────┐
                                  │       index.html       │
                                  └───────────┬────────────┘
                                              │
                                  ┌───────────▼────────────┐
                                  │      src/main.js       │
                                  └───────────┬────────────┘
                                              │
                              ┌───────────────▼───────────────┐
                              │  src/standalone/application.js│
                              └───────────────┬───────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
           ┌──────────▼──────────┐                         ┌──────────▼──────────┐
           │   src/app/scene.js  │                         │ src/app/application │
           └──────────┬──────────┘                         └─────────────────────┘
                      │
        ┌─────────────┴─────────────────────────┐
        │                                       │
┌───────▼──────────────┐             ┌──────────▼──────────┐
│  src/app/viewer.js   │             │ src/maps/controller │
│  (CesiumJS Engine)   │             │ (MapStackController)│
└───────┬──────────────┘             └──────────┬──────────┘
        │                                       │
        ├──────────────────────┬────────────────┘
        │                      │
┌───────▼──────────────┐ ┌─────▼────────────────┐
│  Google 3D Tiles /   │ │  Camera Controllers   │
│  Esri / OSM / Terrain│ │  (Orbit / Preset /    │
└──────────────────────┘ │   Kinematic Verbs)   │
                         └─────┬────────────────┘
                               │
                     ┌─────────▼─────────────────┐
                     │   CCTV Rendering Engine   │
                     │  - Billboards (Markers)   │
                     │  - Frustum Geometry Math  │
                     │  - 3D Monitor Planes      │
                     │  - HLS.js Live Video Mesh │
                     └───────────────────────────┘
```

---

## Table of Contents

1. [Dependencies & Build Configuration](#1-dependencies--build-configuration)
   - `package.json`
   - `vite.config.js`
   - `build/vite.js`
2. [Main Entry Points & UI Theming](#2-main-entry-points--ui-theming)
   - `index.html`
   - `style.css`
   - `src/ui/styles/foundation.css`
   - `src/main.js`
   - `src/standalone/application.js`
   - `src/app/application.js`
3. [3D Globe & Map Viewport Implementation](#3-3d-globe--map-viewport-implementation)
   - `src/app/viewer.js`
   - `src/app/scene.js`
   - `src/maps/google3d.js`
   - `src/maps/controller.js`
   - `src/mapStackController.js`
   - `src/maps/defaultSources.js`
   - `src/maps/imagery.js`
   - `src/maps/terrain.js`
4. [Camera Flight, Zoom & Orbital Navigation](#4-camera-flight-zoom--orbital-navigation)
   - `src/camera.js`
   - `src/orbit.js`
   - `src/worldFocus.js`
   - `src/cctvFocusPolicy.js`
   - `src/layers/cctv/navigation.js`
   - `src/cameraVerbs.js` (Essential Verbs & Route Flight)
5. [CCTV & Marker Spatial Rendering Pipeline](#5-cctv--marker-spatial-rendering-pipeline)
   - `src/layers/cctv/lifecycle.js`
   - `src/layers/cctv/geometry.js`
   - `src/layers/cctv/ground.js`
   - `src/layers/cctv/rendering.js`
   - `src/layers/cctv/projection.js`
   - `src/layers/cctv/videoPlayback.js`
   - `src/layers/cctv/selection.js`
   - `src/layers/cctv/cards.js`

---

## 1. Dependencies & Build Configuration

### Path: package.json
```json
{
  "name": "gods-eye-view",
  "private": true,
  "version": "0.1.1",
  "description": "A real-time intelligence console for planet Earth — photorealistic 3D globe, live aircraft/ships/satellites/earthquakes/CCTV, and hands-free voice control. Runs in a browser.",
  "type": "module",
  "license": "MIT",
  "author": "Bilawal Sidhu",
  "homepage": "https://github.com/bilawalsidhu/gods-eye-view#readme",
  "engines": {
    "node": ">=24.14.0 <25 || >=26 <27"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node scripts/run-unit-tests.mjs"
  },
  "dependencies": {
    "@jtarrio/signals": "^0.10.0",
    "@jtarrio/webrtlsdr": "^3.0.6",
    "@mapbox/vector-tile": "^3.0.0",
    "@meri-imperiumi/eccodes-wasm": "^2.48.2",
    "cesium": "^1.124.0",
    "egm96-universal": "^1.1.1",
    "hls.js": "^1.7.3",
    "mgrs": "^2.1.0",
    "pbf": "^5.1.2",
    "satellite.js": "^6.0.2"
  },
  "devDependencies": {
    "prettier": "3.9.6",
    "puppeteer": "^25.10.0",
    "sharp": "^0.35.4",
    "vite": "^6.0.0",
    "vite-plugin-cesium": "^1.2.23",
    "ws": "^8.21.0"
  }
}
```

---

### Path: vite.config.js
```javascript
export { default } from './server/standalone/vite.config.js';
export * from './server/providers/local.js';
```

---

### Path: build/vite.js
```javascript
import { applicationHtmlPlugin } from './application-html.js';
import cesium from 'vite-plugin-cesium';

/** Build browser assets with explicit inputs; never load environment or providers. */
export function createBrowserViteConfig({
  plugins = [],
  publicDir,
  googleApiKey,
  cesiumToken,
  host = 'localhost',
  port = 4173,
  command,
} = {}) {
  return {
    plugins: [cesium(), applicationHtmlPlugin(), ...plugins],
    ...(publicDir === undefined ? {} : { publicDir }),
    ...(command === 'build' ? { cacheDir: 'node_modules/.vite-build' } : {}),
    optimizeDeps: {
      include: [
        '@jtarrio/signals/demod/demodulator.js',
        '@jtarrio/signals/demod/modes.js',
        '@jtarrio/webrtlsdr/rtlsdr.js',
        'egm96-universal',
      ],
    },
    server: {
      host: host || 'localhost',
      port: parseInt(port, 10) || 4173,
      allowedHosts:
        host === '0.0.0.0' || host === '::'
          ? true
          : ['localhost', '127.0.0.1', '.local'],
      fs: {
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/ENVIRONMENT'],
      },
      headers: {
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "frame-ancestors 'none'",
      },
    },
    define: {
      'import.meta.env.GOOGLE_MAPS_API_KEY': JSON.stringify(googleApiKey),
      'import.meta.env.CESIUM_ION_TOKEN': JSON.stringify(cesiumToken),
    },
    build: { chunkSizeWarningLimit: 1500 },
  };
}
```

---

## 2. Main Entry Points & UI Theming

### Path: index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>God's Eye View</title>
  <link rel="icon" type="image/svg+xml" href="/logo.svg" />
  <link rel="stylesheet" href="/style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0&icon_names=adjust,arrow_drop_down,arrow_forward,arrow_left,arrow_right,bolt,chevron_left,chevron_right,close,close_fullscreen,dark_mode,draw,east,flare,flight,layers_clear,light_mode,local_fire_department,my_location,navigation,normal,on,open_in_full,public,radar,radio,right_panel_close,right_panel_open,rocket_launch,skip_next,skip_previous,view_in_ar" rel="stylesheet" />
</head>
<body>
  <!-- Container where Cesium mounts WebGL canvas -->
  <div id="cesiumContainer"></div>

  <!-- Loading Splash Screen -->
  <div id="loading-screen">
    <div class="loader-status">Initializing God's Eye View...</div>
  </div>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

---

### Path: style.css
```css
/* Preserve component and responsive rule order in one stylesheet entry. */
@import './src/ui/styles/foundation.css';
@import './src/ui/styles/controls.css';
@import './src/ui/styles/location.css';
@import './src/ui/styles/status.css';
@import './src/ui/styles/cockpit.css';
@import './src/ui/styles/overlays.css';
@import './src/ui/styles/layers.css';
@import './src/ui/styles/radio.css';
@import './src/ui/styles/cctv.css';
@import './src/ui/styles/scenes.css';
@import './src/ui/styles/bhote-koshi.css';
@import './src/ui/styles/recent-imagery.css';
@import './src/ui/styles/recording.css';
@import './src/ui/styles/responsive.css';
@import './src/ui/styles/command-dock.css';
@import './src/ui/styles/command-dock-compact.css';
@import './src/ui/styles/command-dock-trays.css';
@import './src/ui/styles/command-dock-sliding.css';
@import './src/ui/styles/voice-cost.css';
@import './src/ui/styles/first-run.css';
@import './src/ui/styles/provider-settings.css';
@import './src/ui/styles/weather.css';
@import './src/ui/styles/cyber.css';
```

---

### Path: src/ui/styles/foundation.css (Excerpt)
```css
/* ═══════════════════════════════════════════════
   GOD'S EYE VIEW — Dark Sci-Fi UI
   Apple meets Blade Runner
   ═══════════════════════════════════════════════ */

:root {
  --bg-dark: #0a0a0f;
  --glass-bg: rgba(12, 12, 20, 0.72);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.15);
  --accent: #00d4ff;
  --accent-dim: rgba(0, 212, 255, 0.15);
  --accent-glow: rgba(0, 212, 255, 0.4);
  --text-primary: #e8eaed;
  --text-secondary: rgba(232, 234, 237, 0.5);
  --text-dim: rgba(232, 234, 237, 0.3);
  --menu-bg: #12121c;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --panel-radius: 16px;
  --btn-radius: 10px;
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-smooth: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-dark);
  font-family: var(--font-sans);
}

#cesiumContainer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}
```

---

### Path: src/main.js
```javascript
import { createStandaloneApplication } from './standalone/application.js';
import { describeError } from './standalone/errors.js';

const application = createStandaloneApplication({
  googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
  cesiumToken: import.meta.env.CESIUM_ION_TOKEN,
  allowQaRegistration: import.meta.env.DEV,
});

application.start().catch((error) => {
  console.error("God's Eye View initialization failed:", error);
  const loaderStatus = document.querySelector('#loading-screen .loader-status');
  if (loaderStatus) {
    loaderStatus.textContent = `Error: ${describeError(error)}`;
    loaderStatus.style.color = '#ff4444';
  }
});

export { application };
```

---

### Path: src/standalone/application.js
```javascript
import { createStandaloneCatalog } from './catalog.js';
import { createStandalonePlaceSearch } from './placeSearch.js';
import { CITY_POIS } from '../locations.js';
import { createApplication } from '../app/application.js';
import { createStandaloneScene } from './scene.js';
import { createStandaloneControls } from './controls.js';
import { createStandaloneData } from './data.js';
import { createStandaloneTools } from './tools.js';

let constructed = false;

/** Compose the standalone application once per page. Reload to start again. */
export function createStandaloneApplication({
  googleApiKey,
  cesiumToken,
  geospatial = {},
  voice = {},
  allowQaRegistration = false,
}) {
  if (constructed)
    throw new Error('The standalone application already owns this page');
  constructed = true;
  const loadingScreen = document.getElementById('loading-screen');
  const loaderStatus = loadingScreen ? loadingScreen.querySelector('.loader-status') : { textContent: '' };
  let placeSearch;
  let catalog;
  return createApplication({
    createScene: async (context) => {
      placeSearch = createStandalonePlaceSearch({
        presets: CITY_POIS,
        ...geospatial,
        resolveApiKey: () => googleApiKey,
        signal: context.signal,
      });
      const scene = await createStandaloneScene({
        ...context,
        googleApiKey,
        cesiumToken,
        loaderStatus,
      });
      catalog = createStandaloneCatalog({
        nepalBoundaryResolver: (signal) =>
          scene.operations.annotationResolver.resolveRegionRingForQuery(
            'Nepal',
            signal,
            placeSearch,
            { budgetMs: Infinity },
          ),
        signal: context.signal,
        surface: scene.operations.surface,
      });
      return scene;
    },
    createControls: (context) =>
      createStandaloneControls({
        ...context,
        loaderStatus,
        placeSearch,
        catalog,
      }),
    createData: (context) =>
      createStandaloneData({ ...context, allowQaRegistration, catalog }),
    createTools: (context) =>
      createStandaloneTools({ ...context, loadingScreen, placeSearch, voice }),
  });
}
```

---

### Path: src/app/application.js
```javascript
const START_ORDER = ['scene', 'controls', 'data', 'tools'];
const STOP_ORDER = ['tools', 'controls', 'data', 'scene'];

/**
 * Own application startup and teardown without importing an application entry.
 * Constructors receive earlier components, an AbortSignal and defer(cleanup).
 * Register cleanup immediately after acquiring each resource, before any await.
 */
export function createApplication({
  createScene,
  createControls,
  createData,
  createTools,
}) {
  const factories = {
    scene: createScene,
    controls: createControls,
    data: createData,
    tools: createTools,
  };
  for (const phase of START_ORDER) {
    if (typeof factories[phase] !== 'function')
      throw new TypeError(`Missing ${phase} constructor`);
  }
  const controller = new AbortController();
  const cleanups = Object.fromEntries(START_ORDER.map((phase) => [phase, []]));
  const components = {};
  const listeners = new Set();
  let state = Object.freeze({ status: 'created', phase: null });
  let startPromise;
  let destroyPromise;
  let cleanupPromise;

  function publish(status, phase = null) {
    state = Object.freeze({ status, phase });
    for (const listener of [...listeners]) {
      try {
        listener(state);
      } catch {
        console.error('Application state listener failed');
      }
    }
  }

  function cleanup() {
    cleanupPromise ||= Promise.resolve().then(async () => {
      const errors = [];
      for (const phase of STOP_ORDER) {
        while (cleanups[phase].length) {
          try {
            await cleanups[phase].pop()();
          } catch (error) {
            errors.push(error);
          }
        }
        delete components[phase];
      }
      if (errors.length)
        throw new AggregateError(errors, 'Application cleanup failed');
    });
    return cleanupPromise;
  }

  async function initialize() {
    try {
      for (const phase of START_ORDER) {
        controller.signal.throwIfAborted();
        publish('starting', phase);
        controller.signal.throwIfAborted();
        let acceptingCleanup = true;
        try {
          components[phase] = await factories[phase]({
            ...components,
            signal: controller.signal,
            defer(dispose) {
              if (!acceptingCleanup || typeof dispose !== 'function') {
                throw new TypeError('Register cleanup during component construction');
              }
              cleanups[phase].push(dispose);
            },
          });
        } finally {
          acceptingCleanup = false;
        }
        controller.signal.throwIfAborted();
      }
      publish('ready');
      controller.signal.throwIfAborted();
      return Object.freeze({ ...components });
    } catch (error) {
      controller.abort();
      let failure = error;
      try {
        await cleanup();
      } catch (cleanupError) {
        failure = new AggregateError([error, cleanupError], 'Application startup and cleanup failed');
      }
      if (!destroyPromise) publish('failed');
      throw failure;
    }
  }

  return Object.freeze({
    start() {
      if (destroyPromise) return Promise.reject(new Error('Application has been destroyed'));
      startPromise ||= Promise.resolve().then(initialize);
      return startPromise;
    },
    destroy() {
      if (destroyPromise) return destroyPromise;
      destroyPromise = Promise.resolve().then(async () => {
        try {
          await startPromise?.catch(() => {});
          await cleanup();
          publish('destroyed');
        } catch (error) {
          publish('failed');
          throw error;
        } finally {
          listeners.clear();
        }
      });
      controller.abort();
      publish('destroying');
      return destroyPromise;
    },
    getState: () => state,
    getComponents: () => Object.freeze({ ...components }),
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Expected a state listener');
      if (state.status === 'destroyed') return () => {};
      listeners.add(listener);
      try { listener(state); } catch { console.error('Application state listener failed'); }
      return () => listeners.delete(listener);
    },
  });
}
```

---

## 3. 3D Globe & Map Viewport Implementation

### Path: src/app/viewer.js
```javascript
import * as Cesium from 'cesium';
import { applyModelAtmosphereWorkaround } from './atmosphereCompat.js';

const PINCH_ZOOM_MULTIPLIER = 8;
const MAX_PINCH_PIXEL_DELTA = 120;

function boundedPinchDelta(delta) {
  if (!Number.isFinite(delta) || delta === 0) return delta;
  return (
    Math.sign(delta) *
    Math.min(Math.abs(delta) * PINCH_ZOOM_MULTIPLIER, MAX_PINCH_PIXEL_DELTA)
  );
}

/**
 * Add browser trackpad pinch to Cesium's zoom inputs and return its disposer.
 * Browsers expose this gesture as a small pixel-mode Ctrl+wheel event.
 */
export function installTrackpadPinchZoom(
  viewer,
  { createWheelEvent = (type, init) => new WheelEvent(type, init) } = {},
) {
  const controller = viewer?.scene?.screenSpaceCameraController;
  const container = viewer?.container;
  const canvas = viewer?.canvas;
  if (!controller || !container || !canvas)
    throw new TypeError('A complete Cesium viewer is required');

  const originalZoomEventTypes = controller.zoomEventTypes;
  const zoomEventTypes = Array.isArray(originalZoomEventTypes)
    ? originalZoomEventTypes
    : originalZoomEventTypes === undefined
      ? []
      : [originalZoomEventTypes];
  const alreadyHandlesControlWheel = zoomEventTypes.some(
    (binding) =>
      binding?.eventType === Cesium.CameraEventType.WHEEL &&
      binding?.modifier === Cesium.KeyboardEventModifier.CTRL,
  );
  const configuredZoomEventTypes = alreadyHandlesControlWheel
    ? originalZoomEventTypes
    : [
        ...zoomEventTypes,
        {
          eventType: Cesium.CameraEventType.WHEEL,
          modifier: Cesium.KeyboardEventModifier.CTRL,
        },
      ];
  if (!alreadyHandlesControlWheel)
    controller.zoomEventTypes = configuredZoomEventTypes;

  const relayedEvents = new WeakSet();
  const relayPinch = (event) => {
    if (
      !event.ctrlKey ||
      relayedEvents.has(event) ||
      event.deltaMode !== 0 ||
      !Number.isFinite(event.deltaY) ||
      event.deltaY === 0
    )
      return;
    let relayed;
    try {
      relayed = createWheelEvent('wheel', {
        deltaX: event.deltaX,
        deltaY: boundedPinchDelta(event.deltaY),
        deltaZ: event.deltaZ,
        deltaMode: event.deltaMode,
        screenX: event.screenX,
        screenY: event.screenY,
        clientX: event.clientX,
        clientY: event.clientY,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
        view: globalThis.window,
      });
    } catch {
      return;
    }
    relayedEvents.add(relayed);
    event.preventDefault();
    event.stopPropagation();
    canvas.dispatchEvent(relayed);
  };
  container.addEventListener('wheel', relayPinch, {
    capture: true,
    passive: false,
  });

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    container.removeEventListener('wheel', relayPinch, true);
    if (
      !alreadyHandlesControlWheel &&
      controller.zoomEventTypes === configuredZoomEventTypes
    )
      controller.zoomEventTypes = originalZoomEventTypes;
  };
}

/** Create the standard globe viewer in caller-owned, visible containers. */
export function createApplicationViewer({ container, creditContainer }) {
  if (!container || !creditContainer)
    throw new TypeError('Viewer and credit containers are required');
  const viewer = new Cesium.Viewer(container, {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    vrButton: false,
    selectionIndicator: false,
    infoBox: false,
    baseLayer: false,
    creditContainer,
    msaaSamples: 4,
    contextOptions: { webgl: { preserveDrawingBuffer: true } },
  });
  try {
    viewer.targetFrameRate = 60;
    // Metal shader link bug fix for model vertex atmosphere
    applyModelAtmosphereWorkaround(viewer.scene);
    viewer.scene.globe.show = false;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = 18;
    viewer.scene.skyAtmosphere.saturationShift = -0.12;
    viewer.scene.skyAtmosphere.brightnessShift = -0.08;
    return viewer;
  } catch (error) {
    viewer.destroy();
    throw error;
  }
}
```

---

### Path: src/app/scene.js
```javascript
import { createApplicationOperations } from './operations.js';
import * as Cesium from 'cesium';
import {
  createApplicationViewer,
  installTrackpadPinchZoom,
} from '../app/viewer.js';
import { registerDataCredits } from '../data/dataCredits.js';
import { configureCreditKeyboardAccess } from '../creditKeyboard.js';
import { MapStackController } from '../mapStackController.js';
import { loadPhotorealisticTileset } from '../mapStartup.js';
import { initLogoGaze } from '../logoGaze.js';
import {
  uninstallRenderGovernor,
  governorRequestRender,
} from '../renderGovernor.js';
import { describeError } from './errors.js';

/** Construct the application globe using the caller's local configuration. */
export async function createApplicationScene({
  requestServices,
  googleApiKey,
  cesiumToken,
  credits,
  MapController = MapStackController,
  mapOptions = {},
  loaderStatus,
  signal,
  defer,
}) {
  const operations = createApplicationOperations({
    requests: requestServices,
    signal,
  });
  defer(initLogoGaze());
  const previousKey = window.__GOOGLE_MAPS_API_KEY__;
  if (googleApiKey) {
    window.__GOOGLE_MAPS_API_KEY__ = googleApiKey;
    defer(() => {
      if (window.__GOOGLE_MAPS_API_KEY__ !== googleApiKey) return;
      if (previousKey === undefined) delete window.__GOOGLE_MAPS_API_KEY__;
      else window.__GOOGLE_MAPS_API_KEY__ = previousKey;
    });
  }
  loaderStatus.textContent = 'Configuring viewer...';
  const creditContainer = document.createElement('div');
  creditContainer.id = 'cesium-credits';
  document.body.appendChild(creditContainer);
  defer(() => creditContainer.remove());

  const viewer = createApplicationViewer({
    container: 'cesiumContainer',
    creditContainer,
  });
  defer(() => {
    uninstallRenderGovernor(viewer);
    if (!viewer.isDestroyed()) viewer.destroy();
  });
  defer(installTrackpadPinchZoom(viewer));
  registerDataCredits(viewer, credits);
  configureCreditKeyboardAccess(document);

  loaderStatus.textContent =
    googleApiKey || cesiumToken
      ? 'Loading Google 3D Tiles...'
      : 'Loading the keyless globe...';

  const photoreal = await loadPhotorealisticTileset(Cesium, {
    googleApiKey,
    cesiumToken,
  });
  const tileset = photoreal.tileset;

  defer(() => {
    if (tileset && !tileset.isDestroyed()) {
      if (!viewer.scene.primitives.remove(tileset)) tileset.destroy();
    }
  });
  signal.throwIfAborted();

  if (tileset) {
    viewer.scene.primitives.add(tileset);
    // NOTE: Cesium World Terrain intentionally disabled — conflicts with Google 3D Tiles at high zoom.
    // Google Photorealistic 3D Tiles provide their own terrain/elevation.
    viewer.scene.globe.show = false;
    console.info(`[Init] Google 3D Tiles loaded via ${photoreal.route}.`);
  } else {
    if (photoreal.errors.length) {
      const tileError = photoreal.errors.at(-1);
      console.warn('[Init] Google 3D Tiles unavailable, using keyless globe:', tileError);
      const tileErrorDetail = describeError(tileError);
      loaderStatus.textContent = `Google 3D Tiles unavailable (${tileErrorDetail}). Loading keyless globe...`;
    }
    viewer.scene.globe.show = true;
  }

  loaderStatus.textContent = 'Initializing systems...';

  const mapStackController = new MapController(viewer, {
    requestRender: governorRequestRender,
    ...mapOptions,
    googleTileset: tileset,
    cesiumToken,
    initialStack: tileset ? 'photoreal' : 'esri-imagery',
    onChange: (state) => {
      window.dispatchEvent(
        new CustomEvent('gev:map-stack-changed', { detail: state }),
      );
    },
    onError: (message) => console.warn('[MapStack]', message),
  });
  defer(() => mapStackController.destroy());
  await mapStackController.setStack(tileset ? 'photoreal' : 'esri-imagery', {
    silent: true,
  });

  signal.throwIfAborted();
  return { viewer, tileset, mapStackController, operations };
}
```

---

### Path: src/maps/google3d.js
```javascript
const clean = (value) => String(value || '').trim();

/**
 * Decide which map provider can deliver the best startup experience.
 * @param {{googleApiKey?: string, cesiumToken?: string}} credentials
 * @returns {'google-direct'|'google-ion'|'osm'}
 */
export function selectMapStartupRoute({
  googleApiKey = '',
  cesiumToken = '',
} = {}) {
  if (clean(googleApiKey)) return 'google-direct';
  if (clean(cesiumToken)) return 'google-ion';
  return 'osm';
}

/**
 * Load Google Photorealistic 3D Tiles through direct Google access when
 * configured, otherwise through Cesium ion's hosted Google asset.
 */
export async function loadPhotorealisticTileset(
  Cesium,
  { googleApiKey = '', cesiumToken = '' } = {},
) {
  const googleKey = clean(googleApiKey);
  const ionToken = clean(cesiumToken);
  const errors = [];

  const attempts = [];
  if (googleKey) attempts.push({ route: 'google-direct', googleKey });
  if (ionToken) attempts.push({ route: 'google-ion', googleKey: undefined });

  for (const attempt of attempts) {
    try {
      const tileset = attempt.googleKey
        ? await createGoogleDirectTileset(Cesium, attempt.googleKey)
        : await createGoogleIonTileset(Cesium, ionToken);
      return { tileset, route: attempt.route, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  return { tileset: null, route: 'osm', errors };
}

export function createGoogleDirectTileset(Cesium, key) {
  key = clean(key);
  if (!key) throw new Error('Google 3D requires an explicit browser key');
  return Cesium.createGooglePhotorealistic3DTileset(
    { key, onlyUsingWithGoogleGeocoder: true },
    { asynchronouslyLoadImagery: true },
  );
}

export async function createGoogleIonTileset(
  Cesium,
  accessToken,
  { signal } = {},
) {
  accessToken = clean(accessToken);
  if (!accessToken)
    throw new Error('Google 3D through ion requires an explicit token');
  signal?.throwIfAborted();
  const resource = await Cesium.IonResource.fromAssetId(2275207, {
    accessToken,
  });
  signal?.throwIfAborted();
  return Cesium.Cesium3DTileset.fromUrl(resource, {
    cacheBytes: 1536 * 1024 * 1024,
    maximumCacheOverflowBytes: 1024 * 1024 * 1024,
    enableCollision: true,
    asynchronouslyLoadImagery: true,
  });
}
```

---

### Path: src/maps/controller.js
```javascript
import { indexMapSources } from './registry.js';
import * as Cesium from 'cesium';
import { createMapCredits } from './credits.js';
import { acquireImageryComparison } from './imageryComparison.js';

const AUTOMATIC = Symbol('automatic switch');

/** Coordinate source lifetimes and scene changes; the registry owns provider choices. */
export class MapSourceController {
  constructor(
    viewer,
    {
      registry,
      initialStack,
      onChange = null,
      onError = null,
      requestRender = () => viewer?.scene?.requestRender?.(),
      createImageryLayer = (provider) => new Cesium.ImageryLayer(provider),
    },
  ) {
    this.viewer = viewer;
    this._registry = registry;
    this._sources = indexMapSources(registry.sources);
    this._activeId = this.isStackAvailable(initialStack)
      ? initialStack
      : registry.defaultId;
    this._onChange = onChange;
    this._onError = onError;
    this._requestRender = requestRender;
    this._createImageryLayer = createImageryLayer;
    this._credits = createMapCredits(viewer);
    this._abort = new AbortController();
    this._imageryProviders = new Map();
    this._terrainProviders = new Map();
    this._tilesets = new Map();
    this._ownedTilesets = new Set();
    this._disposed = new WeakSet();
    this._switchGen = 0;
    this._switchOrigin = 'manual';
    this._isSwitching = false;
    this._lastError = null;
    this._imageryLayer = null;
    this._activeImageryProvider = null;
    this._removeImageryErrorListener = null;
    this._terrainMode = null;
    this._subscribers = new Set();
    this._destroyed = false;
  }

  isStackAvailable(id) {
    const source = this._sources.get(id);
    return Boolean(source && source.available !== false);
  }

  getStack(id) {
    return this._sources.get(id)?.descriptor || null;
  }

  getStacks() {
    return [...this._sources.values()].map(({ descriptor }) => {
      const stack = descriptor;
      const available = this.isStackAvailable(stack.id);
      return {
        ...stack,
        available,
        unavailableReason: available ? null : this._unavailableReason(stack),
      };
    });
  }

  _unavailableReason(stack) {
    return (
      this._sources.get(stack?.id)?.unavailableReason ||
      `${stack?.label || 'This map stack'} is unavailable`
    );
  }

  getImageryHostTileset() {
    if (this._destroyed) return null;
    for (const source of this._sources.values())
      if (source.tileset?.show === true) return source.tileset;
    for (const tileset of this._ownedTilesets)
      if (tileset.show === true) return tileset;
    return null;
  }

  async setStack(id, { silent = false, [AUTOMATIC]: automatic = false } = {}) {
    if (this._destroyed) return this.getState();
    const stack = this.getStack(id) || this.getStack(this._registry.unknownId);
    if (!stack) return null;
    if (!this.isStackAvailable(stack.id)) {
      const message = this._unavailableReason(stack);
      this._lastError = message;
      this._onError?.(message, stack);
      return this.getState();
    }
    const gen = ++this._switchGen;
    this._switchOrigin = automatic ? 'automatic' : 'manual';
    this._isSwitching = true;
    this._lastError = null;
    if (!silent) this._emitChange('switching');
    try {
      const activation = await this._activate(stack, gen);
      if (gen !== this._switchGen) return this.getState();
      this._activeId = activation?.effectiveStackId || stack.id;
      if (this._activeId !== stack.id) this._switchOrigin = 'automatic';
      if (activation?.fallbackMessage) {
        this._lastError = activation.fallbackMessage;
        this._onError?.(activation.fallbackMessage, stack);
      }
      this._requestRender('map-stack');
      if (!silent) this._emitChange('ready');
    } catch (error) {
      if (gen !== this._switchGen) return this.getState();
      const message = error?.message || String(error);
      this._lastError = message;
      this._onError?.(message, stack);
      const recovery = this.getStack(this._registry.recoveryId);
      if (recovery && recovery.id !== stack.id && this.isStackAvailable(recovery.id)) {
        this._switchOrigin = 'automatic';
        try {
          const activation = await this._activate(recovery, gen);
          if (gen !== this._switchGen) return this.getState();
          this._activeId = activation?.effectiveStackId || recovery.id;
        } catch (recoveryError) {
          if (gen !== this._switchGen) return this.getState();
          this._lastError = recoveryError?.message || String(recoveryError);
          this._onError?.(this._lastError, recovery);
        }
      }
      if (!silent) this._emitChange('error');
    } finally {
      if (gen === this._switchGen) {
        this._isSwitching = false;
        this._notifySubscribers();
      }
    }
    return this.getState();
  }

  _activate(stack, gen) {
    const source = this._sources.get(stack.id);
    return source.imagery
      ? this._activateGlobeStack(stack, gen)
      : this._activateTileset(source, gen);
  }

  async _activateTileset(source, gen) {
    let tileset = source.tileset;
    if (!tileset) {
      if (!source.createTileset)
        throw new Error(`Missing 3D source: ${source.descriptor.id}`);
      tileset = await this._cached(this._tilesets, source.descriptor.id, () =>
        source.createTileset({ signal: this._abort.signal }),
      );
    }
    if (gen !== this._switchGen) return;
    if (!source.tileset && !this._ownedTilesets.has(tileset)) {
      tileset.show = false;
      this.viewer.scene.primitives.add(tileset);
      this._ownedTilesets.add(tileset);
    }
    this._removeImageryLayer();
    this._credits.show(source.credit || null);
    this._showTileset(tileset);
    this.viewer.scene.globe.show = false;
  }

  _showTileset(active) {
    for (const source of this._sources.values())
      if (source.tileset) source.tileset.show = source.tileset === active;
    for (const tileset of this._ownedTilesets)
      tileset.show = tileset === active;
  }

  async _activateGlobeStack(stack, gen) {
    const resolution = await this._getImageryProvider(stack);
    if (gen !== this._switchGen) return;
    if (!this._imageryLayer || this._activeImageryProvider !== resolution.provider) {
      this._removeImageryLayer();
      this._imageryLayer = this._createImageryLayer(resolution.provider);
      this._activeImageryProvider = resolution.provider;
      this.viewer.imageryLayers.add(this._imageryLayer, 0);
    }
    const source = this._sources.get(resolution.effectiveStackId);
    this._credits.show(source?.credit || null);
    this._removeImageryErrorListener?.();
    this._removeImageryErrorListener = null;
    this._watchProvider(resolution, gen);
    this._showTileset(null);
    this.viewer.scene.globe.show = true;
    this._activeId = resolution.effectiveStackId;
    if (source?.terrain && source.terrain.id !== this._terrainMode) {
      const terrain = source.terrain;
      const result = await this._cached(this._terrainProviders, terrain.id, () =>
        terrain.create({ signal: this._abort.signal }),
      );
      if (gen !== this._switchGen) return;
      if (result.terrain) this.viewer.scene.setTerrain(result.terrain);
      else this.viewer.terrainProvider = result.provider;
      this._terrainMode = terrain.id;
    }
    return resolution;
  }

  _cached(cache, id, create) {
    if (cache.has(id)) return cache.get(id);
    const promise = Promise.resolve()
      .then(() => {
        this._abort.signal.throwIfAborted();
        return create();
      })
      .catch((error) => {
        if (cache.get(id) === promise) cache.delete(id);
        throw error;
      });
    cache.set(id, promise);
    return promise;
  }

  _removeImageryLayer() {
    this._removeImageryErrorListener?.();
    this._removeImageryErrorListener = null;
    if (this._imageryLayer)
      this.viewer.imageryLayers.remove(this._imageryLayer, true);
    this._imageryLayer = null;
    this._activeImageryProvider = null;
  }

  getState(status = this._isSwitching ? 'switching' : 'ready') {
    return {
      activeId: this._activeId,
      activeStack: this.getStack(this._activeId),
      stacks: this.getStacks(),
      status,
      lastError: this._lastError,
      switchOrigin: this._switchOrigin,
      ...this._registry.state,
    };
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._subscribers.clear();
    this._switchGen++;
    this._abort.abort();
    this._removeImageryLayer();
    this._credits.destroy();
  }
}
```

---

### Path: src/mapStackController.js
```javascript
import { MapSourceController } from './maps/controller.js';
import { createDefaultMapSources } from './maps/defaultSources.js';
import { governorRequestRender } from './renderGovernor.js';
export { MAP_STACKS } from './maps/catalog.js';
export { photorealUnavailableReason } from './maps/availability.js';

export class MapStackController extends MapSourceController {
  constructor(viewer, options = {}) {
    const googleApiKey =
      typeof window !== 'undefined' ? window.__GOOGLE_MAPS_API_KEY__ : '';
    const registry = createDefaultMapSources({ ...options, googleApiKey });
    super(viewer, {
      registry,
      initialStack: options.googleTileset
        ? options.initialStack || 'photoreal'
        : registry.defaultId,
      ...options,
      requestRender: governorRequestRender,
    });
    this.googleTileset = options.googleTileset || null;
    this.cesiumToken = String(options.cesiumToken || '').trim();
  }
}
```

---

### Path: src/maps/defaultSources.js
```javascript
import { MAP_STACKS } from './catalog.js';
import { photorealUnavailableReason } from './availability.js';
import {
  createOsmImagery,
  createEsriImagery,
  createIonImagery,
  ESRI_ATTRIBUTION_HTML,
} from './imagery.js';
import { createWorldTerrain, createKeylessTerrain } from './terrain.js';

export function createDefaultMapSources({
  googleTileset = null,
  cesiumToken = '',
  googleApiKey = '',
} = {}) {
  const ionToken = String(cesiumToken || '').trim();
  const hasIon = Boolean(ionToken);
  const hasGoogle = Boolean(String(googleApiKey || '').trim());
  const terrain = {
    id: hasIon ? 'world' : 'keyless',
    create: hasIon
      ? (request) => createWorldTerrain(ionToken, request)
      : createKeylessTerrain,
  };
  return {
    defaultId: googleTileset ? 'photoreal' : 'esri-imagery',
    unknownId: 'photoreal',
    recoveryId: googleTileset ? 'photoreal' : null,
    state: { hasCesiumIonToken: hasIon },
    sources: MAP_STACKS.map((descriptor) => {
      const common = {
        descriptor,
        available: !descriptor.requiresIon || hasIon,
      };
      if (descriptor.kind === 'photoreal')
        return {
          ...common,
          available: Boolean(googleTileset),
          unavailableReason: photorealUnavailableReason(hasIon || hasGoogle),
          tileset: googleTileset,
        };
      const imagery =
        descriptor.kind === 'ion'
          ? () => createIonImagery(descriptor.style, ionToken)
          : descriptor.id === 'osm'
            ? createOsmImagery
            : createEsriImagery;
      return {
        ...common,
        imagery,
        terrain,
        ...(descriptor.id === 'esri-imagery'
          ? {
              credit: ESRI_ATTRIBUTION_HTML,
              constructionFallback: {
                id: 'osm',
                message: 'Esri Satellite is unavailable; using OSM',
              },
              tileFailureFallback: {
                id: 'osm',
                threshold: 2,
                message: 'Esri Satellite tile requests failed; using OSM',
              },
            }
          : {}),
      };
    }),
  };
}
```

---

### Path: src/maps/imagery.js
```javascript
import * as Cesium from 'cesium';

export const ESRI_ATTRIBUTION_HTML =
  '<a href="https://www.esri.com" target="_blank" rel="noopener">Powered by Esri</a>';

export function createOsmImagery() {
  return new Cesium.OpenStreetMapImageryProvider({
    url: 'https://tile.openstreetmap.org/',
    credit: '© OpenStreetMap contributors',
  });
}

export function createEsriImagery() {
  return Cesium.ArcGisMapServerImageryProvider.fromUrl(
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    {
      credit:
        'Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      enablePickFeatures: false,
    },
  );
}

export function createIonImagery(style, accessToken) {
  accessToken = String(accessToken || '').trim();
  if (!accessToken) throw new Error('Ion imagery requires an explicit token');
  return Cesium.IonImageryProvider.fromAssetId(style, { accessToken });
}
```

---

### Path: src/maps/terrain.js
```javascript
import * as Cesium from 'cesium';

/** Lazy factories: globe hidden must not trigger terrain loading. */
export async function createWorldTerrain(accessToken, { signal } = {}) {
  accessToken = String(accessToken || '').trim();
  if (!accessToken)
    throw new Error('World terrain requires an explicit ion token');
  signal?.throwIfAborted();
  const resource = await Cesium.IonResource.fromAssetId(1, { accessToken });
  signal?.throwIfAborted();
  return {
    provider: await Cesium.CesiumTerrainProvider.fromUrl(resource, {
      requestVertexNormals: true,
      requestWaterMask: false,
      ellipsoid: Cesium.Ellipsoid.WGS84,
    }),
  };
}

export async function createKeylessTerrain() {
  try {
    // Re:Earth / Mapterhorn ellipsoidal quantized mesh, CC BY 4.0.
    return {
      provider: await Cesium.CesiumTerrainProvider.fromUrl(
        'https://terrain.reearth.land/cesium-mesh/ellipsoid',
      ),
    };
  } catch (error) {
    console.warn(
      '[MapStack] Re:Earth terrain unavailable, falling back to flat ellipsoid terrain:',
      error,
    );
    return { provider: new Cesium.EllipsoidTerrainProvider() };
  }
}
```

---

## 4. Camera Flight, Zoom & Orbital Navigation

### Path: src/camera.js
```javascript
import * as Cesium from 'cesium';

export const CAMERA_PRESETS = {
  austin: {
    destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 800),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-35),
      roll: 0.0,
    },
  },
  sf: {
    destination: Cesium.Cartesian3.fromDegrees(-122.4194, 37.7749, 1000),
    orientation: {
      heading: Cesium.Math.toRadians(30),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0.0,
    },
  },
  nyc: {
    destination: Cesium.Cartesian3.fromDegrees(-73.9857, 40.7484, 1200),
    orientation: {
      heading: Cesium.Math.toRadians(-20),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0.0,
    },
  },
};

/**
 * Fly the camera to a preset location with a smooth animation.
 */
export function flyToPreset(viewer, presetName, duration = 3.0) {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return;

  viewer.camera.flyTo({
    destination: preset.destination,
    orientation: preset.orientation,
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
  });
}

/**
 * Set camera to Austin on load with a cinematic fly-in.
 * Starts high up in orbit and swoops smoothly into city street level.
 */
export function flyToAustin(viewer) {
  // Start from high orbit altitude, looking straight down
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 25000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
  });

  // Cinematic fly-in after a brief pause
  const timer = setTimeout(() => {
    if (viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 600),
      orientation: {
        heading: Cesium.Math.toRadians(15),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0.0,
      },
      duration: 4.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, 500);
  return () => {
    clearTimeout(timer);
    if (!viewer.isDestroyed()) viewer.camera.cancelFlight();
  };
}
```

---

### Path: src/orbit.js
```javascript
import * as Cesium from 'cesium';
import {
  holdContinuousRender,
  releaseContinuousRender,
} from './renderGovernor.js';

/**
 * OrbitController — smooth orbit around a target point.
 * Uses scene.preRender for frame-rate-independent 60fps updates.
 * Toggle with O key; auto-stops on POI/city change.
 */
export class OrbitController {
  constructor(viewer) {
    this.viewer = viewer;
    this.active = false;
    this.target = null;
    this.radius = 500;
    this.pitch = -30;
    this.speed = Cesium.Math.toRadians(6); // ~6°/sec → full rotation in ~60s
    this.angle = 0;
    this._removeListener = null;
  }

  /**
   * Start orbiting around a target position.
   * @param {Cesium.Cartesian3} targetCartesian - The point to orbit around
   * @param {object} options
   * @param {number} options.radius - Distance from target in meters
   * @param {number} options.pitch - Tilt angle in degrees (negative = looking down)
   * @param {number} options.speed - Degrees per second (default 6)
   */
  start(targetCartesian, options = {}) {
    if (!targetCartesian) return;

    this.target = targetCartesian;
    this.radius = options.radius || this.radius;
    this.pitch = options.pitch || this.pitch;
    this.speed = Cesium.Math.toRadians(options.speed || 6);
    this.active = true;
    holdContinuousRender('camera-orbit');

    // Start from the camera's current heading for seamless transition
    this.angle = this.viewer.camera.heading;

    let lastTime = Date.now();
    this._removeListener = this.viewer.scene.preRender.addEventListener(() => {
      if (!this.active) return;

      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      this.angle += this.speed * dt;

      const hpr = new Cesium.HeadingPitchRange(
        this.angle,
        Cesium.Math.toRadians(this.pitch),
        this.radius,
      );
      this.viewer.camera.lookAt(this.target, hpr);
    });
  }

  /**
   * Stop orbiting. Camera freezes at current position and user regains control.
   */
  stop() {
    this.active = false;
    releaseContinuousRender('camera-orbit');
    if (this._removeListener) {
      this._removeListener();
      this._removeListener = null;
    }
    // Unlock camera for free interaction
    this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  }

  toggle(targetCartesian, options) {
    if (this.active) {
      this.stop();
    } else {
      this.start(targetCartesian, options);
    }
    return this.active;
  }
}
```

---

### Path: src/worldFocus.js
```javascript
import * as Cesium from 'cesium';

export const WORLD_FOCUS_REQUEST_EVENT = 'gev:world-request-focus';
export const WORLD_CLICK_FOCUS_DURATION_SEC = 1.9;

export const WORLD_FOCUS_FRAMING = Object.freeze({
  vessel: Object.freeze({ radiusM: 150, rangeM: 1200, pitchDeg: -30 }),
  fire: Object.freeze({ radiusM: 400, rangeM: 3000, pitchDeg: -35 }),
});

/** Validate a layer-owned focus target before camera policy can release tracking. */
export function isValidWorldFocusTarget(detail) {
  if (!detail || !WORLD_FOCUS_FRAMING[detail.kind]) return false;
  if (!String(detail.id || '').trim()) return false;
  const { position } = detail;
  if (
    !position ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y) ||
    !Number.isFinite(position.z)
  )
    return false;
  const magnitude = Cesium.Cartesian3.magnitude(position);
  return (
    Number.isFinite(magnitude) &&
    magnitude >= Cesium.Ellipsoid.WGS84.minimumRadius * 0.95
  );
}

/** Fly to a world target after ownership has been released. */
export function flyToWorldTarget(viewer, target = {}) {
  const camera = viewer?.camera;
  const framing = WORLD_FOCUS_FRAMING[target.kind];
  if (!camera || !framing || !isValidWorldFocusTarget(target)) return false;
  const heading = Number.isFinite(camera.heading) ? camera.heading : 0;
  const duration =
    target.durationSec > 0
      ? target.durationSec
      : WORLD_CLICK_FOCUS_DURATION_SEC;
  camera.cancelFlight?.();
  camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(target.position, framing.radiusM),
    {
      offset: new Cesium.HeadingPitchRange(
        heading,
        Cesium.Math.toRadians(framing.pitchDeg),
        framing.rangeM,
      ),
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    },
  );
  return true;
}
```

---

### Path: src/layers/cctv/navigation.js
```javascript
import * as Cesium from 'cesium';
import { CCTV_FOCUS_RESULT } from './policy.js';

export function createNavigation({ state: layerState, parts }) {
  function nearestCameraIdToViewer() {
    const carto = layerState._viewer?.camera?.positionCartographic;
    if (!carto || !layerState._records.length) return null;
    const lat = Cesium.Math.toDegrees(carto.latitude);
    const lon = Cesium.Math.toDegrees(carto.longitude);

    let best = null;
    for (const record of layerState._records) {
      const distKm = parts.model.haversineKm(
        lat,
        lon,
        record.camera.lat,
        record.camera.lon,
      );
      if (!best || distKm < best.distKm) {
        best = { id: record.camera.id, distKm };
      }
    }
    return best?.id || null;
  }

  /**
   * Flies the Cesium viewer camera to frame the specified CCTV camera,
   * looking along its heading from above.
   */
  function focusCctvRecord(viewer, record, duration = 2.2) {
    if (!viewer || !record) return CCTV_FOCUS_RESULT.NO_ACTIVE_CAMERA;
    if (
      typeof document !== 'undefined' &&
      document.body?.classList.contains('cockpit-mode')
    ) {
      return CCTV_FOCUS_RESULT.COCKPIT_ACTIVE;
    }
    if (viewer.trackedEntity) {
      return CCTV_FOCUS_RESULT.TRACKING_HOLDS_VIEW;
    }
    const { camera } = record;
    const range = Math.max(280, camera.rangeM * 1.18);
    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(
        record.position,
        Math.max(40, camera.rangeM * 0.36),
      ),
      {
        offset: new Cesium.HeadingPitchRange(
          parts.model.toRad(camera.headingDeg),
          parts.model.toRad(-22),
          range,
        ),
        duration: Math.max(0.2, duration || 0),
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      },
    );
    return CCTV_FOCUS_RESULT.FOCUSED;
  }

  function focusCamera(cameraId, duration = 2.2) {
    return focusCctvRecord(
      layerState._viewer,
      layerState._recordById.get(cameraId),
      duration,
    );
  }

  return {
    nearestCameraIdToViewer,
    focusCctvRecord,
    focusCamera,
  };
}
```

---

### Path: src/cameraVerbs.js (Core Kinematic Verbs & Route Flight Excerpt)
```javascript
import * as Cesium from 'cesium';
import { holdContinuousRender, releaseContinuousRender } from './renderGovernor.js';

let _viewer = null;
let _getTarget = null;
let _active = null;
let _tickRemover = null;
let _inputRemovers = [];

const ORBIT_DEG_S = { slow: 2, normal: 6, fast: 15 };
const PITCH_MIN = Cesium.Math.toRadians(-89);
const PITCH_MAX = Cesium.Math.toRadians(-5);

export function initCameraVerbs(viewer, getViewTargetCartesian = null) {
  if (_viewer === viewer) {
    if (getViewTargetCartesian) _getTarget = getViewTargetCartesian;
    return;
  }
  _getTarget = getViewTargetCartesian;
  _viewer = viewer;
  if (_tickRemover) _tickRemover();
  _tickRemover = viewer.clock.onTick.addEventListener(onTick);
  for (const rm of _inputRemovers) rm();
  _inputRemovers = [];
  const canvas = viewer.scene.canvas;
  for (const evt of ['pointerdown', 'wheel']) {
    const h = () => interruptCameraMotion('manual-input');
    canvas.addEventListener(evt, h, { passive: true });
    _inputRemovers.push(() => canvas.removeEventListener(evt, h));
  }
}

export function interruptCameraMotion(reason = 'interrupted') {
  const wasActive = Boolean(_active);
  if (_active) {
    if (_active.kind === 'orbit' && _viewer) {
      _viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
    _active = null;
    releaseContinuousRender('camera-verb');
  }
  return { wasActive, reason };
}

function onTick(clock) {
  if (!_active || !_viewer) return;
  // Frame update ticks advance camera heading/pan/route progression
}

export function moveCamera(args = {}, runNavigation = null) {
  const motion = String(args.motion || '').toLowerCase();
  const direction = args.direction ? String(args.direction).toLowerCase() : 'right';
  const speed = args.speed || 'normal';
  const mode = args.mode === 'continuous' ? 'continuous' : 'once';

  if (motion === 'stop') {
    interruptCameraMotion('stop-requested');
    return { ok: true, action: 'move_camera', motion: 'stop' };
  }

  const start = () => {
    interruptCameraMotion('replaced');
    const state = { kind: motion, direction, speed, mode };
    if (motion === 'orbit') {
      const target = _getTarget?.(_viewer);
      if (target) {
        const cam = _viewer.camera;
        const range = Cesium.Cartesian3.distance(cam.positionWC, target);
        const carto = Cesium.Cartographic.fromCartesian(cam.positionWC);
        const tCarto = Cesium.Cartographic.fromCartesian(target);
        const dh = carto.height - tCarto.height;
        const pitch = -Math.asin(Math.min(1, Math.max(-1, dh / Math.max(1, range))));
        state.target = target;
        state.hpr = new Cesium.HeadingPitchRange(cam.heading, pitch, range);
      }
    }
    _active = state;
    holdContinuousRender('camera-verb');
    return { ok: true, action: 'move_camera', motion, direction, speed, mode };
  };

  return typeof runNavigation === 'function' ? runNavigation(start) : start();
}
```

---

## 5. CCTV & Marker Spatial Rendering Pipeline

### Path: src/layers/cctv/lifecycle.js (Marker Setup & Picking)
```javascript
import * as Cesium from 'cesium';

const CAMERA_ICON = '/icons/cctv.svg';
const IDLE_CAMERA_COLOR = Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.85);

export function createLifecycle({ state: layerState, parts, source }) {
  return {
    methods: {
      async init(viewer) {
        layerState._viewer = viewer;
        layerState._records = [];
        layerState._recordById = new Map();

        // 1. Create native Cesium BillboardCollection for hardware-instanced markers
        layerState._billboards = new Cesium.BillboardCollection();
        layerState._viewer.scene.primitives.add(layerState._billboards);

        // 2. Fetch catalog cameras
        const sources = await parts.catalog.loadCameraSources();
        const catalog = parts.catalog.buildCatalogFromSources(sources);

        // 3. Resolve ground prior heights (ellipsoidal WGS84)
        const priors = await parts.ground.resolveGroundPriors(catalog);

        for (let i = 0; i < catalog.length; i++) {
          const camera = catalog[i];
          const priorGround = priors?.[i]?.ellipsoid ?? Number(camera.groundElevationM) || 0;
          camera.absoluteHeightM = priorGround + (camera.mountHeightM || 20);

          // Project Lat/Long/Alt into 3D ECEF Cartesian3 coordinates
          const position = Cesium.Cartesian3.fromDegrees(
            camera.lon,
            camera.lat,
            camera.absoluteHeightM,
          );

          // Add instanced billboard marker
          const billboard = layerState._billboards.add({
            id: camera.id,
            image: CAMERA_ICON,
            position,
            color: IDLE_CAMERA_COLOR,
            width: 24,
            height: 24,
            // Always-on-top so low-LOD terrain mesh does not submerge markers
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(350, 1.25, 4_000_000, 0.42),
          });

          const record = {
            camera,
            position,
            billboard,
            coverageEntities: [],
            projection: null,
          };
          layerState._records.push(record);
          layerState._recordById.set(camera.id, record);
        }

        // 4. Bind ScreenSpaceEventHandler for mouse clicks on markers
        layerState._clickHandler = new Cesium.ScreenSpaceEventHandler(
          layerState._viewer.scene.canvas,
        );
        layerState._clickHandler.setInputAction((click) => {
          if (!layerState._enabled) return;
          const picked = layerState._viewer.scene.pick(click.position);
          if (picked && picked.primitive instanceof Cesium.Billboard) {
            const cameraId = picked.primitive.id;
            parts.selection.setActiveCamera(cameraId);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // 5. Horizon culling listener on camera moveEnd
        layerState._viewer.camera.moveEnd.addEventListener(() => {
          parts.rendering.refreshHorizonCulling();
          parts.cards.refreshAmbientCards();
        });
      },
    },
  };
}
```

---

### Path: src/layers/cctv/geometry.js (Frustum & Ground Projection Math)
```javascript
import * as Cesium from 'cesium';

/**
 * Computes the 3D frustum pyramid and far-cap monitor plane:
 *   - Mount point (camera origin)
 *   - Far-cap center (aim point along heading/pitch)
 *   - 4 rectangle corners (TL, TR, BR, BL) representing projected video surface
 */
export function computeFrustumGeometry(camera, groundAltM, rangeOverrideM = null) {
  const ground = groundAltM || 0;
  const R = rangeOverrideM || camera.rangeM || 500;
  const pitchDeg = camera.pitchDeg || -17;
  const fovDeg = camera.fovDeg || 74;
  const heading = camera.headingDeg || 0;
  const mountAlt = ground + (camera.mountHeightM || 24);

  const pitchRad = Cesium.Math.toRadians(pitchDeg);
  const hFovRad = Cesium.Math.toRadians(fovDeg);
  const vFovRad = 2 * Math.atan(Math.tan(hFovRad / 2) / (16 / 9));

  // Small-angle spherical projection along heading
  const horizDist = R * Math.cos(pitchRad);
  const vertDist = R * Math.sin(pitchRad);

  const halfW = R * Math.tan(hFovRad / 2);
  const halfH = R * Math.tan(vFovRad / 2);

  // Compute center of far cap
  const capLL = projectSpherical(camera.lat, camera.lon, heading, horizDist);
  const capAlt = mountAlt + vertDist;

  // Offset corners perpendicular to heading
  const capLeft = projectSpherical(capLL.lat, capLL.lon, heading - 90, halfW);
  const capRight = projectSpherical(capLL.lat, capLL.lon, heading + 90, halfW);

  const upOffsetH = Math.cos(pitchRad) * halfH;
  const upOffsetDist = -Math.sin(pitchRad) * halfH;

  return {
    mount: { lat: camera.lat, lon: camera.lon, alt: mountAlt },
    capCenter: { lat: capLL.lat, lon: capLL.lon, alt: capAlt },
    halfW,
    halfH,
    rangeM: R,
    corners: {
      tl: { lat: capLeft.lat, lon: capLeft.lon, alt: capAlt + upOffsetH },
      tr: { lat: capRight.lat, lon: capRight.lon, alt: capAlt + upOffsetH },
      br: { lat: capRight.lat, lon: capRight.lon, alt: capAlt - upOffsetH },
      bl: { lat: capLeft.lat, lon: capLeft.lon, alt: capAlt - upOffsetH },
    },
  };
}

function projectSpherical(latDeg, lonDeg, bearingDeg, distanceM) {
  const R = 6378137.0; // WGS84 earth radius
  const dByR = distanceM / R;
  const latRad = Cesium.Math.toRadians(latDeg);
  const lonRad = Cesium.Math.toRadians(lonDeg);
  const brgRad = Cesium.Math.toRadians(bearingDeg);

  const latOut = Math.asin(
    Math.sin(latRad) * Math.cos(dByR) +
    Math.cos(latRad) * Math.sin(dByR) * Math.cos(brgRad)
  );
  const lonOut = lonRad + Math.atan2(
    Math.sin(brgRad) * Math.sin(dByR) * Math.cos(latRad),
    Math.cos(dByR) - Math.sin(latRad) * Math.sin(latOut)
  );

  return {
    lat: Cesium.Math.toDegrees(latOut),
    lon: Cesium.Math.toDegrees(lonOut),
  };
}
```

---

### Path: src/layers/cctv/projection.js (3D Video/Canvas Monitor Plane)
```javascript
import * as Cesium from 'cesium';
import { attachCctvVideo } from './videoPlayback.js';

const PLANE_OUTLINE_COLOR = Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.65);
const PROJECTION_CANVAS_WIDTH = 1280;
const PROJECTION_CANVAS_HEIGHT = 720;

export function createProjection({ state: layerState, parts }) {
  /**
   * Creates the 3D projection plane entity attached to Cesium's entity collection,
   * positioned at the far cap of the camera frustum and textured with the live stream.
   */
  function createProjectionRuntime(record) {
    if (!layerState._viewer) return null;

    const canvas = document.createElement('canvas');
    canvas.width = PROJECTION_CANVAS_WIDTH;
    canvas.height = PROJECTION_CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d', { alpha: true });

    const feedType = record.camera.feedType || 'image';
    const isVideo = feedType === 'hls' || feedType === 'mp4';

    const runtime = {
      canvas,
      ctx,
      video: null,
      planeEntity: null,
      planeMaterial: new Cesium.ImageMaterialProperty({
        image: canvas,
        transparent: false,
      }),
    };

    if (isVideo) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      const bindVideoTexture = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          video.width = video.videoWidth;
          video.height = video.videoHeight;
          // Assign video directly to Cesium's ImageMaterialProperty
          runtime.planeMaterial.image = video;
        }
      };

      video.addEventListener('loadedmetadata', bindVideoTexture);
      video.addEventListener('resize', bindVideoTexture);
      runtime.video = video;

      // Attach HLS or MP4 stream
      runtime.playback = attachCctvVideo(video, record.camera.streamUrl, feedType);
    }

    // Calculate Cartesian coordinates and dimensions
    const geometry = parts.geometry.computeFrustumGeometry(
      record.camera,
      parts.ground.groundAltFor(record),
    );
    const capCenter = Cesium.Cartesian3.fromDegrees(
      geometry.capCenter.lon,
      geometry.capCenter.lat,
      geometry.capCenter.alt,
    );

    // Create 3D Cesium.Plane entity perpendicular to camera view axis
    runtime.planeEntity = layerState._viewer.entities.add({
      id: `cctv-${record.camera.id}-plane`,
      position: capCenter,
      plane: {
        plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_Z, 0.0),
        dimensions: new Cesium.Cartesian2(geometry.halfW * 2, geometry.halfH * 2),
        material: runtime.planeMaterial,
        outline: true,
        outlineColor: PLANE_OUTLINE_COLOR,
      },
    });

    record.projection = runtime;
    return runtime;
  }

  function setPlaneVisible(runtime, visible) {
    if (runtime?.planeEntity) {
      runtime.planeEntity.show = Boolean(visible);
    }
  }

  return {
    createProjectionRuntime,
    setPlaneVisible,
  };
}
```

---

### Path: src/layers/cctv/videoPlayback.js (HLS.js Stream Engine)
```javascript
/**
 * Attaches a live video stream (HLS or direct MP4) to an HTML5 <video> element.
 * Manages live sync buffer governor and automatic retry recovery.
 */
export function attachCctvVideo(
  video,
  url,
  feedType,
  {
    loadHls = () => import('hls.js'),
    onFailure = () => {},
    fetchImpl = globalThis.fetch,
  } = {},
) {
  video.loop = feedType !== 'hls';
  let disposed = false;
  let hls = null;
  let governor = null;
  let retries = 0;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearInterval(governor);
    hls?.destroy();
    hls = null;
    video.pause();
    video.removeAttribute('src');
    video.load();
  };

  const fail = () => {
    if (disposed) return;
    dispose();
    onFailure();
  };

  const ready = (async () => {
    if (feedType !== 'hls') {
      video.src = url;
      video.play().catch(() => {});
      return;
    }

    try {
      const { default: Hls } = await loadHls();
      if (disposed) return;

      if (!Hls.isSupported()) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          video.play().catch(() => {});
        } else {
          fail();
        }
        return;
      }

      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 24,
        maxMaxBufferLength: 30,
        backBufferLength: 0,
        maxBufferSize: 16 * 1024 * 1024,
        liveSyncDurationCount: 3,
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (disposed || !data?.fatal) return;
        if (++retries > 2) {
          fail();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          hls.loadSource(url);
        }
      });

      // Buffer governor: adjusts playback rate to keep stream live without stalling
      governor = setInterval(() => {
        if (disposed || !video.buffered?.length) return;
        const ahead = video.buffered.end(video.buffered.length - 1) - video.currentTime;
        video.playbackRate = ahead < 6 ? 0.8 : ahead < 12 ? 0.9 : ahead > 24 ? 1.05 : 1.0;
      }, 1000);

      hls.attachMedia(video);
      hls.loadSource(url);
      video.play().catch(() => {});
    } catch {
      fail();
    }
  })();

  return { dispose, ready };
}
```

---

### Path: src/layers/cctv/selection.js (Marker & Plane Click Selection)
```javascript
import * as Cesium from 'cesium';

export function createSelection({ state: layerState, parts }) {
  function getActiveRecord() {
    if (!layerState._activeCameraId) return null;
    return layerState._recordById.get(layerState._activeCameraId) || null;
  }

  function setActiveCamera(cameraId) {
    if (!cameraId || !layerState._recordById.has(cameraId)) return false;

    const record = layerState._recordById.get(cameraId);
    layerState._activeCameraId = cameraId;

    // 1. Initialize projection runtime and 3D monitor plane if not existing
    if (!record.projection) {
      parts.projection.createProjectionRuntime(record);
    }

    // 2. Make plane visible on the active camera, hide others
    for (const r of layerState._records) {
      const isActive = r.camera.id === cameraId;
      if (r.projection) {
        parts.projection.setPlaneVisible(r.projection, isActive);
      }
      if (r.billboard) {
        r.billboard.color = isActive
          ? Cesium.Color.fromCssColorString('#ffffff')
          : Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.85);
        r.billboard.scale = isActive ? 1.3 : 1.0;
      }
    }

    // 3. Request immediate render pass
    layerState._viewer?.scene?.requestRender?.();
    return true;
  }

  return {
    getActiveRecord,
    setActiveCamera,
  };
}
```

---

### Path: src/layers/cctv/cards.js (Decluttered Ambient UI Overlays)
```javascript
import * as Cesium from 'cesium';
import { horizonOccluder } from '../../data/iconOrientation.js';

export function createCards({ state: layerState }) {
  /**
   * Projects 3D world positions of cameras onto screen-space 2D coordinates
   * and renders decluttered ambient HUD cards over the canvas.
   */
  function refreshAmbientCards() {
    if (!layerState._enabled || !layerState._viewer || layerState._viewer.isDestroyed())
      return;

    const scene = layerState._viewer.scene;
    const occluder = horizonOccluder(layerState._viewer.camera);
    const canvasWidth = scene.canvas.clientWidth || scene.canvas.width;
    const canvasHeight = scene.canvas.clientHeight || scene.canvas.height;

    const screenCards = [];

    for (const record of layerState._records) {
      // Exclude active camera whose 3D plane is already visible
      if (record.camera.id === layerState._activeCameraId) continue;

      // Occlusion check against the Earth's curvature
      if (!occluder.isPointVisible(record.position)) continue;

      // Project 3D ECEF position to 2D window pixels
      const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
        scene,
        record.position,
      );

      if (!screenPos) continue;
      if (
        screenPos.x >= 0 &&
        screenPos.x <= canvasWidth &&
        screenPos.y >= 0 &&
        screenPos.y <= canvasHeight
      ) {
        screenCards.push({
          id: record.camera.id,
          name: record.camera.name,
          x: Math.round(screenPos.x),
          y: Math.round(screenPos.y),
        });
      }
    }

    // Dispatch rendered cards to UI overlay renderer
    layerState._cctvOverlayHost?.setEntries?.('cctv-cards', screenCards);
  }

  return {
    refreshAmbientCards,
  };
}
```
