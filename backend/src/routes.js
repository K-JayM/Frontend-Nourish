import { readBearerToken } from "./auth.js";

const uuid = { type: "string", format: "uuid" };
const errorResponse = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {}
      }
    }
  }
};
const protectedRoute = [{ bearerAuth: [] }];

export async function registerRoutes(app, { service }) {
  // Fastify schemas validate requests and generate the OpenAPI documentation.
  app.get(
    "/",
    {
      schema: {
        tags: ["System"],
        response: {
          200: {
            type: "object",
            required: ["name", "status", "health", "documentation"],
            properties: {
              name: { type: "string" },
              status: { type: "string" },
              health: { type: "string" },
              documentation: { type: "string" }
            }
          }
        }
      }
    },
    async () => ({
      name: "Nourish Backend API",
      status: "running",
      health: "/health",
      documentation: "/docs"
    })
  );

  app.get(
    "/health",
    {
      schema: {
        tags: ["System"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              database: { type: "string" }
            }
          },
          503: errorResponse
        }
      }
    },
    async () => {
      const status = await service.healthCheck();
      return { status: "ok", ...status };
    }
  );

  app.get(
    "/api/v1/locations",
    {
      schema: {
        tags: ["Public"],
        response: {
          200: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          }
        }
      }
    },
    async () => service.listLocations()
  );

  app.get(
    "/api/v1/inventory",
    {
      schema: {
        tags: ["Public"],
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            locationId: uuid,
            category: { type: "string", minLength: 1, maxLength: 80 },
            search: { type: "string", minLength: 1, maxLength: 100 }
          }
        },
        response: {
          200: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          }
        }
      }
    },
    async (request) => service.listInventory(request.query)
  );

  app.post(
    "/api/v1/auth/anonymous",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["Authentication"],
        response: { 200: { type: "object", additionalProperties: true } }
      }
    },
    async () => service.signInAnonymously()
  );

  app.post(
    "/api/v1/auth/admin/login",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        tags: ["Authentication"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", maxLength: 320 },
            password: { type: "string", minLength: 1, maxLength: 200 }
          }
        },
        response: {
          200: { type: "object", additionalProperties: true },
          401: errorResponse,
          403: errorResponse
        }
      }
    },
    async (request) => service.signInAdmin(request.body.email, request.body.password)
  );

  app.post(
    "/api/v1/auth/refresh",
    {
      config: { rateLimit: { max: 30, timeWindow: "5 minutes" } },
      schema: {
        tags: ["Authentication"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string", minLength: 20, maxLength: 2000 }
          }
        },
        response: {
          200: { type: "object", additionalProperties: true },
          401: errorResponse
        }
      }
    },
    async (request) => service.refreshSession(request.body.refreshToken)
  );

  app.post(
    "/api/v1/reservations",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["Reservations"],
        security: protectedRoute,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["inventoryItemId", "quantity"],
          properties: {
            inventoryItemId: uuid,
            quantity: { type: "integer", minimum: 1, maximum: 1000 }
          }
        },
        response: {
          200: { type: "object", additionalProperties: true },
          401: errorResponse,
          409: errorResponse
        }
      }
    },
    async (request) =>
      service.reserveInventory(
        readBearerToken(request),
        request.body.inventoryItemId,
        request.body.quantity
      )
  );

  app.get(
    "/api/v1/reservations/:code",
    {
      schema: {
        tags: ["Reservations"],
        security: protectedRoute,
        params: {
          type: "object",
          required: ["code"],
          properties: {
            code: {
              type: "string",
              pattern: "^NR-[A-Fa-f0-9]{16}$"
            }
          }
        },
        response: {
          200: { type: "object", additionalProperties: true },
          401: errorResponse,
          404: errorResponse
        }
      }
    },
    async (request) =>
      service.getReservationByCode(readBearerToken(request), request.params.code)
  );

  app.post(
    "/api/v1/admin/inventory",
    {
      schema: {
        tags: ["Administration"],
        security: protectedRoute,
        body: inventoryCreateSchema(),
        response: {
          200: { type: "object", additionalProperties: true },
          401: errorResponse,
          403: errorResponse
        }
      }
    },
    async (request) =>
      service.createInventory(readBearerToken(request), toDatabaseInventory(request.body))
  );

  app.get(
    "/api/v1/admin/inventory",
    {
      schema: {
        tags: ["Administration"],
        security: protectedRoute,
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            locationId: uuid,
            status: { type: "string", enum: ["available", "unavailable"] },
            search: { type: "string", minLength: 1, maxLength: 100 }
          }
        },
        response: {
          200: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          401: errorResponse,
          403: errorResponse
        }
      }
    },
    async (request) =>
      service.listAdminInventory(readBearerToken(request), request.query)
  );

  app.patch(
    "/api/v1/admin/inventory/:id",
    {
      schema: {
        tags: ["Administration"],
        security: protectedRoute,
        params: idParamsSchema(),
        body: inventoryUpdateSchema(),
        response: {
          200: { type: "object", additionalProperties: true },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse
        }
      }
    },
    async (request) =>
      service.updateInventory(
        readBearerToken(request),
        request.params.id,
        toDatabaseInventory(request.body)
      )
  );

  app.delete(
    "/api/v1/admin/inventory/:id",
    {
      schema: {
        tags: ["Administration"],
        security: protectedRoute,
        params: idParamsSchema(),
        response: {
          204: { type: "null" },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse
        }
      }
    },
    async (request, reply) => {
      await service.deleteInventory(readBearerToken(request), request.params.id);
      return reply.code(204).send();
    }
  );

  app.get(
    "/api/v1/admin/reservations",
    {
      schema: {
        tags: ["Administration"],
        security: protectedRoute,
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            status: {
              type: "string",
              enum: ["held", "collected", "cancelled"]
            }
          }
        },
        response: {
          200: {
            type: "array",
            items: { type: "object", additionalProperties: true }
          },
          401: errorResponse,
          403: errorResponse
        }
      }
    },
    async (request) =>
      service.listAdminReservations(
        readBearerToken(request),
        request.query.status
      )
  );

  app.post(
    "/api/v1/admin/reservations/:id/collect",
    {
      schema: adminReservationActionSchema()
    },
    async (request) =>
      service.collectReservation(readBearerToken(request), request.params.id)
  );

  app.post(
    "/api/v1/admin/reservations/:id/cancel",
    {
      schema: adminReservationActionSchema()
    },
    async (request) =>
      service.cancelReservation(readBearerToken(request), request.params.id)
  );
}

