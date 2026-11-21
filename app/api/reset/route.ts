import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRepository } from '@/lib/repository';
import { AppDataStore } from '@/types';

export async function POST() {
  try {
    const seedPath = path.join(process.cwd(), 'data', 'seed.json');
    if (!fs.existsSync(seedPath)) {
      return NextResponse.json({ success: false, error: 'seed.json not found' }, { status: 404 });
    }

    const raw = fs.readFileSync(seedPath, 'utf-8');
    const seed = JSON.parse(raw);

    const freshStore: AppDataStore = {
      version: '1.0.0',
      seedHash: seed.seedHash,
      donors: seed.donors,
      hospitals: seed.hospitals,
      bloodBanks: seed.bloodBanks,
      requests: [],
      notifications: [],
      donationEvents: [],
      auditLogs: [],
      historicalRequests: seed.historicalRequests,
      campuses: seed.campuses,
      scheduledCamps: seed.scheduledCamps,
    };

    const repo = getRepository();
    await repo.saveData(freshStore);

    return NextResponse.json({ success: true, message: 'Store reset to seed state successfully' });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error resetting store' },
      { status: 500 }
    );
  }
}
