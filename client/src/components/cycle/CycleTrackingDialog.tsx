import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const cycleFormSchema = z.object({
  periodStartDate: z.date(),
  periodEndDate: z.date().optional(),
  flowIntensity: z.enum(['light', 'medium', 'heavy']).optional(),
  symptoms: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

type CycleFormData = z.infer<typeof cycleFormSchema>;

const COMMON_SYMPTOMS = [
  'Cramps',
  'Headache',
  'Mood swings',
  'Fatigue',
  'Bloating',
  'Breast tenderness',
  'Acne',
  'Back pain',
];

interface CycleTrackingDialogProps {
  userId: string;
}

export function CycleTrackingDialog({ userId }: CycleTrackingDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CycleFormData>({
    resolver: zodResolver(cycleFormSchema),
    defaultValues: {
      periodStartDate: new Date(),
      symptoms: [],
    },
  });

  const createCycleMutation = useMutation({
    mutationFn: (data: CycleFormData) => {
      return apiRequest(`/api/cycles`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          periodStartDate: data.periodStartDate.toISOString(),
          periodEndDate: data.periodEndDate?.toISOString(),
          flowIntensity: data.flowIntensity,
          symptoms: data.symptoms,
          notes: data.notes,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cycles', userId] });
      toast({
        title: "Cycle tracked",
        description: "Your menstrual cycle data has been recorded.",
      });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to track cycle. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CycleFormData) => {
    createCycleMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-track-cycle">
          <Calendar className="w-4 h-4 mr-2" />
          Track Cycle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Track Menstrual Cycle</DialogTitle>
          <DialogDescription>
            Log your cycle details to correlate with health metrics
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="periodStartDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Period Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-period-start-date"
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="flowIntensity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flow Intensity</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-flow-intensity">
                        <SelectValue placeholder="Select intensity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="heavy">Heavy</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symptoms"
              render={() => (
                <FormItem>
                  <FormLabel>Symptoms</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {COMMON_SYMPTOMS.map((symptom) => (
                      <FormField
                        key={symptom}
                        control={form.control}
                        name="symptoms"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(symptom)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, symptom])
                                    : field.onChange(field.value?.filter((s) => s !== symptom));
                                }}
                                data-testid={`checkbox-symptom-${symptom.toLowerCase().replace(' ', '-')}`}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {symptom}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional observations..."
                      {...field}
                      data-testid="textarea-cycle-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={createCycleMutation.isPending} data-testid="button-save-cycle">
                {createCycleMutation.isPending ? "Saving..." : "Save Cycle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
