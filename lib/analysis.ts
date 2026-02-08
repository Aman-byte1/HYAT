export function calculateHealthScore(reading: any) {
  let score = 100;

  // Voltage Penalty (Ideal: 210-230)
  // If < 180 or > 260, heavy penalty
  if (reading.voltage < 180 || reading.voltage > 260) score -= 40;
  else if (reading.voltage < 200 || reading.voltage > 240) score -= 10;

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

export function calculateRegression(data: any[], key: string = 'health') {
  if (data.length < 2) return { slope: 0, predicted: 0, direction: 'Stable' };

  // Generate health scores if key is 'health'
  const processedData = data.map((d, i) => ({
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
    const y = point[key];
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

  let direction = 'Stable ➡️';
  if (slope > 0.05) direction = 'Improving 📈';
  if (slope < -0.05) direction = 'Degrading 📉';

  return {
    slope,
    current: reversed[reversed.length - 1][key],
    predicted: Math.max(0, Math.min(100, parseFloat(predicted.toFixed(1)))),
    direction
  };
}