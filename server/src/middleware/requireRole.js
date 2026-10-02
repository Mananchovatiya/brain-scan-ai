/** Restrict access to one of the application's existing roles. */
export function requireRole(...roles) {
  return function authorizeRole(request, response, next) {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
