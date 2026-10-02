import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { clearAuthCookie, getTokenFromRequest, setAuthCookie, signAccessToken, verifyAccessToken } from "../utils/jwt.js";

const passwordRounds = 12;

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    image: user.image ?? null,
    role: user.role,
    phone: user.phone ?? "",
    medicalRegistrationNumber: user.medicalRegistrationNumber ?? "",
    specialization: user.specialization ?? "",
    clinic: user.clinic ?? "",
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function issueSession(user, response) {
  const token = signAccessToken(user);
  setAuthCookie(response, token);
  return { token, user: publicUser(user) };
}

export async function signUp(request, response) {
  const input = request.body;
  try {
    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await bcrypt.hash(input.password, passwordRounds),
      role: "doctor",
      phone: input.phone,
      medicalRegistrationNumber: input.medicalRegistrationNumber,
      specialization: input.specialization,
      clinic: input.clinic,
      isActive: true,
    });
    return response.status(201).json(issueSession(user, response));
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: "An account with this email already exists" });
    throw error;
  }
}

export async function signIn(request, response) {
  const user = await User.findOne({ email: request.body.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(request.body.password, user.passwordHash))) {
    return response.status(401).json({ error: "Email or password is incorrect" });
  }
  if (!user.isActive) {
    return response.status(403).json({ error: "This account is inactive. Contact your administrator." });
  }
  return response.json(issueSession(user, response));
}

export function getSession(request, response) {
  return response.json({
    session: { userId: request.auth.userId, expiresAt: request.auth.expiresAt },
    user: publicUser(request.user),
  });
}

export async function signOut(request, response) {
  const token = getTokenFromRequest(request);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      if (payload && typeof payload === "object" && typeof payload.sub === "string") {
        await User.updateOne({ _id: payload.sub }, { $inc: { tokenVersion: 1 } });
      }
    } catch {
      // Clear invalid and expired browser tokens as well.
    }
  }
  clearAuthCookie(response);
  return response.json({ success: true });
}

export async function updateProfile(request, response) {
  const user = await User.findByIdAndUpdate(
    request.auth.userId,
    { $set: request.body },
    { new: true, runValidators: true },
  );
  if (!user) return response.status(404).json({ error: "Account not found" });
  return response.json({ user: publicUser(user) });
}

export async function changePassword(request, response) {
  const user = await User.findById(request.auth.userId).select("+passwordHash");
  if (!user) return response.status(404).json({ error: "Account not found" });
  if (!(await bcrypt.compare(request.body.currentPassword, user.passwordHash))) {
    return response.status(400).json({ error: "Current password is incorrect" });
  }

  user.passwordHash = await bcrypt.hash(request.body.newPassword, passwordRounds);
  user.tokenVersion += 1;
  await user.save();
  return response.json(issueSession(user, response));
}
