import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";

import { AppError } from "./errors.js";
import { registerRoutes } from "./routes.js";

export async function buildApp({ config, service, logger = true }) {
  const app = Fastify({
    logger: logger
      ? {
          level: config.logLevel
        }
      : false,
    trustProxy: config.trustProxy,
    ajv: {
      customOptions: {
        coerceTypes: false
      }
    }
  });

  await app.register(helmet);
  await app.register(cors, {
    origin(origin, callback) {
      // Requests without an Origin header are server-to-server or health checks.
      if (!origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError(403, "cors_forbidden", "Origin is not allowed"), false);
    }
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute"
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Nourish Backend API",
        version: "1.0.0"
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
    }
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs"
  });

  await registerRoutes(app, { service });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: {
        code: "not_found",
        message: "Route was not found"
      }
    });
  });

  app.setErrorHandler((error, request, reply) => {
    // Keep validation and application failures on the same public error shape.
    if (error.validation) {
      reply.code(400).send({
        error: {
          code: "validation_error",
          message: validationMessage(error.validation[0]),
          details: error.validation
        }
      });
      return;
    }

    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details })
        }
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled request error");
    reply.code(500).send({
      error: {
        code: "internal_error",
        message: "An unexpected error occurred"
      }
    });
  });

  return app;
}

function validationMessage(error) {
  if (!error) return "Request validation failed";

  const field =
    error.keyword === "required"
      ? error.params.missingProperty
      : error.keyword === "additionalProperties"
        ? error.params.additionalProperty
        : error.instancePath.split("/").filter(Boolean).at(-1);
  const label = field ? field.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase() : "request";

  switch (error.keyword) {
    case "required":
      return `${label} is required`;
    case "format":
      return `${label} must be a valid ${error.params.format}`;
    case "minLength":
      return `${label} must contain at least ${error.params.limit} character${error.params.limit === 1 ? "" : "s"}`;
    case "maxLength":
      return `${label} must contain no more than ${error.params.limit} characters`;
    case "minimum":
      return `${label} must be at least ${error.params.limit}`;
    case "maximum":
      return `${label} must be no more than ${error.params.limit}`;
    case "enum":
      return `${label} must be one of: ${error.params.allowedValues.join(", ")}`;
    case "type":
      return `${label} must be ${error.params.type}`;
    case "additionalProperties":
      return `${label} is not accepted`;
    default:
      return field ? `${label} is invalid` : "Request validation failed";
  }
}
