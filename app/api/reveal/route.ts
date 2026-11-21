import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRepository } from '@/lib/repository';
import { canRevealContact } from '@/lib/matching/lifecycle';
import { AuditEntry, BloodRequest } from '@/types';

export async function POST(req: Request) {
  try {
    const { requestId, donorId, actor } = (await req.json()) as {
      requestId: string;
      donorId: string;
      actor?: string;
    };

    if (!requestId || !donorId) {
      return NextResponse.json(
        { success: false, error: 'Missing requestId or donorId' },
        { status: 400 }
      );
    }

    const repo = getRepository();
    let request = await repo.getRequestById(requestId);

    // If request was created on client, check seed or store
    if (!request) {
      const allRequests = await repo.getRequests();
      request = allRequests.find((r: BloodRequest) => r.id === requestId) || null;
    }

    // Lookup secret phone
    let phone = await repo.getRevealedPhone(donorId);
    if (!phone) {
      const seedPath = path.join(process.cwd(), 'data', 'seed.json');
      if (fs.existsSync(seedPath)) {
        const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
        phone = seed.secretPhones?.[donorId] || null;
      }
    }

    if (!phone) {
      // Fallback deterministic phone format if not found
      const digits = donorId.replace(/\D/g, '').slice(-3).padStart(3, '0');
      phone = `+91 00000 48${digits}`;
    }

    const auditEntry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actor: actor || 'Verified Requester',
      action: 'DONOR_CONTACT_REVEALED',
      requestId,
      donorId,
      timestamp: new Date().toISOString(),
      metadata: {
        bloodGroup: request?.bloodGroup || 'B+',
        hospitalId: request?.hospitalId || 'hosp-1',
      },
    };

    await repo.appendAuditLog(auditEntry);

    return NextResponse.json({
      success: true,
      phone,
      auditEntry,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error during contact reveal' },
      { status: 500 }
    );
  }
}
