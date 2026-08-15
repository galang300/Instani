import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { env } from "./config.js";

export type AuthUserToken = {
  id: string;
  phone?: string;
  email?: string;
  username?: string;
  role?: string;
};

export function signAuthToken(user: {
  id: string;
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  role: string;
}) {
  return jwt.sign(
    {
      sub: user.id,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      username: user.username ?? user.phone ?? user.email ?? undefined,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function readBearerToken(authorization?: string) {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export function verifyAuthToken(authorization?: string): AuthUserToken | null {
  const token = readBearerToken(authorization);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, env.jwtSecret) as string | JwtPayload;
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return null;
    }

    return {
      id: payload.sub,
      phone: typeof payload.phone === "string" ? payload.phone : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      username: typeof payload.username === "string" ? payload.username : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined
    };
  } catch {
    return null;
  }
}
