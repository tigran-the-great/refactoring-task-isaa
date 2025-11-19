import { Router } from "express";
import {
  createOrder,
  getUserOrders,
  cancelOrder,
  applyCouponToOrder,
} from "../controllers/orders.controller";

import { auth } from "../middlewares/authMiddleware";

const router = Router();

router.post("/", auth, createOrder);

router.get("/", auth, getUserOrders);

router.post("/:id/cancel", auth, cancelOrder);

router.post("/:orderId/apply-coupon", auth, applyCouponToOrder);

export default router;
