import { Request, Response } from "express";
import { pool } from "../config/db";

export const createOrder = async (req: Request, res: Response) => {
  const { items } = req.body;
  const userId = req.user?.userId;

  try {
    await pool.query("BEGIN");

    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const productRes = await pool.query(
        "SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL",
        [item.productId]
      );

      if (productRes.rows.length === 0) {
        await pool.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: `Product ${item.productId} not found` });
      }

      const product = productRes.rows[0];

      if (product.stock < item.quantity) {
        await pool.query("ROLLBACK");
        return res.status(400).json({
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      await pool.query(
        `UPDATE products
         SET stock = stock - $1, updated_at = NOW()
         WHERE id = $2`,
        [item.quantity, product.id]
      );

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal,
      });
    }

    const orderRes = await pool.query(
      `INSERT INTO orders (user_id, total_amount, status, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [userId, totalAmount, "pending"]
    );

    const order = orderRes.rows[0];

    for (const item of orderItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [order.id, item.productId, item.quantity, item.price]
      );
    }

    await pool.query("COMMIT");

    const combined = await pool.query(
      `SELECT o.*,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price
              )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [order.id]
    );

    res.status(201).json(combined.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("createOrder error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  try {
    const result = await pool.query(
      `SELECT o.*,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price
              )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("getUserOrders error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    await pool.query("BEGIN");

    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (orderRes.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderRes.rows[0];

    if (order.status !== "pending") {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Can only cancel pending orders" });
    }

    const itemsRes = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [id]
    );

    for (const item of itemsRes.rows) {
      await pool.query(
        `UPDATE products SET stock = stock + $1, updated_at = NOW()
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      ["cancelled", id]
    );

    await pool.query("COMMIT");

    res.json({ message: "Order cancelled successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("cancelOrder error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const applyCouponToOrder = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { couponCode } = req.body;
  const userId = req.user?.userId;

  try {
    await pool.query("BEGIN");

    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );

    if (orderRes.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderRes.rows[0];

    if (order.status !== "pending") {
      await pool.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Can only apply coupons to pending orders" });
    }

    const existing = await pool.query(
      `SELECT * FROM coupon_usage WHERE order_id = $1`,
      [orderId]
    );

    if (existing.rows.length > 0) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Order already has a coupon" });
    }

    const couponRes = await pool.query(
      `SELECT * FROM coupons WHERE code = $1`,
      [couponCode]
    );

    if (couponRes.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Coupon not found" });
    }

    const coupon = couponRes.rows[0];

    if (!coupon.is_active) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Coupon is not active" });
    }

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Coupon is not yet valid" });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Coupon has expired" });
    }

    if (order.total_amount < coupon.min_order_amount) {
      await pool.query("ROLLBACK");
      return res.status(400).json({
        error: `Order must be at least $${coupon.min_order_amount}`,
      });
    }

    if (coupon.max_uses !== null) {
      const globalUse = await pool.query(
        `SELECT COUNT(*) AS usage_count FROM coupon_usage WHERE coupon_id = $1`,
        [coupon.id]
      );

      if (parseInt(globalUse.rows[0].usage_count) >= coupon.max_uses) {
        await pool.query("ROLLBACK");
        return res.status(400).json({ error: "Coupon usage limit reached" });
      }
    }

    if (coupon.max_uses_per_user !== null) {
      const userUse = await pool.query(
        `SELECT COUNT(*) AS usage_count
         FROM coupon_usage
         WHERE coupon_id = $1 AND user_id = $2`,
        [coupon.id, userId]
      );

      if (parseInt(userUse.rows[0].usage_count) >= coupon.max_uses_per_user) {
        await pool.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "You reached max usage for this coupon" });
      }
    }

    let discountAmount = 0;

    if (coupon.discount_type === "percentage") {
      discountAmount = (order.total_amount * coupon.discount_value) / 100;

      if (
        coupon.max_discount_amount &&
        discountAmount > coupon.max_discount_amount
      ) {
        discountAmount = coupon.max_discount_amount;
      }
    } else if (coupon.discount_type === "fixed") {
      discountAmount = Math.min(coupon.discount_value, order.total_amount);
    } else {
      await pool.query("ROLLBACK");
      return res.status(500).json({ error: "Invalid discount type" });
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const newTotal = order.total_amount - discountAmount;

    await pool.query(
      `UPDATE orders SET total_amount = $1, updated_at = NOW()
       WHERE id = $2`,
      [newTotal, orderId]
    );

    await pool.query(
      `INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [coupon.id, userId, orderId, discountAmount]
    );

    await pool.query("COMMIT");

    const updatedOrder = await pool.query(
      `SELECT o.*,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price
              )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [orderId]
    );

    res.json({
      order: updatedOrder.rows[0],
      discount: {
        code: coupon.code,
        amount: discountAmount,
        originalTotal: order.total_amount,
        newTotal: newTotal,
      },
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("applyCouponToOrder error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
