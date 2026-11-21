import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import wardsRaw from "./pune-wards.json";

interface WardProps {
  name: string;
  /** id in offices.pune.json, or null when the 2017 admin ward cannot be matched confidently to a current ward office. */
  office_id: string | null;
}

const wards = (wardsRaw as { features: Feature<Polygon | MultiPolygon, WardProps>[] }).features;

/**
 * Point in polygon on the bundled, simplified DataMeet Pune admin-ward layer (2017 boundaries, server side only).
 * Returns a ward office id, or undefined when the point is outside every ward or the ward is not mapped.
 *
 * TODO(data): the 2017 admin wards are mapped to current ward offices only where the names match clearly
 * (10 of 15). Wards 08, 09, 10, 12 and 15 are unmapped on purpose, so those users pick their ward in the picker.
 * Replace with the current PMC admin ward boundaries when a verified source is available.
 */
export function wardForPoint(lat: number, lng: number): string | undefined {
  const p = point([lng, lat]);
  for (const w of wards) {
    if (booleanPointInPolygon(p, w)) return w.properties.office_id ?? undefined;
  }
  return undefined;
}
