import { createClient } from "@supabase/supabase-js";

import { AppError, mapSupabaseError } from "../errors.js";

const CLIENT_OPTIONS = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  }
};

function sessionResponse(data) {
  if (!data.session || !data.user) {
    throw new AppError(401, "authentication_failed", "Authentication did not create a session");
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    tokenType: data.session.token_type,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      isAnonymous: data.user.is_anonymous ?? false
    }
  };
}

export class SupabaseService {
  constructor(config) {
    this.url = config.supabaseUrl;
    this.anonKey = config.supabaseAnonKey;
    // Public reads use the anonymous role and remain constrained by RLS.
    this.anon = createClient(this.url, this.anonKey, CLIENT_OPTIONS);
    // The service role is limited to token verification, health checks and role lookup.
    this.admin = createClient(
      this.url,
      config.supabaseServiceRoleKey,
      CLIENT_OPTIONS
    );
  }

  userClient(token) {
    // Forward the caller's JWT so mutations are evaluated by that user's RLS policies.
    return createClient(this.url, this.anonKey, {
      ...CLIENT_OPTIONS,
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }

  async authenticatedUser(token) {
    const { data, error } = await this.admin.auth.getUser(token);
    if (error || !data.user) {
      throw new AppError(401, "unauthorized", "The access token is invalid or expired");
    }
    return data.user;
  }

  async requireAdmin(token) {
    const user = await this.authenticatedUser(token);
    // Authentication proves identity; the profiles table grants application roles.
    const { data, error } = await this.admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw mapSupabaseError(error);
    if (data?.role !== "admin") {
      throw new AppError(403, "forbidden", "Administrator access is required");
    }
    return user;
  }

  async healthCheck() {
    const { error } = await this.admin.from("locations").select("id").limit(1);
    if (error) {
      throw new AppError(503, "database_unavailable", "The database is unavailable");
    }
    return { database: "connected" };
  }

  async signInAnonymously() {
    const client = createClient(this.url, this.anonKey, CLIENT_OPTIONS);
    const { data, error } = await client.auth.signInAnonymously();
    if (error) throw new AppError(401, "authentication_failed", error.message);
    return sessionResponse(data);
  }

  async signInAdmin(email, password) {
    const client = createClient(this.url, this.anonKey, CLIENT_OPTIONS);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw new AppError(401, "authentication_failed", "Invalid email or password");
    }

    const response = sessionResponse(data);
    await this.requireAdmin(response.accessToken);
    return response;
  }

  async refreshSession(refreshToken) {
    const client = createClient(this.url, this.anonKey, CLIENT_OPTIONS);
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken
    });
    if (error) {
      throw new AppError(
        401,
        "authentication_failed",
        "The refresh token is invalid or expired"
      );
    }
    return sessionResponse(data);
  }

  async listLocations() {
    const { data, error } = await this.anon
      .from("locations")
      .select("*")
      .eq("active", true)
      .order("name");
    if (error) throw mapSupabaseError(error);
    return data;
  }

  async listInventory(filters) {
    let query = this.anon
      .from("inventory_items")
      .select("*, location:locations(*)")
      .eq("status", "available")
      .gt("quantity_available", 0)
      .gte("collect_by", new Date().toISOString())
      .order("collect_by");

    if (filters.locationId) query = query.eq("location_id", filters.locationId);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.search) query = query.ilike("name", `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw mapSupabaseError(error);
    return data;
  }

  async reserveInventory(token, inventoryItemId, quantity) {
    await this.authenticatedUser(token);
    // The database function locks and updates stock atomically.
    const { data, error } = await this.userClient(token).rpc("reserve_inventory", {
      p_inventory_item_id: inventoryItemId,
      p_quantity: quantity
    });
    if (error) throw mapSupabaseError(error);
    return data[0];
  }

  async getReservationByCode(token, collectionCode) {
    await this.authenticatedUser(token);
    const { data, error } = await this.userClient(token)
      .from("reservations")
      .select(
        "id, inventory_item_id, quantity, collection_code, status, created_at, resolved_at"
      )
      .eq("collection_code", collectionCode.toUpperCase())
      .maybeSingle();

    if (error) throw mapSupabaseError(error);
    if (!data) throw new AppError(404, "not_found", "Reservation was not found");
    return data;
  }

  async createInventory(token, payload) {
    await this.requireAdmin(token);
    const { data, error } = await this.userClient(token)
      .from("inventory_items")
      .insert(payload)
      .select()
      .single();
    if (error) throw mapSupabaseError(error);
    return data;
  }

  async listAdminInventory(token, filters) {
    await this.requireAdmin(token);
    let query = this.userClient(token)
      .from("inventory_items")
      .select("*, location:locations(*)")
      .order("collect_by");

    if (filters.locationId) query = query.eq("location_id", filters.locationId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.search) query = query.ilike("name", `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw mapSupabaseError(error);
    return data;
  }

  async updateInventory(token, id, payload) {
    await this.requireAdmin(token);
    const { data, error } = await this.userClient(token)
      .from("inventory_items")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw mapSupabaseError(error);
    if (!data) throw new AppError(404, "not_found", "Inventory item was not found");
    return data;
  }

  async deleteInventory(token, id) {
    await this.requireAdmin(token);
    const { data, error } = await this.userClient(token)
      .from("inventory_items")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw mapSupabaseError(error);
    if (!data) throw new AppError(404, "not_found", "Inventory item was not found");
  }

  async listAdminReservations(token, status) {
    await this.requireAdmin(token);
    let query = this.userClient(token)
      .from("reservations")
      .select(
        "id, inventory_item_id, user_id, quantity, collection_code, status, created_at, resolved_at, inventory_item:inventory_items(id, name, location_id)"
      )
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw mapSupabaseError(error);
    return data;
  }

  async collectReservation(token, id) {
    await this.requireAdmin(token);
    // Resolution functions reject repeated actions and preserve reservation state.
    const { data, error } = await this.userClient(token).rpc(
      "mark_reservation_collected",
      { p_reservation_id: id }
    );
    if (error) throw mapSupabaseError(error);
    return data[0];
  }

  async cancelReservation(token, id) {
    await this.requireAdmin(token);
    const { data, error } = await this.userClient(token).rpc(
      "cancel_reservation",
      { p_reservation_id: id }
    );
    if (error) throw mapSupabaseError(error);
    return data[0];
  }
}
