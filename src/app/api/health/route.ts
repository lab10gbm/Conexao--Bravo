import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    system: 'Conexão Bravo API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    platform: 'Next.js App Router',
  });
}
