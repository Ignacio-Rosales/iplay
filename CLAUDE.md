# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server with HMR
- `npm run build` — production build (output to `dist/`)
- `npm run lint` — run ESLint over the project
- `npm run preview` — preview the production build locally

No test suite is currently configured.

## Architecture

iPlay is a small React + Vite storefront for Apple accessories ("Accesorios Apple Premium"). It has no backend of its own — it's a static SPA that talks directly to Firebase and a couple of third-party APIs from the client.

- **Routing**: `src/App.jsx` sets up two routes with `react-router-dom`: `/` (storefront, `src/pages/HomePage.jsx`) and a deliberately unlinked admin route (`src/pages/AdminPage.jsx`) — no button or link to it exists anywhere in the storefront UI, by design (point 2 of the original feature request), so treat its path as effectively a secret and don't advertise it in UI copy.
- **Data layer**: `src/services/firebase.js` is the point of contact with Firestore — it initializes the app from `VITE_FIREBASE_*` env vars and exposes `getProducts`, `addProduct`, `updateProduct`, `deleteProduct` (Firestore, `products` collection) and `getStoreSettings`/`updateStoreSettings` (Firestore, `settings` collection, fixed doc id `store`). `src/services/cloudinary.js` handles image uploads via Cloudinary's unsigned upload API (`VITE_CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_UPLOAD_PRESET`), returning a `secure_url` that gets stored on the product doc or on the store settings' `logoUrl`. `src/services/api.js` exists but is currently empty/unused.
- **Product shape**: Firestore `products` docs hold `name`, `price`, `discount`, `description`, `image`, `createdAt`, plus `model`, `color` (free-text strings, used for storefront filtering) and `stock` (number). Older docs created before these fields existed simply lack them — the storefront/admin code treats missing `model`/`color` as "no tag" and missing `stock` as `0`, so no migration is needed.
- **Store settings**: a single Firestore doc (`settings/store`) holds `title`, `tagline`, `whatsappNumber`, and `logoUrl`, editable from the admin panel. `HomePage.jsx` falls back to hardcoded defaults (`iPlay` / `Accesorios Apple Premium` / no WhatsApp number) if the doc doesn't exist yet or Firestore rules reject the read — **the Firestore security rules must explicitly allow read/write on the `settings` collection** (matching whatever the `products` collection already allows) or the settings form in the admin panel will silently fail with a "Missing or insufficient permissions" error.
- **Storefront (`/`)**: `HomePage.jsx` loads products via `getProducts()` (falls back to a hardcoded mock list if Firestore returns none) and store settings via `getStoreSettings()`. It composes `Header` (title/tagline/logo), `Filters` (search box + multi-select model/color checkboxes with live counts, all derived from the loaded products) and `ProductList` (the filtered grid of `ProductCard`s). `ProductCard` computes the discounted price, shows a stock badge, and triggers a WhatsApp order via a `wa.me` deep link built from `settings.whatsappNumber`.
- **Admin (hidden route)**: `AdminPage.jsx` is a self-contained page (no shared layout) gated by a password compared against `VITE_ADMIN_PASSWORD` (client-side only — the password ships in the bundle, this is not real auth). Once "authenticated", it shows a store-settings form (title/tagline/WhatsApp number/logo upload → `updateStoreSettings`), a product form that both creates (`addProduct`) and edits (`updateProduct`, image re-upload optional when editing) products, and the product list with edit/delete actions.
- **Styling**: plain CSS, no CSS-in-JS or Tailwind — `src/styles/styles.css` for the storefront, `src/styles/admin.css` for the admin panel.

## Environment variables

Required in `.env.local` (see existing `.env.local` for the current values, not committed):

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_ADMIN_PASSWORD` — client-side gate for `/admin`
- `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` — used for product image uploads (unsigned upload preset, see Cloudinary dashboard)
