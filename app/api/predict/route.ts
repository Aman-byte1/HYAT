import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRegression } from '@/lib/analysis';

export async function GET() {
  try {
    // Get last 100 readings
    const readings = await prisma.reading.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    if (readings.length === 0) {
      return NextResponse.json({ ready: false });
    }

    // Predict Health Score instead of raw values
    const healthAnalysis = calculateRegression(readings, 'health');

    return NextResponse.json({
      ready: true,
      health: healthAnalysis,
      samples: readings.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate prediction' }, { status: 500 });
  }
}