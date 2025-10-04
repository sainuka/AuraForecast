import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import type { HealthMetric } from "@shared/schema";

interface HistoricalChartProps {
  data?: HealthMetric[];
  metricKeys: string[];
  isLoading?: boolean;
}

const METRIC_CONFIG: Record<string, { name: string; color: string; unit?: string }> = {
  sleepScore: { name: "Sleep Score", color: "#8b5cf6" },
  hrv: { name: "HRV", color: "#3b82f6", unit: "ms" },
  recoveryScore: { name: "Recovery", color: "#10b981" },
  avgGlucose: { name: "Avg Glucose", color: "#f59e0b", unit: "mg/dL" },
  temperature: { name: "Temperature", color: "#ef4444", unit: "°F" },
  steps: { name: "Steps", color: "#06b6d4" },
};

export function HistoricalChart({ data, metricKeys, isLoading }: HistoricalChartProps) {
  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  const chartData = data
    .slice(0, 30)
    .reverse()
    .map((metric) => ({
      date: format(parseISO(metric.date), "MMM d"),
      ...metricKeys.reduce((acc, key) => {
        const value = metric[key as keyof HealthMetric];
        acc[key] = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        return acc;
      }, {} as Record<string, number>),
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-xs fill-muted-foreground"
          tick={{ fill: 'currentColor' }}
        />
        <YAxis 
          className="text-xs fill-muted-foreground"
          tick={{ fill: 'currentColor' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend 
          wrapperStyle={{ 
            paddingTop: '1rem',
          }}
        />
        {metricKeys.map((key) => {
          const config = METRIC_CONFIG[key];
          return (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={config?.name || key}
              stroke={config?.color || "#8b5cf6"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
