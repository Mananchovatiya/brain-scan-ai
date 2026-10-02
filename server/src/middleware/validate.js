/** Validate one Express request property against a Zod schema. */
export function validate(schema, source = "body") {
  return function validateRequest(request, response, next) {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      return response.status(400).json({
        error: "Invalid request data",
        details: result.error.flatten(),
      });
    }

    request[source] = result.data;
    return next();
  };
}
