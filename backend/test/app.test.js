import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../src/app.js";
import { AppError } from "../src/errors.js";

const config = {
  logLevel: "silent",
  trustProxy: false,
  corsOrigins: ["http://localhost:3000"]
};

function fakeService(overrides = {}) {
  return {
    healthCheck: async () => ({ database: "connected" }),
    listLocations: async () => [],
    listInventory: async () => [],
    signInAnonymously: async () => ({ accessToken: "anonymous-token" }),
    signInAdmin: async () => ({ accessToken: "admin-token" }),
    refreshSession: async () => ({ accessToken: "refreshed-token" }),
    reserveInventory: async () => ({
      reservation_id: "20000000-0000-4000-8000-000000000001",
      collection_code: "NR-0123456789ABCDEF",
      remaining_quantity: 4
    }),
    getReservationByCode: async () => ({
      collection_code: "NR-0123456789ABCDEF",
      status: "held"
    }),
    createInventory: async (_token, payload) => ({ id: "created", ...payload }),
    listAdminInventory: async () => [],
    updateInventory: async (_token, id, payload) => ({ id, ...payload }),
    deleteInventory: async () => {},
    listAdminReservations: async () => [],
    collectReservation: async (_token, id) => ({
      reservation_id: id,
      reservation_status: "collected"
    }),
    cancelReservation: async (_token, id) => ({
      reservation_id: id,
      reservation_status: "cancelled",
      restored_quantity: 2
    }),
    ...overrides
  };
}

async function createApp(service = fakeService()) {
  return buildApp({ config, service, logger: false });
}

test("root identifies the running backend service", async (t) => {
  const app = await createApp();
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    name: "Nourish Backend API",
    status: "running",
    health: "/health",
    documentation: "/docs"
  });
});

test("health reports API and database readiness", async (t) => {
  const app = await createApp();
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ok",
    database: "connected"
  });
});

test("inventory filters are validated and forwarded", async (t) => {
  let receivedFilters;
  const app = await createApp(
    fakeService({
      listInventory: async (filters) => {
        receivedFilters = filters;
        return [{ id: "inventory-1", name: "Apples" }];
      }
    })
  );
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/v1/inventory?category=Cold%20Food&search=apple"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual({ ...receivedFilters }, {
    category: "Cold Food",
    search: "apple"
  });
  assert.equal(response.json()[0].name, "Apples");
});

test("protected routes require a bearer token", async (t) => {
  const app = await createApp();
  t.after(() => app.close());

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/reservations",
    payload: {
      inventoryItemId: "30000000-0000-4000-8000-000000000001",
      quantity: 1
    }
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, "unauthorized");
});

test("reservation input rejects invalid quantities", async (t) => {
  const app = await createApp();
  t.after(() => app.close());

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/reservations",
    headers: { authorization: "Bearer anonymous-token" },
    payload: {
      inventoryItemId: "30000000-0000-4000-8000-000000000001",
      quantity: 0
    }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "validation_error");
  assert.equal(response.json().error.message, "quantity must be at least 1");
});

test("admin login accepts existing passwords shorter than the signup policy", async (t) => {
  let receivedCredentials;
  const app = await createApp(
    fakeService({
      signInAdmin: async (email, password) => {
        receivedCredentials = { email, password };
        return { accessToken: "admin-token" };
      }
    })
  );
  t.after(() => app.close());

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/admin/login",
    payload: {
      email: "admin@example.com",
      password: "short"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedCredentials, {
    email: "admin@example.com",
    password: "short"
  });
});

test("validation errors identify the invalid field", async (t) => {
  const app = await createApp();
  t.after(() => app.close());

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/admin/login",
    payload: {
      email: "not-an-email",
      password: "password"
    }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.message, "email must be a valid email");
});

test("reservation creation returns the collection code", async (t) => {
  const app = await createApp();
  t.after(() => app.close());

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/reservations",
    headers: { authorization: "Bearer anonymous-token" },
    payload: {
      inventoryItemId: "30000000-0000-4000-8000-000000000001",
      quantity: 2
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().collection_code, "NR-0123456789ABCDEF");
});

test("admin inventory payload is converted to database field names", async (t) => {
  let receivedPayload;
  const app = await createApp(
    fakeService({
      createInventory: async (_token, payload) => {
        receivedPayload = payload;
        return { id: "created", ...payload };
      }
    })
  );
  t.after(() => app.close());

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/admin/inventory",
    headers: { authorization: "Bearer admin-token" },
    payload: {
      locationId: "10000000-0000-4000-8000-000000000001",
      name: "Bread",
      category: "Cold Food",
      quantityAvailable: 8,
      collectBy: "2026-06-10T12:00:00.000Z"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedPayload, {
    location_id: "10000000-0000-4000-8000-000000000001",
    name: "Bread",
    category: "Cold Food",
    quantity_available: 8,
    collect_by: "2026-06-10T12:00:00.000Z"
  });
});

test("refresh tokens return a new session", async (t) => {
  let receivedToken;
  const app = await createApp(
    fakeService({
      refreshSession: async (refreshToken) => {
        receivedToken = refreshToken;
        return { accessToken: "refreshed-token" };
      }
    })
  );
  t.after(() => app.close());

  const refreshToken = "refresh-token-with-sufficient-length";
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/refresh",
    payload: { refreshToken }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(receivedToken, refreshToken);
  assert.equal(response.json().accessToken, "refreshed-token");
});

test("application errors use the stable JSON error contract", async (t) => {
  const app = await createApp(
    fakeService({
      reserveInventory: async () => {
        throw new AppError(
          409,
          "insufficient_inventory",
          "Not enough inventory is available"
        );
      }
    })
  );
  t.after(() => app.close());

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/reservations",
    headers: { authorization: "Bearer anonymous-token" },
    payload: {
      inventoryItemId: "30000000-0000-4000-8000-000000000001",
      quantity: 20
    }
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), {
    error: {
      code: "insufficient_inventory",
      message: "Not enough inventory is available"
    }
  });
});

test("unknown routes return the API error contract", async (t) => {
  const app = await createApp();
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/missing" });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, "not_found");
});
