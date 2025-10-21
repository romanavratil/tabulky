# KiloTrack — Calorie Tracker

KiloTrack is a mobile-first calorie tracker built with React, TypeScript, and Vite. It focuses on fast logging, delightful interactions, and offline-friendly storage using IndexedDB (via localforage). Core flows include barcode scanning, intelligent search with Open Food Facts, photo-based ingredient suggestions (stubbed), custom ingredient creation, and insight dashboards powered by Recharts.

## Features

- **Zero-friction logging:** quick add from barcode scan, text search, or photo estimation.
- **Typed Open Food Facts client:** barcode lookup and text search mapped into rich product nutrition models.
- **Local-first state:** Zustand + localforage persistence for day logs, settings, and custom foods.
- **Insightful dashboards:** weekly calorie bars, macro split, and top foods using Recharts.
- **Custom ingredients:** validated form with Zod + React Hook Form, instantly available for logging.
- **Camera support:** Barcode Detector API with manual fallback; Quagga stub ready for future integration.
- **Photo estimator stub:** simulate ingredient detection and resolve to products or custom entries.
- **Accessible UI:** Tailwind-powered components with focus states, keyboard-friendly navigation, and responsive layout.
- **Testing:** Vitest + Testing Library coverage for nutrition math and empty-state rendering.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173/ in your browser.

### Available scripts

| Command           | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Start Vite dev server with HMR            |
| `npm run build`   | Type-check and build for production      |
| `npm run preview` | Preview the production build locally     |
| `npm run test`    | Run Vitest unit/integration tests        |

## Project structure

```
src/
  api/                Open Food Facts + photo estimator
  components/         UI primitives, sheets, charts, forms
  hooks/              Shared React hooks (barcode, debounce)
  lib/                Utilities (date, nutrition, persistence)
  routes/             Route-level screens (Today, Add, etc.)
  state/              Zustand stores for logs, settings, products
  types/              Domain models (foods, nutrients, logs)
```

## Photo estimator stub

`estimateIngredientsFromPhoto(file)` currently returns mock data. To integrate a real vision API later, replace the stub in `src/api/photoEstimator.ts` with an asynchronous call that resolves to an array of `{ name, confidence, defaultServing }` objects. The UI already handles optimistic loading, matching, and fallbacks to custom ingredient creation.

## Persistence & portability

- Data persists via localforage. The Settings screen offers JSON export/import with a simple schema containing logs, custom products, and user preferences.
- Migrations can be added in `src/lib/persist.ts` alongside the storage version constant.

## Testing philosophy

- `src/lib/nutrition.test.ts`: verifies nutrient scaling helpers.
- `src/routes/Today.test.tsx`: protects empty-state rendering.

Add additional Vitest suites to cover new flows as the app grows.

## Accessibility & UX notes

- Bottom navigation supports both touch and keyboard focus.
- Sheets trap focus and close with Escape.
- Skeletons and status messages communicate loading/error states, and manual inputs backstop camera/unavailable APIs.

## Replacing the barcode fallback

The `BarcodeScanner` component currently uses the native Barcode Detector API when available and falls back to manual input. To integrate QuaggaJS for broader support:

1. Load Quagga when `window.BarcodeDetector` is unavailable.
2. Extend `useBarcodeScanner` to initialize Quagga in the `start` function and dispatch detections through the existing `onDetected` callback.

## License

MIT — see `LICENSE` if you add one. Until then, treat this project as private/internal.
