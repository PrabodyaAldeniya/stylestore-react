import express from "express";
import {
  getProductById,
  listProductFacets,
  listProducts,
} from "../repositories/products.js";
import { parseProductId } from "../validation/product.js";

const router = express.Router();

function sendError(res, error) {
  const status = Number(error?.status) || 500;
  res.status(status).json({
    success: false,
    code: error?.code || "PRODUCT_ERROR",
    message: status === 500 ? "Unexpected server error." : error.message,
  });
}

router.get("/", async (req, res, next) => {
  try {
    const result = await listProducts({
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search,
      category: req.query.category,
      productType: req.query.productType,
      sort: req.query.sort,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get("/categories", async (_req, res, next) => {
  try {
    const { default: pool } = await import("../db.js");
    // `deleted_at IS NULL` keeps products in the Trash out of the public
    // category navigation, exactly like every other public read.
    const [rows] = await pool.query(
      "SELECT DISTINCT category FROM products WHERE status = 'published' AND deleted_at IS NULL ORDER BY category"
    );
    res.json({ success: true, categories: rows.map((row) => row.category) });
  } catch (error) {
    next(error);
  }
});

// Category + product-type navigation for the public catalogue. Declared
// before "/:id" so "facets" is not parsed as a product id.
// Only `categories` is returned: `trashedCategories` stays admin-only, so a
// visitor can never learn how many deleted products exist.
router.get("/facets", async (_req, res, next) => {
  try {
    const { categories } = await listProductFacets();
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await getProductById(parseProductId(req.params.id));
    if (!product) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "Product not found.",
      });
    }
    return res.json({ success: true, product });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
