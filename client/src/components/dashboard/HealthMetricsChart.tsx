import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface HealthMetricsChartProps {
  data?: any[];
  isLoading?: boolean;
}

export function HealthMetricsChart({ data, isLoading }: HealthMetricsChartProps) {
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D">("7D");

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-heading">Health Metrics Trends</CardTitle>
          <CardDescription>Historical overview of your wellness data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const mockData = [
    { date: "Mon", sleep: 75, hrv: 65, recovery: 80, glucose: 95 },
    { date: "Tue", sleep: 82, hrv: 70, recovery: 85, glucose: 92 },
    { date: "Wed", sleep: 68, hrv: 62, recovery: 70, glucose: 98 },
    { date: "Thu", sleep: 78, hrv: 68, recovery: 78, glucose: 90 },
    { date: "Fri", sleep: 85, hrv: 75, recovery: 88, glucose: 88 },
    { date: "Sat", sleep: 90, hrv: 80, recovery: 92, glucose: 85 },
    { date: "Sun", sleep: 88, hrv: 78, recovery: 90, glucose: 87 },
  ];

  const chartData = data && data.length > 0
    ? data.slice(0, 7).reverse().map((metric: any) => ({
        date: new Date(metric.date).toLocaleDateString('en-US', { weekday: 'short' }),
        sleep: metric.sleepScore || 0,
        hrv: metric.hrv || 0,
        recovery: metric.recoveryScore || 0,
        glucose: metric.avgGlucose ? Number(metric.avgGlucose) : 0,
      }))
    : mockData;

  return (
    <Card className="shadow-sm" data-testid="card-health-chart">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-xl font-heading">Health Metrics Trends</CardTitle>
            <CardDescription>Historical overview of your wellness data</CardDescription>
          </div>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <TabsList>
              <TabsTrigger value="7D" data-testid="button-range-7d">7D</TabsTrigger>
              <TabsTrigger value="30D" data-testid="button-range-30d">30D</TabsTrigger>
              <TabsTrigger value="90D" data-testid="button-range-90d">90D</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px" }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="sleep"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
              activeDot={{ r: 6 }}
              name="Sleep Score"
            />
            <Line
              type="monotone"
              dataKey="hrv"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
              activeDot={{ r: 6 }}
              name="HRV"
            />
            <Line
              type="monotone"
              dataKey="recovery"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-3))", r: 4 }}
              activeDot={{ r: 6 }}
              name="Recovery"
            />
            <Line
              type="monotone"
              dataKey="glucose"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-4))", r: 4 }}
              activeDot={{ r: 6 }}
              name="Glucose"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
