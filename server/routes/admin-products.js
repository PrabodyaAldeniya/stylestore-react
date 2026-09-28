import express from "express";
import pool from "../db.js";
import {
  addProductImage,
  createProduct,
  deleteProduct,
  getProductById,
  listProductFacets,
  listProducts,
  productError,
  removeProductImage,
  removeProductImages,
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
router.use(requireAdmin);

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

async function removeUnreferencedImage(image) {
  const [rows] = await pool.execute(
    "SELECT 1 FROM order_items WHERE product_image_path = ? LIMIT 1",
    [image.path]
  );
  if (rows.length === 0) await removeImagePath(image.path);
}

router.get(
  "/",
  asyncRoute(async (req, res) => {
    const result = await listProducts({
      includeDrafts: true,
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search,
      category: req.query.category,
      productType: req.query.productType,
      status: parseStatusFilter(req.query.status),
      stock: parseStockFilter(req.query.stock),
      sort: req.query.sort,
    });
    res.json({ success: true, ...result });
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
      ...facets,
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

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const product = await getProductById(parseProductId(req.params.id), {
      includeDrafts: true,
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

        return getProductById(id, { includeDrafts: true, connection });
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
      const existing = await getProductById(id, { includeDrafts: true, connection, forUpdate: true });
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

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const id = parseProductId(req.params.id);
    const product = await getProductById(id, { includeDrafts: true });
    if (!product) throw productError("Product not found.", "NOT_FOUND", 404);
    await withTransaction((connection) => deleteProduct(id, connection));
    await Promise.all(product.images.map((image) => removeUnreferencedImage(image)));
    res.json({ success: true });
  })
);

export default router;
