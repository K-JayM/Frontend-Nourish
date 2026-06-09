import { AppError } from "./errors.js";

export function readBearerToken(request) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError(401, "unauthorized", "A bearer token is required");
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new AppError(401, "unauthorized", "A bearer token is required");
  }
  return token;
}

