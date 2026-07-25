import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAuthStore } from "../auth-store";

/**
 * The auth store holds the client's view of the session and drives it off two
 * endpoints. These tests pin the derived `isAuthenticated`/`isLoading` flags
 * and the fetch-driven flows (checkAuth, logout) including their failure paths.
 */

const PRISTINE = useAuthStore.getState();
const s = () => useAuthStore.getState();
const USER = { userId: "u1", email: "user@example.com", role: "student" };

beforeEach(() => useAuthStore.setState(PRISTINE, true));
afterEach(() => vi.unstubAllGlobals());

function stubFetch(ok: boolean, json: unknown = null) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(ok ? JSON.stringify(json) : "err", { status: ok ? 200 : 401, headers: { "Content-Type": "application/json" } })));
}

describe("auth store — setters", () => {
  it("setUser derives isAuthenticated and clears loading", () => {
    s().setUser(USER);
    expect(s().user).toEqual(USER);
    expect(s().isAuthenticated).toBe(true);
    expect(s().isLoading).toBe(false);
  });

  it("setUser(null) marks the session unauthenticated", () => {
    s().setUser(USER);
    s().setUser(null);
    expect(s().user).toBeNull();
    expect(s().isAuthenticated).toBe(false);
  });

  it("setLoading toggles only the loading flag", () => {
    s().setLoading(false);
    expect(s().isLoading).toBe(false);
  });
});

describe("auth store — checkAuth", () => {
  it("adopts the user when /me responds ok", async () => {
    stubFetch(true, { user: USER });
    await s().checkAuth();
    expect(s().user).toEqual(USER);
    expect(s().isAuthenticated).toBe(true);
    expect(s().isLoading).toBe(false);
  });

  it("clears the session when /me responds non-ok", async () => {
    s().setUser(USER);
    stubFetch(false);
    await s().checkAuth();
    expect(s().user).toBeNull();
    expect(s().isAuthenticated).toBe(false);
    expect(s().isLoading).toBe(false);
  });

  it("clears the session when the request throws", async () => {
    s().setUser(USER);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    await s().checkAuth();
    expect(s().user).toBeNull();
    expect(s().isAuthenticated).toBe(false);
  });
});

describe("auth store — logout", () => {
  const origLocation = window.location;
  beforeEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: { href: "" } });
  });
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: origLocation });
  });

  it("posts logout, clears state and local working data, and redirects to login", async () => {
    s().setUser(USER);
    localStorage.setItem("pathfinder-redesign-v1", "stale-working-state");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await s().logout();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(s().user).toBeNull();
    expect(s().isAuthenticated).toBe(false);
    // The per-browser working state is cleared so the next user starts blank.
    expect(localStorage.getItem("pathfinder-redesign-v1")).toBeNull();
    expect(window.location.href).toBe("/login");
  });
});
