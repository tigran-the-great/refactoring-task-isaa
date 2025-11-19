import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";

export function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  try {
    const token = header.split(" ")[1];
    req.user = verifyJwt(token) as any;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
