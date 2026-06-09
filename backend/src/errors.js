export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function mapSupabaseError(error) {
  const message = error?.message ?? "Supabase request failed";
  if (error?.code === "23503") {
    return new AppError(
      409,
      "dependency_conflict",
      "The record is still referenced by other data"
    );
  }
  if (error?.code === "23505") {
    return new AppError(409, "conflict", "The record already exists");
  }
  if (error?.code === "23514") {
    return new AppError(
      400,
      "validation_error",
      "The data violates a database constraint"
    );
  }

  const knownErrors = {
    admin_required: [403, "forbidden", "Administrator access is required"],
    insufficient_inventory: [409, "insufficient_inventory", "Not enough inventory is available"],
    invalid_quantity: [400, "validation_error", "Quantity must be between 1 and 1000"],
    inventory_not_found: [404, "not_found", "Inventory item was not found"],
    inventory_unavailable: [409, "inventory_unavailable", "Inventory item is unavailable"],
    not_authenticated: [401, "unauthorized", "Authentication is required"],
    reservation_not_found: [404, "not_found", "Reservation was not found"],
    reservation_not_held: [409, "reservation_not_held", "Reservation is no longer active"]
  };

  for (const [token, [statusCode, code, publicMessage]] of Object.entries(knownErrors)) {
    if (message.includes(token)) {
      return new AppError(statusCode, code, publicMessage);
    }
  }

  return new AppError(502, "supabase_error", "The data service request failed", {
    message
  });
}
