export function calculateRegression(data: any[], key: string) {
  if (data.length < 2) return { slope: 0, predicted: 0, direction: 'Stable' };

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  // We map time to X (0, 1, 2...) to simplify
  // Data is expected to be newest first, so we reverse it for calculation
  const reversed = [...data].reverse();

  reversed.forEach((point, i) => {
    const y = point[key];
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict 15 minutes into the future
  // Assuming 1 data point every 15 seconds, 15 mins = 60 points
  const futureX = n + 60; 
  const predicted = slope * futureX + intercept;

  let direction = 'Stable ➡️';
  if (slope > 0.05) direction = 'Rising 📈';
  if (slope < -0.05) direction = 'Falling 📉';

  return {
    slope,
    predicted: parseFloat(predicted.toFixed(2)),
    direction
  };
}
