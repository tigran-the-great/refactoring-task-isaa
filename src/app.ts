import express from "express";
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/products.routes";
import orderRoutes from "./routes/order.routes";
import couponRoutes from "./routes/coupon.routes";

const app = express();
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/coupons", couponRoutes);

export default app;
