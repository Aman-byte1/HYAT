export interface Reading {
  id?: number;
  timestamp: string | Date;
  voltage1: number;
  voltage2: number;
  voltage3: number;
  temp: number;
  oilLevel: number;
  quality: number;
}

export function calculateHealthScore(reading: Reading) {
  let score = 100;

  // Voltage Penalty (Ideal: 210-230)
  // If < 180 or > 260, heavy penalty
  const v = reading.voltage1;
  if (v < 180 || v > 260) score -= 40;
  else if (v < 200 || v > 240) score -= 10;

  // Temp Penalty (Ideal: < 60)
  if (reading.temp > 90) score -= 40;
  else if (reading.temp > 75) score -= 15;

  // Oil Level Penalty (Ideal: > 40)
  if (reading.oilLevel < 20) score -= 30;
  else if (reading.oilLevel < 40) score -= 10;

  // Quality Penalty (Direct impact)
  if (reading.quality < 70) score -= (70 - reading.quality);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateRegression(data: Reading[], key: keyof Reading | 'health' = 'health') {
  if (data.length < 2) return { slope: 0, predicted: 0, direction: 'Stable', current: 0 };

  interface ExtendedReading extends Reading {
    health: number;
  }

  // Generate health scores if key is 'health'
  const processedData: ExtendedReading[] = data.map((d) => ({
    ...d,
    health: calculateHealthScore(d)
  }));

  const n = processedData.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  // Reverse to chronological order (oldest -> newest) for regression
  const reversed = [...processedData].reverse();

  reversed.forEach((point, i) => {
    const y = key === 'health' ? point.health : (point[key] as number);
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict 15 minutes (approx 60 ticks) into future
  const futureX = n + 60; 
  const predicted = slope * futureX + intercept;

  const lastPoint = reversed[reversed.length - 1];
  const currentValue = key === 'health' ? lastPoint.health : (lastPoint[key] as number);

  let direction = 'Stable ➡️';
  if (slope > 0.05) direction = 'Improving 📈';
  if (slope < -0.05) direction = 'Degrading 📉';

  return {
    slope,
    current: currentValue,
    predicted: Math.max(0, Math.min(100, parseFloat(predicted.toFixed(1)))),
    direction
  };
}