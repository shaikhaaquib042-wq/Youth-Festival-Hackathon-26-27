import { describe, expect, it } from "vitest";
import { calculateDistanceKm } from "../src/utils/haversine.js";

describe("calculateDistanceKm", () => {
  it("returns zero for identical points", () => {
    expect(calculateDistanceKm(18.5204, 73.8567, 18.5204, 73.8567)).toBe(0);
  });

  it("returns a straight-line distance in kilometres", () => {
    expect(calculateDistanceKm(0, 0, 0, 1)).toBeCloseTo(111.195, 2);
  });

  it("rejects out-of-range coordinates", () => {
    expect(() => calculateDistanceKm(91, 0, 0, 0)).toThrow(RangeError);
    expect(() => calculateDistanceKm(0, 181, 0, 0)).toThrow(RangeError);
  });
});
