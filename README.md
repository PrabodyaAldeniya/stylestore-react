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

## Customer reviews

Reviews are database backed and are **auto-published** (status `approved`, `verified_buyer = 1`) only after the server verifies the order number, the checkout email, the purchased product, the duplicate-review rule, the rating and the review text. A review that fails any check is never written.

Submission is a two-step, account-free flow. The customer enters their order number and the email used at checkout; the server matches that pair against `orders` and returns only the products in that order. The product is then chosen from that list, so a customer can never be offered a product they did not buy. The server repeats the order lookup on submit, so the "Verified Buyer" flag and the linked `order_id` are decided by the database rather than by the browser. `UNIQUE (order_id, product_id)` blocks a second review of the same item.

- `POST /api/reviews/verify` returns the order number and the products inside it, marking the ones already reviewed. It never confirms whether an unrelated email is registered.
- `POST /api/reviews` re-verifies everything and, once every check passes, stores an approved review. It returns the new review in its public shape plus the recalculated rating summary so the page can show it immediately.
- `GET /api/reviews` returns approved (published) reviews only, newest first.
- `GET /api/products/:id/reviews` returns approved reviews for one product plus the average and count.
- `GET /api/admin/reviews`, `GET /api/admin/reviews/counts`, `PATCH /api/admin/reviews/:id/status`, and `DELETE /api/admin/reviews/:id` let the owner hide, reject, restore or delete a review behind `requireAdmin`.

Public responses are reduced server-side to a first name and last initial, a rating, the title, the text, the product name and the date. Email addresses, order numbers and review ids are never sent to the public site, and no request ever needs a session. Submitting is rate limited per IP and screened for honeypot submissions, links, phone numbers and repeated text. The two limits can be tuned with `REVIEW_SUBMIT_LIMIT` (default 12) and `REVIEW_VERIFY_LIMIT` (default 20).

Publishing a review recalculates that product's `rating` and `rating_count` from its approved reviews in the same transaction, so the stars shown on a product always match the reviews underneath them. Hiding, rejecting, restoring or deleting a review recalculates them again. Reviews are not linked to products with a foreign key and store a copy of the product name, so they survive a product being archived, trashed or permanently deleted.

## Product images

Product images are stored under `server/uploads` and referenced by database paths such as `/uploads/<generated-name>`. Uploads are limited to six JPG, PNG, or WebP images per product, 5 MB per file. The local filesystem is suitable for development only; production deployments should use durable object storage and update the upload adapter before accepting real customer uploads.

The legacy seed intentionally contains product metadata but no remote image URLs. Upload real product photos through the admin page at `/admin/products`.

## Database migration

`server/db/init.js` is the automatic, idempotent migration path. `server/db/schema.sql` is the equivalent manual phpMyAdmin/MySQL script. Existing `subscribers`, `orders`, `order_items`, and `discount_codes` data is retained; new product tables, order snapshot columns and the `product_reviews` table are additive.

## Verification

```bash
npm run lint
npm run build
```

Run the API with a reachable database before testing `/api/health`, admin login, image upload, public catalogue visibility, checkout, stock decrement, order history, and the review flow (verify an order, submit a review, confirm it is published straight away on the product and in "Loved by our customers" without a page refresh, and confirm the product rating updated). Then check `/admin/reviews` can hide, reject, restore and delete it. Do not run `npm run dev:all` as a background process in automated verification.
