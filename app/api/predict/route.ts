import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRegression } from '@/lib/analysis';

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:5001';

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

    // Get the latest reading for ML prediction
    const latest = readings[0];

    // Try ML model prediction first
    let mlPrediction = null;
    try {
      // For Vercel, we call our own python api at /api/ml_predict
      // If ML_SERVER_URL is set (e.g. Railway), use that.
      const baseUrl = process.env.ML_SERVER_URL || 
                      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      
      const mlRes = await fetch(`${baseUrl}/api/ml_predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voltage: latest.voltage1,
          temperature: latest.temp,
          oilLevel: latest.oilLevel,
          current: latest.current1,
        }),
        signal: AbortSignal.timeout(8000), // Increased timeout for serverless cold starts
      });

      if (mlRes.ok) {
        mlPrediction = await mlRes.json();
      }
    } catch {
      // ML server unavailable, fall back to regression
      console.log('[Predict API] ML server unavailable, using regression fallback');
    }

    // Regression-based analysis (always compute as fallback / supplement)
    const healthAnalysis = calculateRegression(readings, 'health');

    return NextResponse.json({
      ready: true,
      health: {
        current: mlPrediction ? mlPrediction.healthScore : healthAnalysis.current,
        predicted: healthAnalysis.predicted,
        direction: healthAnalysis.direction,
      },
      ml: mlPrediction ? {
        active: true,
        prediction: mlPrediction.prediction,
        confidence: mlPrediction.confidence,
        failureProbability: mlPrediction.failureProbability,
        riskLabel: mlPrediction.riskLabel,
        model: mlPrediction.model,
      } : {
        active: false,
        model: 'Regression Fallback',
      },
      samples: readings.length,
    });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to generate prediction' }, { status: 500 });
  }
}