import { Request, Response } from "express";
import { pool } from "../config/db";

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getAllProducts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const { name, description, price, stock } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [name, description, price, stock]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createProduct error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProductStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stock } = req.body;

  try {
    const result = await pool.query(
      `UPDATE products SET stock = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [stock, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Product not found" });

    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateProductStock error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
