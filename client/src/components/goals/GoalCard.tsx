import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Edit, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { HealthGoal } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GoalCardProps {
  goal: HealthGoal;
  onEdit: (goal: HealthGoal) => void;
}

const METRIC_LABELS: Record<string, string> = {
  sleepScore: "Sleep Score",
  hrv: "HRV",
  recoveryScore: "Recovery Score",
  steps: "Steps",
  avgGlucose: "Average Glucose",
  temperature: "Temperature",
};

export function GoalCard({ goal, onEdit }: GoalCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const markCompleteMutation = useMutation({
    mutationFn: () => {
      return apiRequest(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal completed!",
        description: "Congratulations on achieving your health goal!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark goal as completed",
        variant: "destructive",
      });
    },
  });

  const currentValue = goal.currentValue ? Number(goal.currentValue) : 0;
  const targetValue = Number(goal.targetValue);
  const baselineValue = goal.baselineValue ? Number(goal.baselineValue) : currentValue;
  
  let progress = 0;
  let goalAchieved = false;
  
  if (goal.goalType === 'improve') {
    progress = Math.min((currentValue / targetValue) * 100, 100);
    goalAchieved = currentValue >= targetValue;
  } else if (goal.goalType === 'reduce') {
    const targetReduction = baselineValue - targetValue;
    const currentReduction = baselineValue - currentValue;
    progress = targetReduction > 0 ? Math.min((currentReduction / targetReduction) * 100, 100) : 0;
    goalAchieved = currentValue <= targetValue;
  } else {
    const tolerance = targetValue * 0.05;
    const difference = Math.abs(currentValue - targetValue);
    progress = difference <= tolerance ? 100 : Math.max(0, 100 - (difference / targetValue) * 100);
    goalAchieved = difference <= tolerance;
  }
  
  const isCompleted = goal.status === 'completed';
  
  const daysLeft = goal.deadline 
    ? differenceInDays(new Date(goal.deadline), new Date())
    : null;

  return (
    <Card className={`shadow-sm ${isCompleted ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-heading" data-testid={`text-goal-title-${goal.id}`}>
              {METRIC_LABELS[goal.targetMetric] || goal.targetMetric}
            </CardTitle>
            <CardDescription className="mt-1">{goal.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isCompleted ? "default" : "secondary"} className="shrink-0">
              {goal.goalType}
            </Badge>
            {!isCompleted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(goal)}
                data-testid={`button-edit-goal-${goal.id}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium" data-testid={`text-goal-progress-${goal.id}`}>
              {currentValue.toFixed(0)} / {targetValue.toFixed(0)}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {progress.toFixed(0)}% complete
          </p>
        </div>

        {daysLeft !== null && !isCompleted && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {daysLeft > 0 
                ? `${daysLeft} days left`
                : daysLeft === 0
                ? 'Due today'
                : `${Math.abs(daysLeft)} days overdue`
              }
            </span>
          </div>
        )}

        {goal.deadline && (
          <div className="text-xs text-muted-foreground">
            Target date: {format(new Date(goal.deadline), "MMM d, yyyy")}
          </div>
        )}

        {!isCompleted && goalAchieved && (
          <Button
            className="w-full"
            onClick={() => markCompleteMutation.mutate()}
            disabled={markCompleteMutation.isPending}
            data-testid={`button-complete-goal-${goal.id}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {markCompleteMutation.isPending ? "Marking..." : "Mark as Completed"}
          </Button>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Goal Achieved!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
