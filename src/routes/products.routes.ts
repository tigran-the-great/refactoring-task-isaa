import { Router } from "express";
import {
  getAllProducts,
  createProduct,
  updateProductStock,
} from "../controllers/products.controller";
import { auth } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", getAllProducts);

router.post("/", auth, createProduct);

router.patch("/:id/stock", auth, updateProductStock);

export default router;
