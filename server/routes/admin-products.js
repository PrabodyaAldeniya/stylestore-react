import express from "express";
import pool from "../db.js";
import {
  addProductImage,
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  productError,
  removeProductImage,
  setPrimaryProductImage,
  updateProduct,
} from "../repositories/products.js";
import {
  MAX_IMAGE_COUNT,
  productImageUpload,
  publicPathForUpload,
  removeImagePath,
  removeUploadedFiles,
  uploadErrorForMulter,
  verifyUploadedImages,
} from "../lib/uploads.js";
import { parseProductId, validateProduct } from "../validation/product.js";
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

function parseStatusFilter(value) {
  if (value === undefined || value === "") return "";
  const status = String(value).trim();
  if (!["draft", "published"].includes(status)) {
    throw productError("Status must be draft or published.", "VALIDATION_ERROR", 422);
  }
  return status;
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
      status: parseStatusFilter(req.query.status),
      sort: req.query.sort,
    });
    res.json({ success: true, ...result });
  })
);

router.post(
  "/",
  processImageUpload,
  asyncRoute(async (req, res) => {
    let product;
    try {
      product = await withTransaction(async (connection) => {
        const data = validateProduct(productBody(req));
        const created = await createProduct(data, connection);
        await addFilesToProduct(created.id, req.uploadedFiles || [], connection);
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
    let product;
    try {
      product = await withTransaction(async (connection) => {
        const data = validateProduct(productBody(req));
        const existing = await getProductById(id, { includeDrafts: true, connection, forUpdate: true });
        if (!existing) throw productError("Product not found.", "NOT_FOUND", 404);
        await updateProduct(id, data, connection);
        await addFilesToProduct(
          id,
          req.uploadedFiles || [],
          connection,
          existing.images.length
        );
        return getProductById(id, { includeDrafts: true, connection });
      });
    } catch (error) {
      await removeUploadedFiles(req.uploadedFiles || []);
      throw error;
    }
    res.json({ success: true, product });
  })
);

router.patch(
  "/:id/status",
  asyncRoute(async (req, res) => {
    const id = parseProductId(req.params.id);
    const status = String(req.body?.status || "").trim();
    if (!["draft", "published"].includes(status)) {
      throw productError("Status must be draft or published.", "VALIDATION_ERROR", 422);
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
