import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { calculateCyclePhase, getCyclePhaseInfo, predictNextPeriod } from "@/lib/cycleUtils";
import { format, differenceInDays } from "date-fns";
import type { CycleTracking } from "@shared/schema";

interface CycleTrackingCardProps {
  cycle?: CycleTracking;
  isLoading?: boolean;
}

export function CycleTrackingCard({ cycle, isLoading }: CycleTrackingCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-heading">Cycle Tracking</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!cycle) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-heading">Cycle Tracking</CardTitle>
          </div>
          <CardDescription>
            Track your menstrual cycle to correlate with health metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No cycle data recorded yet. Click "Track Cycle" to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const periodStartDate = new Date(cycle.periodStartDate);
  const cycleLength = cycle.cycleLength || 28;
  const currentPhase = calculateCyclePhase(periodStartDate, cycleLength);
  const phaseInfo = getCyclePhaseInfo(currentPhase);
  const nextPeriodDate = predictNextPeriod(periodStartDate, cycleLength);
  const daysUntilNextPeriod = differenceInDays(nextPeriodDate, new Date());

  return (
    <Card className={`shadow-sm ${phaseInfo.bgColor} border-2`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-heading" data-testid="text-cycle-title">
              Cycle Tracking
            </CardTitle>
          </div>
          <Badge variant="outline" className={phaseInfo.color} data-testid="badge-cycle-phase">
            {phaseInfo.name} Phase
          </Badge>
        </div>
        <CardDescription>{phaseInfo.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Period</span>
            <span className="font-medium" data-testid="text-last-period">
              {format(periodStartDate, "MMM d, yyyy")}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Next Period</span>
            <span className="font-medium" data-testid="text-next-period">
              {daysUntilNextPeriod > 0 
                ? `in ${daysUntilNextPeriod} days` 
                : `${Math.abs(daysUntilNextPeriod)} days overdue`}
            </span>
          </div>

          {cycle.flowIntensity && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Flow Intensity</span>
              <span className="font-medium capitalize" data-testid="text-flow-intensity">
                {cycle.flowIntensity}
              </span>
            </div>
          )}

          {cycle.symptoms && Array.isArray(cycle.symptoms) && cycle.symptoms.length > 0 && (
            <div className="pt-2">
              <span className="text-sm text-muted-foreground">Symptoms:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {cycle.symptoms.map((symptom, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {cycle.notes && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground italic" data-testid="text-cycle-notes">
              "{cycle.notes}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
