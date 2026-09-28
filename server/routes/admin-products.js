import express from "express";
import pool from "../db.js";
import {
  addProductImage,
  countTrashedProducts,
  createProduct,
  deleteProductPermanently,
  getProductById,
  listProductFacets,
  listProducts,
  moveProductToTrash,
  productError,
  removeProductImage,
  removeProductImages,
  restoreProductFromTrash,
  setPrimaryProductImage,
  updateProduct,
} from "../repositories/products.js";
import {
  MAX_IMAGE_COUNT,
  MAX_IMAGE_BYTES,
  productImageUpload,
  publicPathForUpload,
  removeImagePath,
  removeUploadedFiles,
  uploadErrorForMulter,
  verifyUploadedImages,
} from "../lib/uploads.js";
import {
  parseProductId,
  PRODUCT_STATUSES,
  validateProduct,
} from "../validation/product.js";
import { requireAdmin } from "../lib/auth.js";

const router = express.Router();
// Every route below sits behind the existing admin session check.
router.use(requireAdmin);

// The word an admin has to type before a product is destroyed for good. It is
// echoed back in the error so the UI can show exactly what is expected.
const PERMANENT_DELETE_CONFIRMATION = "DELETE";

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function sendError(res, error) {
  const status = Number(error?.status) || 500;
  res.status(status).json({
    success: false,
    code: error?.code || "PRODUCT_ERROR",
    message: status === 500 ? "Unexpected server error." : error.message,
    ...(error?.fields ? { fields: error.fields } : {}),
  });
}

async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function processImageUpload(req, res, next) {
  if (!req.is("multipart/form-data")) return next();
  productImageUpload(req, res, async (error) => {
    if (error) {
      await removeUploadedFiles(req.files || []);
      return sendError(res, uploadErrorForMulter(error));
    }
    try {
      req.uploadedFiles = await verifyUploadedImages(req.files || []);
      return next();
    } catch (uploadError) {
      return sendError(res, uploadError);
    }
  });
}

function productBody(req) {
  return req.body && typeof req.body === "object" ? req.body : {};
}

/** Accepts a JSON array, a repeated form field, or a comma separated list. */
function parseIdList(value) {
  if (value === undefined || value === null || value === "") return [];
  const raw = Array.isArray(value) ? value : [value];
  const collected = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) collected.push(...parsed);
        continue;
      } catch {
        collected.push(...trimmed.split(","));
        continue;
      }
    }
    collected.push(...trimmed.split(","));
  }
  return collected
    .map((item) => Number(String(item).trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function parseOptionalId(value) {
  const id = Number(String(value ?? "").trim());
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Position of a freshly uploaded photo inside the batch. Unlike a database id
 * this is a 0-based index, so 0 is a valid value and must not be treated as
 * "not supplied" (that bug silently dropped "make the first photo main").
 */
function parseOptionalIndex(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const index = Number(String(value).trim());
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function parseStatusFilter(value) {
  if (value === undefined || value === "") return "";
  const status = String(value).trim();
  if (!PRODUCT_STATUSES.includes(status)) {
    throw productError(
      "Status must be draft, published, or archived.",
      "VALIDATION_ERROR",
      422
    );
  }
  return status;
}

function parseStockFilter(value) {
  if (value === undefined || value === "") return "";
  const stock = String(value).trim();
  if (!["in_stock", "low_stock", "out_of_stock"].includes(stock)) {
    throw productError(
      "Stock filter must be in_stock, low_stock, or out_of_stock.",
      "VALIDATION_ERROR",
      422
    );
  }
  return stock;
}

function addFilesToProduct(productId, files, connection, existingImageCount = 0) {
  if (files.length > 0 && existingImageCount + files.length > MAX_IMAGE_COUNT) {
    throw productError(
      `A product can have at most ${MAX_IMAGE_COUNT} images.`,
      "IMAGE_LIMIT",
      422
    );
  }
  return files.reduce(
    (promise, file, index) =>
      promise.then(() =>
        addProductImage(
          productId,
          {
            path: publicPathForUpload(file.filename),
            altText: "",
            sortOrder: existingImageCount + index,
            // A product with no images at all needs a main photo, otherwise
            // the storefront and preview have nothing to show.
            isPrimary: existingImageCount === 0 && index === 0,
          },
          connection
        )
      ),
    Promise.resolve()
  );
}

async function removeUnreferencedImagePath(imagePath) {
  // order_items keeps its own copy of the photo path it was bought with, so a
  // file that a previous order still points at is never removed from disk.
  const [rows] = await pool.execute(
    "SELECT 1 FROM order_items WHERE product_image_path = ? LIMIT 1",
    [imagePath]
  );
  if (rows.length === 0) await removeImagePath(imagePath);
}

async function removeUnreferencedImage(image) {
  await removeUnreferencedImagePath(image.path);
}

/** Shared filter parsing for the product list and the Trash list. */
function listFiltersFromQuery(query) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    category: query.category,
    productType: query.productType,
    status: parseStatusFilter(query.status),
    stock: parseStockFilter(query.stock),
  };
}

// Normal admin product list. Trashed products are excluded by the repository,
// and `trashCount` lets the admin UI show how many are waiting in the Trash.
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const result = await listProducts({
      includeDrafts: true,
      ...listFiltersFromQuery(req.query),
      sort: req.query.sort,
    });
    res.json({
      success: true,
      ...result,
      trashCount: await countTrashedProducts(),
    });
  })
);

