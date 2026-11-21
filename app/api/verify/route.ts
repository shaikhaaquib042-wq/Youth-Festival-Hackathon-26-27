import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';

export async function POST(req: Request) {
  try {
    const { requestId, code, verifiedBy } = (await req.json()) as {
      requestId: string;
      code: string;
      verifiedBy?: string;
    };

    if (!requestId || !code) {
      return NextResponse.json(
        { success: false, error: 'Missing requestId or verification code' },
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

    if (request.status === 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Request has already been rejected due to failed verification attempts' },
        { status: 400 }
      );
    }

    // Compare with request.verificationCode (simulated OTP / Hospital Code)
    const expectedCode = request.verificationCode || 'DEMO-7824';
    const isMatch = code.trim().toUpperCase() === expectedCode.trim().toUpperCase();

    if (isMatch) {
      request.verificationStatus = 'verified';
      request.verifiedBy = verifiedBy || 'Hospital On-Duty Medical Officer';
      request.status = 'matching';
      await repo.saveRequest(request);

      return NextResponse.json({
        success: true,
        verificationStatus: 'verified',
        request,
      });
    } else {
      request.verificationAttempts = (request.verificationAttempts || 0) + 1;
      if (request.verificationAttempts >= 3) {
        request.verificationStatus = 'failed';
        request.status = 'rejected';
      }
      await repo.saveRequest(request);

      return NextResponse.json({
        success: false,
        verificationStatus: request.verificationStatus,
        remainingAttempts: Math.max(0, 3 - request.verificationAttempts),
        error:
          request.verificationStatus === 'failed'
            ? 'Verification failed 3 times. Request rejected.'
            : 'Invalid verification code. Please check the simulated demo code.',
      });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error during verification' },
      { status: 500 }
    );
  }
}
