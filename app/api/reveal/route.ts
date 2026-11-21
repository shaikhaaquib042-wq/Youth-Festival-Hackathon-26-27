import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { canRevealContact } from '@/lib/matching/lifecycle';
import { AuditEntry } from '@/types';

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
    const request = await repo.getRequestById(requestId);

    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Blood request not found' },
        { status: 404 }
      );
    }

    // Pure authorization check
    const auth = canRevealContact(request, donorId);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.reason || 'Unauthorized' },
        { status: 403 }
      );
    }

    // Lookup secret phone on server
    const phone = await repo.getRevealedPhone(donorId);
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Secret phone record not found for donor' },
        { status: 404 }
      );
    }

    const auditEntry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actor: actor || 'Verified Requester',
      action: 'DONOR_CONTACT_REVEALED',
      requestId,
      donorId,
      timestamp: new Date().toISOString(),
      metadata: {
        bloodGroup: request.bloodGroup,
        hospitalId: request.hospitalId,
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
