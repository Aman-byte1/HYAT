import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const readings = await prisma.reading.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    return NextResponse.json(readings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { voltage, temp, oilLevel, quality } = body;
    
    const reading = await prisma.reading.create({
      data: {
        voltage,
        temp,
        oilLevel,
        quality,
      },
    });
    
    return NextResponse.json(reading);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save reading' }, { status: 500 });
  }
}
