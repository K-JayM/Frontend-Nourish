import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaPath = new URL(
  "../supabase/migrations/202606090001_initial_schema.sql",
  import.meta.url
);
const functionsPath = new URL(
  "../supabase/migrations/202606090002_reservation_functions.sql",
  import.meta.url
);

test("all application tables enable row level security", async () => {
  const sql = await readFile(schemaPath, "utf8");

  for (const table of [
    "locations",
    "inventory_items",
    "profiles",
    "reservations"
  ]) {
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security;`)
    );
  }
});

test("reservation functions lock mutable rows and require authenticated roles", async () => {
  const sql = await readFile(functionsPath, "utf8");

  assert.match(sql, /for update of inventory_items;/);
  assert.match(sql, /for update;/);
  assert.match(
    sql,
    /grant execute on function public\.reserve_inventory\(uuid, integer\) to authenticated;/
  );
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.reserve_inventory\(uuid, integer\) to anon;/
  );
});

