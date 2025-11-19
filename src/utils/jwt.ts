import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = (process.env.JWT_SECRET || "default-secret") as string;

export function signJwt(payload: object, expiresIn: number = 24 * 60 * 60) {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyJwt(token: string) {
  return jwt.verify(token, JWT_SECRET);
}