// Upload limits + product taxonomy so the admin UI never has to guess.
router.get(
  "/meta",
  asyncRoute(async (_req, res) => {
    const facets = await listProductFacets({ includeDrafts: true });
    res.json({
      success: true,
      maxImageCount: MAX_IMAGE_COUNT,
      maxImageBytes: MAX_IMAGE_BYTES,
      statuses: PRODUCT_STATUSES,
      trashCount: await countTrashedProducts(),
      permanentDeleteConfirmation: PERMANENT_DELETE_CONFIRMATION,
      ...facets,
    });
  })
);

// ------------------------------------------------------------
// TRASH — soft delete endpoints
// ------------------------------------------------------------
// Declared before "/:id" so "trash" is never parsed as a product id.
// Every response is JSON in the same shape as the rest of this router, and
// every route already sits behind requireAdmin.
// ------------------------------------------------------------
router.get(
  "/trash",
  asyncRoute(async (req, res) => {
    const result = await listProducts({
      // Trash shows every status a trashed product kept, newest first.
      includeDrafts: true,
      trashOnly: true,
      sort: req.query.sort || "deleted-desc",
      ...listFiltersFromQuery(req.query),
    });
    res.json({
      success: true,
      ...result,
      trashCount: await countTrashedProducts(),
    });
  })
);

router.post(
  "/",
  processImageUpload,
  asyncRoute(async (req, res) => {
    const primaryNewIndex = parseOptionalIndex(req.body?.primaryNewIndex);
    let product;
    try {
      product = await withTransaction(async (connection) => {
        const data = validateProduct(productBody(req));
        const created = await createProduct(data, connection);
        const files = req.uploadedFiles || [];
        await addFilesToProduct(created.id, files, connection);
        // Honour "make this one the main photo" while the product is still new.
        if (primaryNewIndex !== null && files[primaryNewIndex]) {
          const [promoted] = await connection.query(
            "SELECT id FROM product_images WHERE path = ? AND product_id = ?",
            [publicPathForUpload(files[primaryNewIndex].filename), created.id]
          );
          if (promoted.length) {
            await setPrimaryProductImage(created.id, promoted[0].id, connection);
          }
        }
        return getProductById(created.id, { includeDrafts: true, connection });
      });
    } catch (error) {
      await removeUploadedFiles(req.uploadedFiles || []);
      throw error;
    }
    res.status(201).json({ success: true, product });
  })
);

// One product, including one that is in the Trash, so the admin Trash page
// and the editor can both still show the full details before restoring.
router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const product = await getProductById(parseProductId(req.params.id), {
      includeDrafts: true,
      includeTrashed: true,
    });
    if (!product) throw productError("Product not found.", "NOT_FOUND", 404);
    res.json({ success: true, product });
  })
);

