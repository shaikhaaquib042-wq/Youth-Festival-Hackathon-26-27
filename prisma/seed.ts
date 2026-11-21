import { prisma } from "../src/config/database.js";

const demoZones = [
  { id: "a1000000-0000-4000-8000-000000000001", name: "Demo Water Point 1", category: "DRINKING_WATER" as const, latitude: 18.5204, longitude: 73.8567, address: "Synthetic demo location, Pune", waterAvailable: true, shadeAvailable: false, seatingAvailable: false },
  { id: "a1000000-0000-4000-8000-000000000002", name: "Demo Shaded Rest Point", category: "SHADED_REST_AREA" as const, latitude: 18.524, longitude: 73.851, address: "Synthetic demo location, Pune", waterAvailable: false, shadeAvailable: true, seatingAvailable: true },
  { id: "a1000000-0000-4000-8000-000000000003", name: "Demo Cooling Centre", category: "COOLING_CENTER" as const, latitude: 18.515, longitude: 73.86, address: "Synthetic demo location, Pune", waterAvailable: true, shadeAvailable: true, seatingAvailable: true },
];

async function main() {
  for (const zone of demoZones) {
    await prisma.safeZone.upsert({
      where: { id: zone.id },
      create: { ...zone, verificationStatus: "DEMO", availabilityStatus: "UNKNOWN" },
      update: { ...zone, verificationStatus: "DEMO", availabilityStatus: "UNKNOWN", lastVerifiedAt: null },
    });
  }
}

main().catch((error) => {
  console.error("Database seed failed", error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
