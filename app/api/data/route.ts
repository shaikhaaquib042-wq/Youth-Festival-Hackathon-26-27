import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { AppDataStore } from '@/types';

export async function GET() {
  try {
    const repo = getRepository();
    const data = await repo.initialize();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error loading data' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AppDataStore;
    const repo = getRepository();
    await repo.saveData(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error saving data' },
      { status: 500 }
    );
  }
}
