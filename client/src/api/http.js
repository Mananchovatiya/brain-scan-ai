const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

export async function request(path, options = {}) {
  const formData = options.body instanceof FormData;
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: "include",
    headers: formData
      ? options.headers
      : { "Content-Type": "application/json", ...options.headers },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = payload.details;
    throw error;
  }
  return payload;
}
