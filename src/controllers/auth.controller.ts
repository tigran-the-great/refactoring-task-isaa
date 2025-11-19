import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/db";
import { signJwt } from "../utils/jwt";

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existing.rows.length > 0)
      return res.status(400).json({ error: "User already exists" });

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users(email, password, name, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id, email, name`,
      [email, hash, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Internal server error", e });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signJwt({ userId: user.id, email: user.email });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
};
