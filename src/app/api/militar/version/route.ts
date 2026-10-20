import { NextResponse } from 'next/server';
import { getMilitarCacheVersion } from '../../../../server/lib/militar-cache-tracker';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ version: getMilitarCacheVersion() });
}
