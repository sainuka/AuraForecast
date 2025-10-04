import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  isLoading?: boolean;
}

export function MetricCard({ title, value, unit, icon: Icon, trend, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-sm hover-elevate">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded animate-pulse w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hover-elevate" data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-semibold" data-testid={`text-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}
          </div>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.direction === "up" ? (
              <TrendingUp className="w-4 h-4 text-chart-4" />
            ) : (
              <TrendingDown className="w-4 h-4 text-chart-5" />
            )}
            <span className={`text-xs ${trend.direction === "up" ? "text-chart-4" : "text-chart-5"}`}>
              {Math.abs(trend.value)}% from last week
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