router.put(
  "/:id",
  processImageUpload,
  asyncRoute(async (req, res) => {
    const id = parseProductId(req.params.id);
    const body = productBody(req);
    const removeImageIds = parseIdList(body.removeImageIds);
    const primaryImageId = parseOptionalId(body.primaryImageId);
    const primaryNewIndex = parseOptionalIndex(body.primaryNewIndex);

    let product;
    let removedImages = [];
    try {
      product = await withTransaction(async (connection) => {
        const data = validateProduct(body);
        const existing = await getProductById(id, {
          includeDrafts: true,
          connection,
          forUpdate: true,
        });
        if (!existing) throw productError("Product not found.", "NOT_FOUND", 404);

        await updateProduct(id, data, connection);

        // Staged image edits from the admin form, applied in the same
        // transaction as the field updates so a failure changes nothing.
        removedImages = await removeProductImages(id, removeImageIds, connection);
        const remaining = Math.max(existing.images.length - removedImages.length, 0);
        const files = req.uploadedFiles || [];

        if (primaryImageId) {
          const [stillThere] = await connection.query(
            "SELECT id FROM product_images WHERE id = ? AND product_id = ?",
            [primaryImageId, id]
          );
          if (stillThere.length) {
            await setPrimaryProductImage(id, primaryImageId, connection);
          }
        }

        await addFilesToProduct(id, files, connection, remaining);

        // The chosen main image can be one of the new uploads. This has to run
        // after the inserts, otherwise the row does not exist yet and the
        // lookup below finds nothing.
        if (primaryNewIndex !== null && files[primaryNewIndex]) {
          const [promoted] = await connection.query(
            "SELECT id FROM product_images WHERE path = ? AND product_id = ?",
            [publicPathForUpload(files[primaryNewIndex].filename), id]
          );
          if (promoted.length) {
            await setPrimaryProductImage(id, promoted[0].id, connection);
          }
        }

        return getProductById(id, { includeDrafts: true, includeTrashed: true, connection });
      });
    } catch (error) {
      await removeUploadedFiles(req.uploadedFiles || []);
      throw error;
    }
    await Promise.all(removedImages.map((image) => removeUnreferencedImage(image)));
    res.json({ success: true, product });
  })
);

router.patch(
  "/:id/status",
  asyncRoute(async (req, res) => {
    const id = parseProductId(req.params.id);
    const status = String(req.body?.status || "").trim();
    if (!PRODUCT_STATUSES.includes(status)) {
      throw productError(
        "Status must be draft, published, or archived.",
        "VALIDATION_ERROR",
        422
      );
    }
    const product = await withTransaction(async (connection) => {
      const existing = await getProductById(id, {
        includeDrafts: true,
        includeTrashed: true,
        connection,
        forUpdate: true,
      });
      if (!existing) throw productError("Product not found.", "NOT_FOUND", 404);
      return updateProduct(id, { ...existing, status }, connection);
    });
    if (!product) throw productError("Product not found.", "NOT_FOUND", 404);
    res.json({ success: true, product });
  })
);

router.post(
  "/:id/images",
  processImageUpload,
  asyncRoute(async (req, res) => {
    const id = parseProductId(req.params.id);
    let product;
    try {
      product = await withTransaction(async (connection) => {
        const existing = await getProductById(id, { includeDrafts: true, connection, forUpdate: true });
        if (!existing) throw productError("Product not found.", "NOT_FOUND", 404);
        await addFilesToProduct(id, req.uploadedFiles || [], connection, existing.images.length);
        return getProductById(id, { includeDrafts: true, connection });
      });
    } catch (error) {
      await removeUploadedFiles(req.uploadedFiles || []);
      throw error;
    }
    res.status(201).json({ success: true, product });
  })
);

router.patch(
  "/:id/images/:imageId/primary",
  asyncRoute(async (req, res) => {
    const product = await setPrimaryProductImage(
      parseProductId(req.params.id),
      parseProductId(req.params.imageId)
    );
    res.json({ success: true, product });
  })
);

router.delete(
  "/:id/images/:imageId",
  asyncRoute(async (req, res) => {
    const image = await removeProductImage(
      parseProductId(req.params.id),
      parseProductId(req.params.imageId)
    );
    if (!image) throw productError("Image not found.", "NOT_FOUND", 404);
    await removeUnreferencedImage(image);
    const product = await getProductById(parseProductId(req.params.id), {
      includeDrafts: true,
    });
    res.json({ success: true, product });
  })
);

// ========================================================
// TRASH ACTIONS
// --------------------------------------------------------
// The shared "move to Trash" step. It only stamps `deleted_at`, so the product
// row, its photos, sizes and colours all survive and the product can be
// restored later with the status it had before.
// ========================================================
async function trashProduct(id) {
  return withTransaction(async (connection) => {
    // FOR UPDATE so two clicks at once cannot both stamp the same row.
    const existing = await getProductById(id, {
      includeDrafts: true,
      includeTrashed: true,
      connection,
      forUpdate: true,
    });
    if (!existing) throw productError("Product not found.", "NOT_FOUND", 404);
    if (existing.isTrashed) {
      throw productError(
        `"${existing.name}" is already in the Trash.`,
        "ALREADY_TRASHED",
        409
      );
    }
    const moved = await moveProductToTrash(id, connection);
    if (!moved) {
      throw productError("Product not found.", "NOT_FOUND", 404);
    }
    return getProductById(id, {
      includeDrafts: true,
      includeTrashed: true,
      connection,
    });
  });
}

