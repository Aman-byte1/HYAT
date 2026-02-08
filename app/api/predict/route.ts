import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRegression } from '@/lib/analysis';

export async function GET() {
  try {
    // Get last 100 readings (approx 25 mins of data)
    const readings = await prisma.reading.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    if (readings.length === 0) {
      return NextResponse.json({ ready: false });
    }

    const voltageAnalysis = calculateRegression(readings, 'voltage');
    const tempAnalysis = calculateRegression(readings, 'temp');

    return NextResponse.json({
      ready: true,
      voltage: voltageAnalysis,
      temp: tempAnalysis,
      samples: readings.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate prediction' }, { status: 500 });
  }
}
