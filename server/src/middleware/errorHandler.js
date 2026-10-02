export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);

  const status = error.code === "LIMIT_FILE_SIZE"
    ? 413
    : Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500;

  if (status >= 500) {
    console.error("Unhandled API error", {
      method: request.method,
      path: request.path,
      name: error.name,
    });
  }

  const message = status >= 500
    ? "Internal server error"
    : error.publicMessage || error.message || "Request failed";

  return response.status(status).json({ error: message });
}
