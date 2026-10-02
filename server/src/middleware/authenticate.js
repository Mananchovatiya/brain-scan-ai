import { User } from "../models/User.js";
import { getTokenFromRequest, verifyAccessToken } from "../utils/jwt.js";

export async function authenticate(request, response, next) {
  const token = getTokenFromRequest(request);
  if (!token) return response.status(401).json({ error: "Unauthorized" });

  try {
    const payload = verifyAccessToken(token);
    if (!payload || typeof payload !== "object" || typeof payload.sub !== "string") {
      return response.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(payload.sub).select("name email emailVerified image role phone medicalRegistrationNumber specialization clinic isActive tokenVersion");
    if (!user || !user.isActive || (payload.tokenVersion ?? 0) !== user.tokenVersion) {
      return response.status(401).json({ error: "Unauthorized" });
    }

    request.user = user;
    request.auth = {
      userId: String(user._id),
      expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
    };
    return next();
  } catch {
    return response.status(401).json({ error: "Unauthorized" });
  }
}
