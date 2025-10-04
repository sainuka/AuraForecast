import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { HealthGoal } from "@shared/schema";

const goalFormSchema = z.object({
  goalType: z.enum(['improve', 'maintain', 'reduce']),
  targetMetric: z.string().min(1, "Please select a metric"),
  targetValue: z.string().min(1, "Target value is required"),
  currentValue: z.string().optional(),
  deadline: z.date().optional(),
  description: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalFormSchema>;

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: HealthGoal;
  userId: string;
}

const METRICS = [
  { value: 'sleepScore', label: 'Sleep Score' },
  { value: 'hrv', label: 'HRV (Heart Rate Variability)' },
  { value: 'recoveryScore', label: 'Recovery Score' },
  { value: 'steps', label: 'Daily Steps' },
  { value: 'avgGlucose', label: 'Average Glucose' },
  { value: 'temperature', label: 'Body Temperature' },
];

export function GoalDialog({ open, onOpenChange, goal, userId }: GoalDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: metrics } = useQuery({
    queryKey: ["/api/metrics", userId],
    enabled: !!userId && open,
  });

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      goalType: 'improve',
      targetMetric: '',
      targetValue: '',
      currentValue: '',
      description: '',
    },
  });

  useEffect(() => {
    if (goal) {
      form.reset({
        goalType: goal.goalType as 'improve' | 'maintain' | 'reduce',
        targetMetric: goal.targetMetric,
        targetValue: goal.targetValue?.toString() || '',
        currentValue: goal.currentValue?.toString() || '',
        deadline: goal.deadline ? new Date(goal.deadline) : undefined,
        description: goal.description || '',
      });
    } else {
      form.reset({
        goalType: 'improve',
        targetMetric: '',
        targetValue: '',
        currentValue: '',
        description: '',
      });
      
      if (metrics && metrics.length > 0) {
        const latestMetric = metrics[0];
        const selectedMetric = form.watch('targetMetric');
        if (selectedMetric && latestMetric[selectedMetric as keyof typeof latestMetric]) {
          const currentVal = latestMetric[selectedMetric as keyof typeof latestMetric];
          form.setValue('currentValue', currentVal?.toString() || '');
        }
      }
    }
  }, [goal, form, metrics]);

  const createGoalMutation = useMutation({
    mutationFn: (data: GoalFormData) => {
      const currentVal = data.currentValue ? parseFloat(data.currentValue) : null;
      
      if (goal) {
        const updatePayload = {
          targetValue: parseFloat(data.targetValue),
          currentValue: currentVal,
          deadline: data.deadline?.toISOString(),
          description: data.description,
        };
        
        return apiRequest(`/api/goals/${goal.id}`, {
          method: 'PATCH',
          body: JSON.stringify(updatePayload),
        });
      }
      
      const createPayload = {
        userId,
        goalType: data.goalType,
        targetMetric: data.targetMetric,
        targetValue: parseFloat(data.targetValue),
        baselineValue: currentVal,
        currentValue: currentVal,
        deadline: data.deadline?.toISOString(),
        description: data.description,
        status: 'active',
      };
      
      return apiRequest(`/api/goals`, {
        method: 'POST',
        body: JSON.stringify(createPayload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: goal ? "Goal updated" : "Goal created",
        description: goal ? "Your health goal has been updated." : "Your health goal has been created.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: goal ? "Failed to update goal" : "Failed to create goal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GoalFormData) => {
    createGoalMutation.mutate(data);
  };

  const watchedMetric = form.watch('targetMetric');
  useEffect(() => {
    if (watchedMetric && metrics && metrics.length > 0 && !goal) {
      const latestMetric = metrics[0];
      const currentVal = latestMetric[watchedMetric as keyof typeof latestMetric];
      if (currentVal) {
        form.setValue('currentValue', currentVal.toString());
      }
    }
  }, [watchedMetric, metrics, form, goal]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
          <DialogDescription>
            Set a health target and track your progress over time
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="goalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-goal-type">
                        <SelectValue placeholder="Select goal type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="improve">Improve</SelectItem>
                      <SelectItem value="maintain">Maintain</SelectItem>
                      <SelectItem value="reduce">Reduce</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetMetric"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Metric</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-target-metric">
                        <SelectValue placeholder="Select metric to track" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {METRICS.map((metric) => (
                        <SelectItem key={metric.value} value={metric.value}>
                          {metric.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Value</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        data-testid="input-current-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        data-testid="input-target-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Deadline (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-deadline"
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Set a target date to achieve your goal
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Why is this goal important to you?"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={createGoalMutation.isPending}
                data-testid="button-save-goal"
              >
                {createGoalMutation.isPending ? "Saving..." : goal ? "Update Goal" : "Create Goal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
