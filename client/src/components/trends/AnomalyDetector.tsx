import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import type { HealthMetric } from "@shared/schema";
import { format, parseISO } from "date-fns";

interface AnomalyDetectorProps {
  metrics?: HealthMetric[];
  isLoading?: boolean;
  preview?: boolean;
}

interface Anomaly {
  date: string;
  metric: string;
  value: number;
  severity: 'high' | 'medium' | 'low';
  type: 'spike' | 'drop';
  message: string;
}

function detectAnomalies(metrics: HealthMetric[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  if (metrics.length < 3) return anomalies;

  const metricKeys = ['sleepScore', 'hrv', 'recoveryScore', 'avgGlucose'] as const;

  metricKeys.forEach((key) => {
    const values = metrics
      .slice(0, 30)
      .map(m => {
        const val = m[key];
        return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      })
      .filter(v => v > 0);

    if (values.length < 3) return;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return;

    metrics.slice(0, 10).forEach((metric) => {
      const value = metric[key];
      const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      
      if (numValue === 0) return;

      const zScore = Math.abs((numValue - mean) / stdDev);

      if (zScore > 2) {
        const type = numValue > mean ? 'spike' : 'drop';
        const severity = zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low';
        
        const metricName = key === 'hrv' ? 'HRV' : 
                          key === 'avgGlucose' ? 'Glucose' :
                          key === 'sleepScore' ? 'Sleep Score' : 'Recovery';

        anomalies.push({
          date: metric.date,
          metric: metricName,
          value: numValue,
          severity,
          type,
          message: `${metricName} ${type === 'spike' ? 'unusually high' : 'unusually low'} at ${numValue.toFixed(1)}`,
        });
      }
    });
  });

  return anomalies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function AnomalyDetector({ metrics, isLoading, preview = false }: AnomalyDetectorProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Analyzing data...</div>;
  }

  if (!metrics || metrics.length < 3) {
    return (
      <div className="text-sm text-muted-foreground">
        Not enough data for anomaly detection
      </div>
    );
  }

  const anomalies = detectAnomalies(metrics);
  const displayedAnomalies = preview ? anomalies.slice(0, 3) : anomalies;

  if (anomalies.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <span>No anomalies detected - your metrics are stable!</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayedAnomalies.map((anomaly, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
          data-testid={`anomaly-${idx}`}
        >
          <div className={`mt-0.5 ${
            anomaly.severity === 'high' ? 'text-red-500' :
            anomaly.severity === 'medium' ? 'text-orange-500' :
            'text-yellow-500'
          }`}>
            {anomaly.type === 'spike' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium">{anomaly.message}</p>
              <Badge 
                variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}
                className="shrink-0"
              >
                {anomaly.severity}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(parseISO(anomaly.date), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      ))}
      
      {preview && anomalies.length > 3 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          +{anomalies.length - 3} more anomalies detected
        </p>
      )}
    </div>
  );
}
