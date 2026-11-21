import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createSafeZoneRouter, type SafeZoneRouterDependencies } from "../src/routes/safezone.routes.js";

const id = "a1000000-0000-4000-8000-000000000001";
const facility = {
  id,
  name: "Demo water point",
  category: "DRINKING_WATER" as const,
  latitude: 18.5204,
  longitude: 73.8567,
  distanceKm: 0,
  waterAvailable: true,
  shadeAvailable: false,
  verificationStatus: "DEMO" as const,
  availabilityStatus: "UNKNOWN" as const,
  lastVerifiedAt: null,
};

function setup() {
  const services = {
    searchSafeZones: vi.fn(async () => [facility]),
    getSafeZone: vi.fn(async (safeZoneId: string) => safeZoneId === id ? facility : null),
    submitSafeZone: vi.fn(async (input: Record<string, unknown>) => ({
      ...input, id, verificationStatus: "PENDING", availabilityStatus: "UNKNOWN", lastVerifiedAt: null,
    })),
    createSafeZoneReport: vi.fn(async (input: Record<string, unknown>) => ({ ...input, id, createdAt: new Date("2026-01-01T00:00:00Z") })),
  } as unknown as SafeZoneRouterDependencies["services"];
  const communityWriteRateLimit: RequestHandler = vi.fn((_request, _response, next) => next());
  const app = express();
  app.use(express.json());
  app.use("/api/v1/safe-zones", createSafeZoneRouter({ services, communityWriteRateLimit }));
  return { app, services, communityWriteRateLimit };
}

describe("SafeZone routes", () => {
  it("returns the documented search shape and filters", async () => {
    const { app, services } = setup();
    const response = await request(app).get("/api/v1/safe-zones")
      .query({ latitude: "18.5204", longitude: "73.8567", radiusKm: "3", includeDemo: "true", limit: "12" })
      .expect(200);

    const { availabilityStatus: _availabilityStatus, ...contractFacility } = facility;
    expect(response.body).toEqual({ distanceMethod: "STRAIGHT_LINE", facilities: [contractFacility] });
    expect(services.searchSafeZones).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 18.5204, longitude: 73.8567, radiusKm: 3, includeDemo: true, limit: 12,
    }));
  });

  it("rejects invalid coordinates", async () => {
    const { app, services } = setup();
    await request(app).get("/api/v1/safe-zones?latitude=91&longitude=73")
      .expect(422).expect(({ body }) => expect(body.error.code).toBe("VALIDATION_ERROR"));
    expect(services.searchSafeZones).not.toHaveBeenCalled();
  });

  it.each(["DRINKING_WATER", "SHADED_REST_AREA", "COOLING_CENTER", "COMMUNITY_SHOP", "MEDICAL_FACILITY"])(
    "accepts the canonical facility category %s",
    async (category) => {
      const { app, services } = setup();
      await request(app).get("/api/v1/safe-zones")
        .query({ latitude: "18.5", longitude: "73.8", category })
        .expect(200);
      expect(services.searchSafeZones).toHaveBeenCalledWith(expect.objectContaining({ category }));
    },
  );

  it("rejects noncanonical facility category aliases", async () => {
    const { app, services } = setup();
    await request(app).get("/api/v1/safe-zones?latitude=18.5&longitude=73.8&category=WATER")
      .expect(422);
    expect(services.searchSafeZones).not.toHaveBeenCalled();
  });

  it("does not allow submitters to choose verification status", async () => {
    const { app, services } = setup();
    await request(app).post("/api/v1/safe-zones").send({
      name: "Community point", category: "DRINKING_WATER", latitude: 18.5, longitude: 73.8,
      address: "Pune", verificationStatus: "VERIFIED",
    }).expect(422);
    expect(services.submitSafeZone).not.toHaveBeenCalled();
  });

  it("passes a valid community submission through the shared limiter and creates it as pending", async () => {
    const { app, services, communityWriteRateLimit } = setup();
    const response = await request(app).post("/api/v1/safe-zones").send({
      name: "Community point", category: "DRINKING_WATER", latitude: 18.5, longitude: 73.8,
      address: "Pune", waterAvailable: true,
    }).expect(201);

    expect(communityWriteRateLimit).toHaveBeenCalledOnce();
    expect(services.submitSafeZone).toHaveBeenCalledWith(expect.objectContaining({ name: "Community point" }));
    expect(response.body.verificationStatus).toBe("PENDING");
  });

  it("creates a report for a known SafeZone and rate limits the write", async () => {
    const { app, services, communityWriteRateLimit } = setup();
    await request(app).post(`/api/v1/safe-zones/${id}/reports`)
      .send({ availabilityStatus: "LIMITED", comment: "Tap is slow" }).expect(201);

    expect(communityWriteRateLimit).toHaveBeenCalledOnce();
    expect(services.createSafeZoneReport).toHaveBeenCalledWith({
      safeZoneId: id, availabilityStatus: "LIMITED", comment: "Tap is slow",
    });
  });

  it("returns not found for reports against a missing SafeZone", async () => {
    const { app, services } = setup();
    await request(app).post("/api/v1/safe-zones/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/reports")
      .send({ availabilityStatus: "AVAILABLE" }).expect(404);
    expect(services.createSafeZoneReport).not.toHaveBeenCalled();
  });

  it("rejects overlong community reports before they reach persistence", async () => {
    const { app, services } = setup();
    await request(app).post(`/api/v1/safe-zones/${id}/reports`)
      .send({ availabilityStatus: "LIMITED", comment: "x".repeat(501) })
      .expect(422);
    expect(services.createSafeZoneReport).not.toHaveBeenCalled();
  });
});
