import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { HealthMetric, CycleTracking } from "@shared/schema";

interface TrendInsightsProps {
  metrics?: HealthMetric[];
  cycle?: CycleTracking;
  isLoading?: boolean;
}

interface Insight {
  metric: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  message: string;
}

function calculateTrend(data: number[]): { trend: 'up' | 'down' | 'stable'; change: number } {
  if (data.length < 2) return { trend: 'stable', change: 0 };
  
  const recent = data.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, data.length);
  const older = data.slice(3, 7).reduce((a, b) => a + b, 0) / Math.min(4, data.slice(3, 7).length);
  
  const change = ((recent - older) / older) * 100;
  
  if (Math.abs(change) < 5) return { trend: 'stable', change };
  return { trend: change > 0 ? 'up' : 'down', change };
}

export function TrendInsights({ metrics, cycle, isLoading }: TrendInsightsProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Generating insights...</div>;
  }

  if (!metrics || metrics.length < 4) {
    return (
      <div className="text-sm text-muted-foreground">
        Track more data to see personalized insights
      </div>
    );
  }

  const insights: Insight[] = [];

  const sleepData = metrics.map(m => Number(m.sleepScore) || 0).filter(v => v > 0);
  const hrvData = metrics.map(m => Number(m.hrv) || 0).filter(v => v > 0);
  const recoveryData = metrics.map(m => Number(m.recoveryScore) || 0).filter(v => v > 0);

  if (sleepData.length >= 4) {
    const { trend, change } = calculateTrend(sleepData);
    insights.push({
      metric: 'Sleep Quality',
      trend,
      change,
      message: trend === 'up' 
        ? `Your sleep quality has improved by ${Math.abs(change).toFixed(0)}%`
        : trend === 'down'
        ? `Your sleep quality has decreased by ${Math.abs(change).toFixed(0)}%`
        : 'Your sleep quality remains consistent',
    });
  }

  if (hrvData.length >= 4) {
    const { trend, change } = calculateTrend(hrvData);
    insights.push({
      metric: 'Heart Rate Variability',
      trend,
      change,
      message: trend === 'up'
        ? `Your HRV is trending upward by ${Math.abs(change).toFixed(0)}% - great recovery!`
        : trend === 'down'
        ? `Your HRV has decreased by ${Math.abs(change).toFixed(0)}% - consider more rest`
        : 'Your HRV is stable',
    });
  }

  if (recoveryData.length >= 4) {
    const { trend, change } = calculateTrend(recoveryData);
    insights.push({
      metric: 'Recovery',
      trend,
      change,
      message: trend === 'up'
        ? `Recovery improving by ${Math.abs(change).toFixed(0)}%`
        : trend === 'down'
        ? `Recovery declining by ${Math.abs(change).toFixed(0)}%`
        : 'Recovery levels are stable',
    });
  }

  if (cycle) {
    const periodStart = new Date(cycle.periodStartDate);
    const daysSince = Math.floor((Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const cycleLength = cycle.cycleLength || 28;
    
    if (daysSince >= 0 && daysSince <= cycleLength) {
      let cycleMessage = '';
      if (daysSince < 5) {
        cycleMessage = 'You may experience lower energy during menstruation';
      } else if (daysSince < 14) {
        cycleMessage = 'Your energy levels typically peak during the follicular phase';
      } else if (daysSince < 16) {
        cycleMessage = 'Ovulation phase - optimal time for intense workouts';
      } else {
        cycleMessage = 'Luteal phase - focus on rest and recovery';
      }
      
      insights.push({
        metric: 'Cycle Phase',
        trend: 'stable',
        change: 0,
        message: cycleMessage,
      });
    }
  }

  if (insights.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No significant trends detected yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, idx) => (
        <div key={idx} className="flex items-start gap-3" data-testid={`insight-${idx}`}>
          <div className={`mt-0.5 ${
            insight.trend === 'up' ? 'text-green-500' :
            insight.trend === 'down' ? 'text-red-500' :
            'text-muted-foreground'
          }`}>
            {insight.trend === 'up' ? (
              <TrendingUp className="w-5 h-5" />
            ) : insight.trend === 'down' ? (
              <TrendingDown className="w-5 h-5" />
            ) : (
              <Minus className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{insight.metric}</p>
            <p className="text-sm text-muted-foreground">{insight.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
