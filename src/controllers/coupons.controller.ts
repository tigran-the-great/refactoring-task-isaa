import { Request, Response } from "express";
import { pool } from "../config/db";

export const getAllCoupons = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, code, description, discount_type, discount_value,
             min_order_amount, max_discount_amount, valid_from,
             valid_until, max_uses, max_uses_per_user
      FROM coupons
      WHERE is_active = true
        AND (valid_until IS NULL OR valid_until > NOW())
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("getAllCoupons error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createCoupon = async (req: Request, res: Response) => {
  const {
    code,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount_amount,
    max_uses,
    max_uses_per_user,
    valid_until,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO coupons
       (code, description, discount_type, discount_value,
        min_order_amount, max_discount_amount, max_uses,
        max_uses_per_user, valid_until, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        code,
        description,
        discount_type,
        discount_value,
        min_order_amount,
        max_discount_amount,
        max_uses,
        max_uses_per_user,
        valid_until,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("createCoupon error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
