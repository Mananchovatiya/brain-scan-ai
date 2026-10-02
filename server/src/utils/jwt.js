import jwt from "jsonwebtoken";

const issuer = "brainscan-api";
const audience = "brainscan-client";
const expiresIn = "7d";
const cookieName = "brainscan_token";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export function signAccessToken(user) {
  return jwt.sign({ tokenVersion: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, {
    subject: String(user._id),
    issuer,
    audience,
    expiresIn,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { issuer, audience });
}

export function getTokenFromRequest(request) {
  const bearer = request.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return bearer;

  const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(cookieName.length + 1));
  } catch {
    return null;
  }
}

export function setAuthCookie(response, token) {
  response.cookie(cookieName, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookie(response) {
  response.clearCookie(cookieName, cookieOptions);
}
