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

- **Routing**: `src/App.jsx` sets up two routes with `react-router-dom`: `/` (storefront) and `/admin` (`src/pages/AdminPage.jsx`). The storefront route's markup (header, product grid) is currently inlined in `App.jsx` rather than composed from `src/components/Header.jsx` / `ProductList.jsx`, which exist but are empty/unused.
- **Data layer**: `src/services/firebase.js` is the point of contact with Firestore — it initializes the app from `VITE_FIREBASE_*` env vars and exposes `getProducts`, `addProduct`, `deleteProduct` (Firestore, `products` collection). `src/services/cloudinary.js` handles image uploads via Cloudinary's unsigned upload API (`VITE_CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_UPLOAD_PRESET`), returning a `secure_url` that gets stored on the product doc. `src/services/api.js` exists but is currently empty/unused.
- **Storefront (`/`)**: loads products via `getProducts()`; if Firestore returns none, falls back to a hardcoded mock product list defined inline in `App.jsx`. Each product renders as a `ProductCard` (`src/components/ProductCard.jsx`), which computes the discounted price and triggers a WhatsApp order via `wa.me` deep link with a pre-filled message. `WHATSAPP_NUMBER` in `App.jsx` is currently blank and needs to be set for ordering to work.
- **Admin (`/admin`)**: `AdminPage.jsx` is a self-contained page (no shared layout) gated by a password compared against `VITE_ADMIN_PASSWORD` (client-side only — the password ships in the bundle, this is not real auth). Once "authenticated", it lists products and provides a form to add new ones: image is uploaded to Cloudinary first to get a URL (`uploadImage` from `src/services/cloudinary.js`), then the product doc (name, price, discount, description, image URL, createdAt) is written to Firestore. Delete removes the Firestore doc directly.
- **Styling**: plain CSS, no CSS-in-JS or Tailwind — `src/styles/styles.css` for the storefront, `src/styles/admin.css` for the admin panel.

## Environment variables

Required in `.env.local` (see existing `.env.local` for the current values, not committed):

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_ADMIN_PASSWORD` — client-side gate for `/admin`
- `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` — used for product image uploads (unsigned upload preset, see Cloudinary dashboard)
