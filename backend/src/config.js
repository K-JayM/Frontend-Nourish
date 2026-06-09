import "dotenv/config";

import { AppError } from "./errors.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AppError(500, "configuration_error", `${name} is required`);
  }
  return value;
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export function loadConfig() {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError(500, "configuration_error", "PORT must be a valid TCP port");
  }

  const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port,
    host: process.env.HOST ?? "0.0.0.0",
    logLevel: process.env.LOG_LEVEL ?? "info",
    trustProxy: parseBoolean(process.env.TRUST_PROXY, true),
    corsOrigins,
    supabaseUrl: required("SUPABASE_URL"),
    supabaseAnonKey: required("SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY")
  };
}