function idParamsSchema() {
  return {
    type: "object",
    required: ["id"],
    properties: { id: uuid }
  };
}

function inventoryProperties() {
  return {
    locationId: uuid,
    name: { type: "string", minLength: 1, maxLength: 160 },
    description: { type: ["string", "null"], maxLength: 1000 },
    category: { type: "string", minLength: 1, maxLength: 80 },
    quantityAvailable: { type: "integer", minimum: 0, maximum: 1000000 },
    collectBy: { type: "string", format: "date-time" },
    status: { type: "string", enum: ["available", "unavailable"] }
  };
}

function inventoryCreateSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "locationId",
      "name",
      "category",
      "quantityAvailable",
      "collectBy"
    ],
    properties: inventoryProperties()
  };
}

function inventoryUpdateSchema() {
  return {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: inventoryProperties()
  };
}

function adminReservationActionSchema() {
  return {
    tags: ["Administration"],
    security: protectedRoute,
    params: idParamsSchema(),
    response: {
      200: { type: "object", additionalProperties: true },
      401: errorResponse,
      403: errorResponse,
      404: errorResponse,
      409: errorResponse
    }
  };
}

function toDatabaseInventory(payload) {
  // The HTTP API uses camelCase while PostgreSQL columns use snake_case.
  const fieldMap = {
    locationId: "location_id",
    quantityAvailable: "quantity_available",
    collectBy: "collect_by"
  };

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [fieldMap[key] ?? key, value])
  );
}
