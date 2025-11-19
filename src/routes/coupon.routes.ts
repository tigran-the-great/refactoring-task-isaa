import { Router } from "express";


import { auth } from "../middlewares/authMiddleware";
import { createCoupon, getAllCoupons } from "../controllers/coupons.controller";

const router = Router();

router.get("/", getAllCoupons);

router.post("/", auth, createCoupon);

export default router;
