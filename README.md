# StyleStore

StyleStore is a React/Vite storefront backed by an Express API and MySQL/MariaDB. Product records, variants, images, stock, checkout pricing, and order snapshots are served by the backend rather than a browser-side catalogue.

## Requirements

- Node.js 20 or newer
- MySQL 8+ or MariaDB 10.5+
- XAMPP, a local MySQL service, or another reachable database server

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the database values. Keep the file local; never commit it.

3. Start MySQL/MariaDB. The API creates missing tables and applies additive migrations on startup, and seeds the 24 legacy product records once on the first initialization.

4. Create the admin password hash:

   ```bash
   npm run hash-admin-password -- "use-a-password-with-at-least-8-characters"
   ```

   Put the printed `scrypt$...` value in `ADMIN_PASSWORD_HASH`. Set a long random `ADMIN_SESSION_SECRET` as well. `ADMIN_PASSWORD` is accepted only for local non-production testing.

5. Start both applications:

   ```bash
   npm run dev:all
   ```

   The storefront runs through Vite and proxies `/api` and `/uploads` to the API on port `3001`. For a separately hosted frontend, set `VITE_API_URL` to the public API origin and add that origin to `CLIENT_ORIGINS`. Cross-site admin sessions require HTTPS and `ADMIN_COOKIE_SAME_SITE=none`; same-origin deployment is preferred.

## API routes

- `GET /api/products` and `GET /api/products/:id` expose published products only.
- `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout` manage the admin session.
- `/api/admin/products` provides protected product CRUD, status changes, and image management.
- `POST /api/orders` validates cart IDs, variants, stock, discounts, and prices inside a database transaction.
- `POST /api/orders/history` returns orders for order numbers stored by the current browser.
- `POST /api/orders/lookup` requires both an order number and the checkout email.

## Product images

Product images are stored under `server/uploads` and referenced by database paths such as `/uploads/<generated-name>`. Uploads are limited to six JPG, PNG, or WebP images per product, 5 MB per file. The local filesystem is suitable for development only; production deployments should use durable object storage and update the upload adapter before accepting real customer uploads.

The legacy seed intentionally contains product metadata but no remote image URLs. Upload real product photos through the admin page at `/admin/products`.

## Database migration

`server/db/init.js` is the automatic, idempotent migration path. `server/db/schema.sql` is the equivalent manual phpMyAdmin/MySQL script. Existing `subscribers`, `orders`, `order_items`, and `discount_codes` data is retained; new product tables and order snapshot columns are additive.

## Verification

```bash
npm run lint
npm run build
```

Run the API with a reachable database before testing `/api/health`, admin login, image upload, public catalogue visibility, checkout, stock decrement, and order history. Do not run `npm run dev:all` as a background process in automated verification.
