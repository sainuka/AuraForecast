import type { HealthMetric } from "@shared/schema";

interface CorrelationHeatmapProps {
  metrics?: HealthMetric[];
  isLoading?: boolean;
}

const METRICS = [
  { key: 'sleepScore', label: 'Sleep' },
  { key: 'hrv', label: 'HRV' },
  { key: 'recoveryScore', label: 'Recovery' },
  { key: 'avgGlucose', label: 'Glucose' },
  { key: 'temperature', label: 'Temp' },
];

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }
  
  if (denomX === 0 || denomY === 0) return 0;
  
  return numerator / Math.sqrt(denomX * denomY);
}

function getCorrelationColor(value: number): string {
  if (value > 0.7) return 'bg-green-500';
  if (value > 0.4) return 'bg-green-400';
  if (value > 0.1) return 'bg-green-300';
  if (value > -0.1) return 'bg-gray-300';
  if (value > -0.4) return 'bg-red-300';
  if (value > -0.7) return 'bg-red-400';
  return 'bg-red-500';
}

export function CorrelationHeatmap({ metrics, isLoading }: CorrelationHeatmapProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Calculating correlations...</div>;
  }

  if (!metrics || metrics.length < 5) {
    return (
      <div className="text-sm text-muted-foreground">
        Not enough data for correlation analysis (need at least 5 data points)
      </div>
    );
  }

  const metricData: Record<string, number[]> = {};
  
  METRICS.forEach(({ key }) => {
    metricData[key] = metrics
      .slice(0, 30)
      .map(m => {
        const val = m[key as keyof HealthMetric];
        return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      })
      .filter(v => v > 0);
  });

  const correlations: Record<string, Record<string, number>> = {};
  
  METRICS.forEach(({ key: key1 }) => {
    correlations[key1] = {};
    METRICS.forEach(({ key: key2 }) => {
      if (key1 === key2) {
        correlations[key1][key2] = 1;
      } else {
        const minLength = Math.min(metricData[key1].length, metricData[key2].length);
        if (minLength > 0) {
          correlations[key1][key2] = calculateCorrelation(
            metricData[key1].slice(0, minLength),
            metricData[key2].slice(0, minLength)
          );
        } else {
          correlations[key1][key2] = 0;
        }
      }
    });
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2"></th>
              {METRICS.map(({ label }) => (
                <th key={label} className="p-2 text-xs font-medium text-muted-foreground">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(({ key: key1, label: label1 }) => (
              <tr key={key1}>
                <td className="p-2 text-xs font-medium text-muted-foreground">
                  {label1}
                </td>
                {METRICS.map(({ key: key2 }) => {
                  const correlation = correlations[key1]?.[key2] || 0;
                  return (
                    <td key={key2} className="p-1">
                      <div
                        className={`w-12 h-12 rounded flex items-center justify-center text-xs font-medium ${
                          key1 === key2 ? 'bg-primary/20' : getCorrelationColor(correlation)
                        }`}
                        data-testid={`correlation-${key1}-${key2}`}
                      >
                        {key1 === key2 ? '1.0' : correlation.toFixed(2)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span>Strong positive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-300"></div>
          <span>No correlation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span>Strong negative</span>
        </div>
      </div>
    </div>
  );
}
