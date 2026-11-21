import { AvailabilityStatus } from "../../generated/prisma/client.js";
import { prisma } from "../config/database.js";

export type NewSafeZoneReportInput = {
  safeZoneId: string;
  availabilityStatus: AvailabilityStatus;
  comment?: string;
  reporterTokenHash?: string;
};

export async function createSafeZoneReport(input: NewSafeZoneReportInput) {
  if (input.comment !== undefined && input.comment.length > 500) {
    throw new RangeError("comment must be 500 characters or fewer");
  }
  if (input.reporterTokenHash !== undefined && input.reporterTokenHash.length > 255) {
    throw new RangeError("reporter token hash is too long");
  }
  return prisma.safeZoneReport.create({ data: input });
}
