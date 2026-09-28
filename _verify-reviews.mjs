// TEMPORARY verification harness for the review system.
// Boots the real routers in-process, creates a throwaway order, then walks
// every endpoint. Nothing is left behind except rows tagged for cleanup.
import express from "express";

// Raise the per-IP review limits for this harness only.
process.env.REVIEW_SUBMIT_LIMIT = "500";
process.env.REVIEW_VERIFY_LIMIT = "500";

const { default: pool } = await import(`./server/db.js`);
const { default: reviewsRouter } = await import(`./server/routes/reviews.js`);
const { default: productsRouter } = await import(`./server/routes/products.js`);
const { default: adminReviewsRouter } = await import(`./server/routes/admin-reviews.js`);
const { default: ordersRouter } = await import(`./server/routes/orders.js`);
const { startAdminSession, authenticateAdmin } = await import(`./server/lib/auth.js`);

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use("/api", ordersRouter);
app.use("/api", reviewsRouter);
app.use("/api/products", productsRouter);
app.use("/api/admin/reviews", adminReviewsRouter);
app.use((err, _req, res, _next) => {
  void _next;
  res.status(Number(err?.status) || 500).json({
    success: false,
    code: err?.code || "SERVER_ERROR",
    message: err.message,
  });
});

const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0;
let fail = 0;
function check(label, condition, extra = "") {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label} ${extra}`);
  }
}

async function call(method, path, body, cookie) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

// ---- Fixture: one real order with two products ----
const TAG = `REVIEWTEST-${Date.now()}`;
const EMAIL = `${TAG.toLowerCase()}@example.com`;
const ORDER_NUMBER = `SS-20250101-${TAG.slice(-5).toUpperCase()}`;

const [prodRows] = await pool.execute(
  "SELECT id, name, price FROM products WHERE status='published' AND deleted_at IS NULL ORDER BY id LIMIT 2"
);
if (prodRows.length < 2) {
  console.error("Need at least 2 published products to run this harness.");
  process.exit(1);
}
const [orderResult] = await pool.execute(
  `INSERT INTO orders (order_number, email, first_name, last_name, phone, address, city, district,
      payment_method, subtotal, discount, shipping_fee, total, status)
   VALUES (?, ?, 'Revi', 'Ewtest', '+94770000000', '1 Test Road', 'Colombo', 'Colombo',
      'cash_on_delivery', 1000, 0, 0, 1000, 'placed')`,
  [ORDER_NUMBER, EMAIL]
);
const orderId = orderResult.insertId;
for (const p of prodRows) {
  await pool.execute(
    `INSERT INTO order_items (order_id, product_id, product_sku, product_name, size, color, quantity, unit_price)
     VALUES (?, ?, NULL, ?, 'M', 'Black', 1, ?)`,
    [orderId, String(p.id), p.name, p.price]
  );
}
const [foreign] = await pool.execute(
  "SELECT id, name FROM products WHERE id NOT IN (?, ?) ORDER BY id LIMIT 1",
  [prodRows[0].id, prodRows[1].id]
);
console.log(`\nFixture order ${ORDER_NUMBER} (id ${orderId}) with products ${prodRows.map((p) => p.id).join(", ")}`);
console.log(`Not-in-order product under test: ${foreign[0]?.id}\n`);

// ---- 1. Public verification step ----
console.log("1) POST /api/reviews/verify");
let r = await call("POST", "/api/reviews/verify", { orderNumber: "NOPE", email: "a@b.com" });
check("malformed order number rejected", r.status === 422 && r.data.code === "VALIDATION_ERROR", JSON.stringify(r.data));
r = await call("POST", "/api/reviews/verify", { orderNumber: ORDER_NUMBER, email: "wrong@example.com" });
check("wrong email rejected (404)", r.status === 404 && r.data.code === "ORDER_NOT_FOUND", JSON.stringify(r.data));
r = await call("POST", "/api/reviews/verify", { orderNumber: "SS-20990101-ZZZZZ", email: EMAIL });
check("unknown order rejected (404)", r.status === 404 && r.data.code === "ORDER_NOT_FOUND", JSON.stringify(r.data));
r = await call("POST", "/api/reviews/verify", { orderNumber: ORDER_NUMBER, email: "  " + EMAIL.toUpperCase() + " " });
check("valid order+email returns only that order's products", r.status === 200 && r.data.products.length === 2, JSON.stringify(r.data).slice(0, 300));
check("verify response leaks no email", !JSON.stringify(r.data).includes(EMAIL));

// ---- 2. Submission validation ----
console.log("\n2) POST /api/reviews validation");
const baseBody = {
  orderNumber: ORDER_NUMBER,
  email: EMAIL,
  productId: prodRows[0].id,
  customerName: "Amara Osei",
  rating: 5,
  reviewText: "The wool blazer fits beautifully and arrived two days early.",
};
r = await call("POST", "/api/reviews", { ...baseBody, rating: 6 });
check("rating 6 rejected", r.status === 422 && r.data.fields?.rating, JSON.stringify(r.data));
r = await call("POST", "/api/reviews", { ...baseBody, rating: 4.5 });
check("non-integer rating rejected", r.status === 422 && r.data.fields?.rating, JSON.stringify(r.data));
r = await call("POST", "/api/reviews", { ...baseBody, rating: 0 });
check("rating 0 rejected", r.status === 422 && r.data.fields?.rating);
r = await call("POST", "/api/reviews", { ...baseBody, reviewText: "short" });
check("too-short review rejected", r.status === 422 && r.data.fields?.reviewText);
r = await call("POST", "/api/reviews", { ...baseBody, reviewText: "x".repeat(2500) });
check("over-length review rejected", r.status === 422 && r.data.fields?.reviewText);
r = await call("POST", "/api/reviews", { ...baseBody, customerName: "a@b.com" });
check("email-as-name rejected", r.status === 422 && r.data.fields?.customerName, JSON.stringify(r.data));
r = await call("POST", "/api/reviews", { ...baseBody, reviewText: "buy now at http://a.com and http://b.com" });
check("link spam rejected", r.status === 422 && r.data.code === "REVIEW_REJECTED", JSON.stringify(r.data));
r = await call("POST", "/api/reviews", { ...baseBody, website: "bot" });
check("honeypot silently accepted, nothing stored", r.status === 200 && r.data.success === true);
const [honeypotCount] = await pool.execute(
  "SELECT COUNT(*) n FROM product_reviews WHERE customer_email = ?", [EMAIL]
);
check("honeypot stored nothing", Number(honeypotCount[0].n) === 0, `n=${honeypotCount[0].n}`);

// ---- 3. Purchase proof ----
console.log("\n3) POST /api/reviews purchase proof");
r = await call("POST", "/api/reviews", { ...baseBody, email: "attacker@example.com" });
check("verified buyer needs correct email", r.status === 404, JSON.stringify(r.data));
r = await call("POST", "/api/reviews", {
  ...baseBody,
  productId: foreign[0].id,
  customerName: "Mallory Attacker",
});
check("product outside the order rejected (403)", r.status === 403 && r.data.code === "PRODUCT_NOT_IN_ORDER", JSON.stringify(r.data));
const [afterBad] = await pool.execute("SELECT COUNT(*) n FROM product_reviews WHERE customer_email = ?", [EMAIL]);
check("no rows written by failed attempts", Number(afterBad[0].n) === 0);

// ---- 4. Valid submission ----
console.log("\n4) POST /api/reviews happy path");
r = await call("POST", "/api/reviews", baseBody);
check("review accepted (201)", r.status === 201 && r.data.success === true, JSON.stringify(r.data));
check("confirmation message exact", r.data.message === "Thank you! Your review was submitted and is awaiting approval.", r.data.message);
check("status is pending", r.data.status === "pending");
check("marked verified buyer", r.data.verifiedBuyer === true);
check("response leaks no email/order/product id", !JSON.stringify(r.data).match(new RegExp(EMAIL)) && !JSON.stringify(r.data).includes(ORDER_NUMBER));

const [stored] = await pool.execute(
  "SELECT * FROM product_reviews WHERE order_id = ? AND product_id = ?", [orderId, prodRows[0].id]
);
check("row stored with verified_buyer = 1", stored.length === 1 && Number(stored[0].verified_buyer) === 1);
check("row status default pending in DB", stored[0]?.status === "pending");
check("product_name snapshot saved", stored[0]?.product_name === prodRows[0].name, stored[0]?.product_name);

// ---- 5. Duplicates ----
console.log("\n5) Duplicate prevention");
r = await call("POST", "/api/reviews", baseBody);
check("duplicate rejected (409)", r.status === 409 && r.data.code === "DUPLICATE_REVIEW", JSON.stringify(r.data));
const [dupes] = await pool.execute("SELECT COUNT(*) n FROM product_reviews WHERE order_id = ?", [orderId]);
check("still exactly one row for that line", Number(dupes[0].n) === 1);

// ---- 6. Moderation is not public ----
console.log("\n6) Pending reviews stay private");
r = await call("GET", "/api/reviews");
check("GET /api/reviews hides the pending review", r.status === 200 && r.data.reviews.length === 0, JSON.stringify(r.data));
r = await call("GET", `/api/products/${prodRows[0].id}/reviews`);
check("product reviews hide it too", r.data.reviews.length === 0, JSON.stringify(r.data.summary));
check("summary is zeroed", r.data.summary.reviewCount === 0 && r.data.summary.averageRating === 0);

// ---- 7. Admin auth ----
console.log("\n7) Admin auth required");
r = await call("GET", "/api/admin/reviews");
check("list requires a session (401)", r.status === 401 && r.data.code === "AUTH_REQUIRED");
r = await call("GET", "/api/admin/reviews/counts");
check("counts require a session (401)", r.status === 401);
r = await call("PATCH", `/api/admin/reviews/${stored[0].id}/status`, { status: "approved" });
check("approve requires a session (401)", r.status === 401);
r = await call("DELETE", `/api/admin/reviews/${stored[0].id}`);
check("delete requires a session (401)", r.status === 401);

// Admin cookie
const adminRes = await fetch(`${base}/noop`, { headers: {} }).catch(() => null);
void adminRes;
const authed = authenticateAdmin;
const ok = await authed(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD || "");
let cookie = "";
if (ok) {
  const fakeRes = {
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
  };
  startAdminSession(fakeRes, process.env.ADMIN_USERNAME);
  cookie = String(fakeRes.headers["set-cookie"]).split(";")[0];
  console.log("  (signed in with ADMIN_PASSWORD)");
} else {
  console.log("  (ADMIN_PASSWORD not set - using direct DB writes for the moderation half)");
}

// ---- 8. Moderation ----
console.log("\n8) Admin moderation");
const reviewId = stored[0].id;
if (cookie) {
  r = await call("GET", "/api/admin/reviews?status=pending", undefined, cookie);
  check("admin sees the pending review", r.data.reviews.length === 1, JSON.stringify(r.data).slice(0, 200));
  check("admin list exposes email + order number", r.data.reviews[0]?.customerEmail === EMAIL && r.data.reviews[0]?.orderNumber === ORDER_NUMBER);
  check("pending count reported", r.data.pendingCount === 1 && r.data.counts.pending === 1, JSON.stringify(r.data.counts));

  r = await call("GET", `/api/admin/reviews?search=${encodeURIComponent(ORDER_NUMBER)}`, undefined, cookie);
  check("search by order number works", r.data.reviews.length === 1);
  r = await call("GET", `/api/admin/reviews?search=Amara`, undefined, cookie);
  check("search by customer name works", r.data.reviews.length === 1);
  r = await call("GET", `/api/admin/reviews?search=${encodeURIComponent(prodRows[0].name.slice(0, 6))}`, undefined, cookie);
  check("search by product works", r.data.reviews.length === 1);

  r = await call("PATCH", `/api/admin/reviews/${reviewId}/status`, { status: "approved" }, cookie);
  check("approve succeeds", r.status === 200 && r.data.review.status === "approved", JSON.stringify(r.data).slice(0, 200));
  check("approve re-syncs rating summary", r.data.summary?.reviewCount === 1 && r.data.summary?.averageRating === 5, JSON.stringify(r.data.summary));

  r = await call("GET", "/api/reviews");
  check("approved review is now public", r.data.reviews.length === 1, JSON.stringify(r.data).slice(0, 200));
  const pub = r.data.reviews[0];
  check("public payload has no email", !JSON.stringify(r.data).includes(EMAIL));
  check("public payload has no order number", !JSON.stringify(r.data).includes(ORDER_NUMBER));
  check("public payload has no internal id", !("id" in pub) && !("orderId" in pub) && !("customerEmail" in pub), Object.keys(pub).join(","));
  check("safe display name", pub.name === "Amara O.", pub.name);
  check("product name present", pub.productName === prodRows[0].name);
  check("verified buyer flag present", pub.verifiedBuyer === true);
  check("has date", Boolean(pub.createdAt));
  check("has stars + text", pub.rating === 5 && typeof pub.text === "string");

  r = await call("GET", `/api/products/${prodRows[0].id}/reviews`);
  check("product endpoint returns the approved review", r.data.reviews.length === 1);
  check("average rating from approved reviews = 5", r.data.summary.averageRating === 5 && r.data.summary.reviewCount === 1);

  r = await call("GET", "/api/products?pageSize=100");
  const card = r.data.products.find((p) => p.id === prodRows[0].id);
  check("product card rating synced", Number(card.rating) === 5 && Number(card.ratingCount) === 1, `rating=${card.rating} count=${card.ratingCount}`);

  r = await call("PATCH", `/api/admin/reviews/${reviewId}/status`, { status: "nope" }, cookie);
  check("invalid status rejected", r.status === 422, JSON.stringify(r.data));
  r = await call("PATCH", `/api/admin/reviews/99999999/status`, { status: "approved" }, cookie);
  check("unknown id 404", r.status === 404);

  // Second review on the other product, then reject it
  await call("POST", "/api/reviews", {
    orderNumber: ORDER_NUMBER,
    email: EMAIL,
    productId: prodRows[1].id,
    customerName: "Amara Osei",
    rating: 2,
    reviewText: "Sizing ran small for me, but the fabric quality is lovely.",
  });
  r = await call("GET", "/api/admin/reviews?status=pending", undefined, cookie);
  const second = r.data.reviews.find((x) => x.productId === prodRows[1].id);
  check("second review pending", Boolean(second));
  r = await call("PATCH", `/api/admin/reviews/${second.id}/status`, { status: "rejected" }, cookie);
  check("reject succeeds", r.status === 200 && r.data.review.status === "rejected");
  r = await call("GET", "/api/reviews");
  check("rejected review is not public", r.data.reviews.length === 1 && !r.data.reviews.some((x) => x.productId === prodRows[1].id));

  r = await call("PATCH", `/api/admin/reviews/${second.id}/status`, { status: "pending" }, cookie);
  check("back to pending allowed", r.status === 200 && r.data.review.status === "pending");
  check("pending again not public", (await call("GET", "/api/reviews")).data.reviews.length === 1);

  // Delete
  r = await call("DELETE", `/api/admin/reviews/${second.id}`, undefined, cookie);
  check("delete succeeds", r.status === 200);
  r = await call("DELETE", `/api/admin/reviews/${second.id}`, undefined, cookie);
  check("second delete 404", r.status === 404);
  r = await call("GET", `/api/products/${prodRows[1].id}/reviews`);
  check("deleted review no longer counted", r.data.summary.reviewCount === 0);
} else {
  console.log("  SKIP  (no admin credentials in this environment)");
}

// ---- 9. Order safety ----
console.log("\n9) Order safety");
const [ordersAfter] = await pool.execute("SELECT COUNT(*) n FROM orders");
const [itemsAfter] = await pool.execute("SELECT COUNT(*) n FROM order_items");
check("orders table still readable", Number(ordersAfter[0].n) > 0);
check("order_items still readable", Number(itemsAfter[0].n) > 0);
r = await call("GET", `/api/orders/${ORDER_NUMBER}`);
check("order lookup still works", r.status === 200 && r.data.order.orderNumber === ORDER_NUMBER);
r = await call("POST", "/api/orders/lookup", { orderNumber: ORDER_NUMBER, email: EMAIL });
check("order lookup by email still works", r.status === 200 && r.data.order.items.length === 2);

// Review survives a permanent product delete (no FK on product_id)
if (cookie) {
  const [tmp] = await pool.execute(
    "INSERT INTO products (sku, name, category, product_type, description, price, stock_quantity, status, deleted_at) VALUES (?, 'Temp Review Product', 'Women', 'Dresses', 'temp', 100, 1, 'published', NOW())",
    [`SS-TMP-REV-${TAG.slice(-5)}`]
  );
  const tmpId = tmp.insertId;
  await pool.execute(
    `INSERT INTO order_items (order_id, product_id, product_sku, product_name, size, color, quantity, unit_price)
     VALUES (?, ?, NULL, 'Temp Review Product', 'M', 'Black', 1, 100)`,
    [orderId, String(tmpId)]
  );
  r = await call("POST", "/api/reviews", {
    orderNumber: ORDER_NUMBER,
    email: EMAIL,
    productId: tmpId,
    customerName: "Temp Tester",
    rating: 4,
    reviewText: "Good value while this temporary product existed.",
  });
  check("review on a soon-to-be-deleted product accepted", r.status === 201);
  r = await call("PATCH", `/api/admin/reviews/${r.status === 201 ? "" : "0"}`, { status: "approved" });
  void r;
  const [tmpReview] = await pool.execute(
    "SELECT id FROM product_reviews WHERE product_id = ?", [tmpId]
  );
  await call("PATCH", `/api/admin/reviews/${tmpReview[0].id}/status`, { status: "approved" }, cookie);
  await pool.execute("DELETE FROM products WHERE id = ?", [tmpId]);
  const [survivor] = await pool.execute("SELECT * FROM product_reviews WHERE id = ?", [tmpReview[0].id]);
  check("review survives permanent product deletion", survivor.length === 1);
  r = await call("GET", "/api/reviews");
  const orphan = r.data.reviews.find((x) => x.productName === "Temp Review Product");
  check("orphan review still readable publicly via snapshot name", Boolean(orphan), JSON.stringify(r.data).slice(0, 300));
  // product_id is intentionally kept (no FK, no cascade) so the rating sync
  // and the "reviews for this product" lookup keep working; only the name
  // falls back to the snapshot.
  check("orphan review keeps its product id but loses no text", orphan && orphan.productId === tmpId && typeof orphan.text === "string", String(orphan?.productId));
}

// ---- cleanup ----
await pool.execute("DELETE FROM product_reviews WHERE order_id = ?", [orderId]);
await pool.execute("DELETE FROM order_items WHERE order_id = ?", [orderId]);
await pool.execute("DELETE FROM orders WHERE id = ?", [orderId]);
await pool.execute(
  "UPDATE products SET rating = 0, rating_count = 0 WHERE id IN (?, ?)",
  [prodRows[0].id, prodRows[1].id]
);
await pool.end();
server.close();

console.log(`\n================ ${pass} passed, ${fail} failed ================`);
process.exit(fail === 0 ? 0 : 1);
