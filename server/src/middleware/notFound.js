export function notFound(request, response) {
  return response.status(404).json({ error: "Route not found" });
}
