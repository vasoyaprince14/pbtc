import { SessionOptions } from "iron-session";

export type SessionData = {
  userId?: number;
  username?: string;
  name?: string;
  role?: string;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "pbtc-dev-secret-change-me-32chars-min-length-please",
  cookieName: "pbtc_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  },
};
