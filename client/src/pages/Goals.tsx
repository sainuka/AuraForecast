import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, ArrowLeft, Plus } from "lucide-react";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalDialog } from "@/components/goals/GoalDialog";
import { useState } from "react";
import type { HealthGoal } from "@shared/schema";

export default function Goals() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<HealthGoal | undefined>();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  const { data: activeGoals, isLoading: activeLoading } = useQuery<HealthGoal[]>({
    queryKey: ["/api/goals", user?.id, "active"],
    queryFn: async () => {
      const response = await fetch(`/api/goals/${user?.id}?status=active`);
      if (!response.ok) throw new Error("Failed to fetch goals");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: completedGoals, isLoading: completedLoading } = useQuery<HealthGoal[]>({
    queryKey: ["/api/goals", user?.id, "completed"],
    queryFn: async () => {
      const response = await fetch(`/api/goals/${user?.id}?status=completed`);
      if (!response.ok) throw new Error("Failed to fetch goals");
      return response.json();
    },
    enabled: !!user,
  });

  const handleCreateGoal = () => {
    setEditingGoal(undefined);
    setDialogOpen(true);
  };

  const handleEditGoal = (goal: HealthGoal) => {
    setEditingGoal(goal);
    setDialogOpen(true);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
                  <Target className="w-8 h-8 text-primary" />
                  Health Goals
                </h1>
                <p className="text-muted-foreground mt-2">
                  Set and track your personalized health targets
                </p>
              </div>
              <Button onClick={handleCreateGoal} data-testid="button-create-goal">
                <Plus className="w-4 h-4 mr-2" />
                New Goal
              </Button>
            </div>
          </div>

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active" data-testid="tab-active-goals">
                Active Goals
                {activeGoals && activeGoals.length > 0 && (
                  <span className="ml-2 bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
                    {activeGoals.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed-goals">
                Completed
                {completedGoals && completedGoals.length > 0 && (
                  <span className="ml-2 bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full text-xs">
                    {completedGoals.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : activeGoals && activeGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeGoals.map((goal) => (
                    <GoalCard 
                      key={goal.id} 
                      goal={goal} 
                      onEdit={handleEditGoal}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active goals yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first health goal to start tracking progress
                  </p>
                  <Button onClick={handleCreateGoal} data-testid="button-create-first-goal">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Goal
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : completedGoals && completedGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {completedGoals.map((goal) => (
                    <GoalCard 
                      key={goal.id} 
                      goal={goal}
                      onEdit={handleEditGoal}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-muted-foreground">
                    No completed goals yet
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <GoalDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingGoal(undefined);
        }}
        goal={editingGoal}
        userId={user.id}
      />
    </div>
  );
}
