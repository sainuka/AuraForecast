import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WellnessForecastCard } from "@/components/dashboard/WellnessForecastCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { HealthMetricsChart } from "@/components/dashboard/HealthMetricsChart";
import { UltrahumanConnection } from "@/components/dashboard/UltrahumanConnection";
import { CycleTrackingCard } from "@/components/dashboard/CycleTrackingCard";
import { CycleTrackingDialog } from "@/components/cycle/CycleTrackingDialog";
import { Heart, Moon, Activity, Droplet, Thermometer, LogOut, TrendingUp, Target } from "lucide-react";
import { Link } from "wouter";
import { calculateCyclePhase } from "@/lib/cycleUtils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ["/api/forecast", user?.id],
    enabled: !!user,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/metrics", user?.id],
    enabled: !!user,
  });

  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ["/api/cycles", user?.id, "latest"],
    queryFn: async () => {
      const response = await fetch(`/api/cycles/${user?.id}/latest`);
      if (!response.ok) throw new Error("Failed to fetch cycle");
      return response.json();
    },
    enabled: !!user,
  });

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_ULTRAHUMAN_CLIENT_ID || process.env.ULTRAHUMAN_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/ultrahuman/callback`;
    const scope = "ring_data cgm_data profile";
    
    localStorage.setItem("ultrahuman_state", user?.id || "");
    
    const authUrl = `https://partner.ultrahuman.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${user?.id}`;
    
    window.location.href = authUrl;
  };

  const handleSync = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      await apiRequest("POST", "/api/ultrahuman/sync", { userId: user.id });
      
      await queryClient.invalidateQueries({ queryKey: ["/api/metrics", user.id] });
      
      let cyclePhase;
      if (cycle?.periodStartDate) {
        const periodStartDate = new Date(cycle.periodStartDate);
        const cycleLength = cycle.cycleLength || 28;
        cyclePhase = calculateCyclePhase(periodStartDate, cycleLength);
      }
      
      await apiRequest("POST", "/api/forecast/generate", { 
        userId: user.id,
        cyclePhase 
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/forecast", user.id] });
      
      toast({
        title: "Sync successful",
        description: "Your health data has been updated.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: error.message || "Failed to sync health data",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  if (!user) return null;

  const latestMetric = metrics?.[0];
  const isConnected = !!metrics && metrics.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-semibold" data-testid="text-app-title">
                  Wellness Tracker
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  AI-Powered Women's Health
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/trends">
                <Button variant="ghost" size="sm" data-testid="button-trends">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Trends
                </Button>
              </Link>
              <Link href="/goals">
                <Button variant="ghost" size="sm" data-testid="button-goals">
                  <Target className="w-4 h-4 mr-2" />
                  Goals
                </Button>
              </Link>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="button-logout"
                className="hover-elevate active-elevate-2"
              >
                <LogOut className="w-5 h-5" />
              </Button>
              <Avatar data-testid="avatar-user">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  U
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-heading font-semibold mb-2">
              Welcome back!
            </h2>
            <p className="text-muted-foreground">
              Here's your personalized wellness overview
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <WellnessForecastCard forecast={forecast} isLoading={forecastLoading} />
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  title="Sleep Score"
                  value={latestMetric?.sleepScore || "N/A"}
                  icon={Moon}
                  isLoading={metricsLoading}
                  data-testid="card-sleep-score"
                />
                <MetricCard
                  title="HRV"
                  value={latestMetric?.hrv || "N/A"}
                  unit="ms"
                  icon={Heart}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  title="Recovery"
                  value={latestMetric?.recoveryScore || "N/A"}
                  icon={Activity}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  title="Avg Glucose"
                  value={latestMetric?.avgGlucose ? Number(latestMetric.avgGlucose).toFixed(0) : "N/A"}
                  unit="mg/dL"
                  icon={Droplet}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  title="Temperature"
                  value={latestMetric?.temperature ? Number(latestMetric.temperature).toFixed(1) : "N/A"}
                  unit="°F"
                  icon={Thermometer}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  title="Steps"
                  value={latestMetric?.steps ? (latestMetric.steps > 1000 ? `${(latestMetric.steps / 1000).toFixed(1)}k` : latestMetric.steps) : "N/A"}
                  icon={Activity}
                  isLoading={metricsLoading}
                />
              </div>

              <HealthMetricsChart data={metrics} isLoading={metricsLoading} />
            </div>

            <div className="space-y-6">
              <div className="flex gap-2">
                {user && <CycleTrackingDialog userId={user.id} />}
              </div>
              
              <CycleTrackingCard cycle={cycle} isLoading={cycleLoading} />
              
              <UltrahumanConnection
                isConnected={isConnected}
                lastSync={isConnected ? new Date().toISOString() : undefined}
                onConnect={handleConnect}
                onSync={handleSync}
                isLoading={isSyncing}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
