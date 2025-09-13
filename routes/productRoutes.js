import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
  getProductsByCategory,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", getAllProducts);
router.get("/categories", getAllCategories);
router.get("/category/:category", getProductsByCategory);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
