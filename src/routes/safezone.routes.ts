import { randomUUID } from "node:crypto";
import { Router, type RequestHandler, type Response } from "express";
import { AvailabilityStatus, SafeZoneCategory } from "../../generated/prisma/client.js";
import { z } from "zod";
import type * as SafeZoneService from "../services/safezone.service.js";
import type * as ReportService from "../services/safezone-report.service.js";

type SafeZoneRouterServices = Pick<typeof SafeZoneService,
  "searchSafeZones" | "getSafeZone" | "submitSafeZone"> & Pick<typeof ReportService, "createSafeZoneReport">;

export type SafeZoneRouterDependencies = {
  services: SafeZoneRouterServices;
  /** Supply Developer A's shared community write limiter when mounting this router. */
  communityWriteRateLimit: RequestHandler;
};

const numericQuery = z.string().trim().regex(/^-?\d+(?:\.\d+)?$/).transform(Number).pipe(z.number().finite());
const searchQuerySchema = z.object({
  latitude: numericQuery.pipe(z.number().min(-90).max(90)),
  longitude: numericQuery.pipe(z.number().min(-180).max(180)),
  radiusKm: numericQuery.pipe(z.number().min(0).max(100)).optional().default(5),
  category: z.enum(SafeZoneCategory).optional(),
  availabilityStatus: z.enum(AvailabilityStatus).optional(),
  includeDemo: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  limit: numericQuery.pipe(z.number().int().min(1).max(100)).optional().default(100),
}).strict();

const idSchema = z.uuid();
export const submissionSchema = z.object({
  name: z.string().trim().min(1).max(150),
  category: z.enum(SafeZoneCategory),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  address: z.string().trim().min(1),
  waterAvailable: z.boolean().optional(),
  shadeAvailable: z.boolean().optional(),
  seatingAvailable: z.boolean().optional(),
  openingHours: z.string().max(1000).nullable().optional(),
}).strict();

export const reportSchema = z.object({
  availabilityStatus: z.enum(AvailabilityStatus),
  comment: z.string().max(500).optional(),
}).strict();

function requestId(response: Response): string {
  return typeof response.locals.requestId === "string" ? response.locals.requestId : randomUUID();
}

function validationError(response: Response, message: string) {
  return response.status(422).json({
    error: { code: "VALIDATION_ERROR", message, requestId: requestId(response) },
  });
}

function notFound(response: Response, message: string) {
  return response.status(404).json({
    error: { code: "NOT_FOUND", message, requestId: requestId(response) },
  });
}

/** Mount at /api/v1/safe-zones from the existing central router. */
export function createSafeZoneRouter({ services, communityWriteRateLimit }: SafeZoneRouterDependencies) {
  const router = Router();

  router.get("/", async (request, response) => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) return validationError(response, "Invalid SafeZone search parameters");

    const facilities = await services.searchSafeZones(parsed.data);
    return response.json({
      distanceMethod: "STRAIGHT_LINE",
      facilities: facilities.map(({ id, name, category, latitude, longitude, distanceKm,
        waterAvailable, shadeAvailable, verificationStatus, lastVerifiedAt }) => ({
        id, name, category, latitude, longitude, distanceKm, waterAvailable,
        shadeAvailable, verificationStatus, lastVerifiedAt,
      })),
    });
  });

  router.get("/:id", async (request, response) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) return validationError(response, "Invalid SafeZone ID");
    const facility = await services.getSafeZone(parsedId.data);
    if (!facility) return notFound(response, "SafeZone not found");
    return response.json(facility);
  });

  router.post("/", communityWriteRateLimit, async (request, response) => {
    const parsed = submissionSchema.safeParse(request.body);
    if (!parsed.success) return validationError(response, "Invalid SafeZone submission");
    const facility = await services.submitSafeZone(parsed.data);
    return response.status(201).json(facility);
  });

  router.post("/:id/reports", communityWriteRateLimit, async (request, response) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) return validationError(response, "Invalid SafeZone ID");
    const parsedBody = reportSchema.safeParse(request.body);
    if (!parsedBody.success) return validationError(response, "Invalid availability report");

    const facility = await services.getSafeZone(parsedId.data);
    if (!facility) return notFound(response, "SafeZone not found");
    const report = await services.createSafeZoneReport({ safeZoneId: parsedId.data, ...parsedBody.data });
    return response.status(201).json(report);
  });

  return router;
}
