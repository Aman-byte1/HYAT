import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const readings = await prisma.reading.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
        return NextResponse.json(readings);
      } catch (_error) {
        return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
      }
    }
    
    export async function POST(request: Request) {
      try {
        const body = await request.json();
        const { voltage1, voltage2, voltage3, current1, current2, current3, temp, oilLevel, quality } = body;       
    
        const reading = await prisma.reading.create({
          data: {
            voltage1,
            voltage2: voltage2 || 0,
            voltage3: voltage3 || 0,
            current1: current1 || 0,
            current2: current2 || 0,
            current3: current3 || 0,
            temp,
            oilLevel,
            quality,
          },
        });        
        return NextResponse.json(reading);
      } catch (_error) {
        return NextResponse.json({ error: 'Failed to save reading' }, { status: 500 });
      }
    }