function trashResponseMessage(product) {
  return `Product moved to Trash: "${product.name}". You can restore it from the Trash.`;
}

/** POST /api/admin/products/:id/trash — soft delete. */
router.post(
  "/:id/trash",
  asyncRoute(async (req, res) => {
    const product = await trashProduct(parseProductId(req.params.id));
    res.json({
      success: true,
      product,
      trashCount: await countTrashedProducts(),
      message: trashResponseMessage(product),
    });
  })
);

/**
 * DELETE /api/admin/products/:id — kept as a soft delete for any older
 * bookmarked/tab that still uses it. It behaves exactly like POST /:id/trash:
 * nothing is destroyed.
 */
router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const product = await trashProduct(parseProductId(req.params.id));
    res.json({
      success: true,
      product,
      trashCount: await countTrashedProducts(),
      message: trashResponseMessage(product),
    });
  })
);

/** POST /api/admin/products/:id/restore — clears `deleted_at`, keeps `status`. */
router.post(
  "/:id/restore",
  asyncRoute(async (req, res) => {
    const product = await withTransaction(async (connection) => {
      const existing = await getProductById(parseProductId(req.params.id), {
        includeDrafts: true,
        includeTrashed: true,
        connection,
        forUpdate: true,
      });
      if (!existing) throw productError("Product not found.", "NOT_FOUND", 404);
      if (!existing.isTrashed) {
        throw productError(
          `"${existing.name}" is not in the Trash.`,
          "NOT_TRASHED",
          409
        );
      }
      const restored = await restoreProductFromTrash(existing.id, connection);
      if (!restored) throw productError("Product not found.", "NOT_FOUND", 404);
      return getProductById(existing.id, {
        includeDrafts: true,
        includeTrashed: true,
        connection,
      });
    });
    res.json({
      success: true,
      product,
      trashCount: await countTrashedProducts(),
      // A restored product is only visible in the store again when its status
      // was (and still is) "published".
      publicAgain: product.status === "published",
      message: `Product restored successfully: "${product.name}" is back in your product list.`,
    });
  })
);

/**
 * DELETE /api/admin/products/:id/permanent — the only endpoint that destroys
 * data. It is guarded three times over:
 *   1. the admin session (requireAdmin, applied to the whole router),
 *   2. the product must already be in the Trash,
 *   3. the request must carry the exact confirmation word.
 */
router.delete(
  "/:id/permanent",
  asyncRoute(async (req, res) => {
    const id = parseProductId(req.params.id);
    const confirmation = String(req.body?.confirm || "").trim();
    if (confirmation !== PERMANENT_DELETE_CONFIRMATION) {
      throw productError(
        `Type ${PERMANENT_DELETE_CONFIRMATION} to confirm this permanent deletion.`,
        "CONFIRMATION_REQUIRED",
        422
      );
    }

    const outcome = await withTransaction(async (connection) => {
      const existing = await getProductById(id, {
        includeDrafts: true,
        includeTrashed: true,
        connection,
        forUpdate: true,
      });
      if (!existing) throw productError("Product not found.", "NOT_FOUND", 404);
      if (!existing.isTrashed) {
        throw productError(
          "Only products in the Trash can be permanently deleted. Move it to the Trash first.",
          "NOT_TRASHED",
          409
        );
      }
      // Images, sizes and colours go with the product through the existing
      // ON DELETE CASCADE keys. Orders are untouched: order_items holds its own
      // copy of the name, SKU, price and photo path, with no foreign key to
      // products, so past orders keep every detail.
      const result = await deleteProductPermanently(id, connection);
      if (!result.deleted) throw productError("Product not found.", "NOT_FOUND", 404);
      return { product: existing, imagePaths: result.imagePaths };
    });

    // Only unlink files no order still points at.
    await Promise.all(outcome.imagePaths.map((imagePath) => removeUnreferencedImagePath(imagePath)));

    res.json({
      success: true,
      productName: outcome.product.name,
      trashCount: await countTrashedProducts(),
      message: `Product permanently deleted: "${outcome.product.name}" cannot be restored.`,
    });
  })
);

export default router;
