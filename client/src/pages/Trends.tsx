import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Activity, Moon, Heart, Droplet, Thermometer, ArrowLeft, Target, Download, Home } from "lucide-react";
import { HistoricalChart } from "@/components/trends/HistoricalChart";
import { AnomalyDetector } from "@/components/trends/AnomalyDetector";
import { CorrelationHeatmap } from "@/components/trends/CorrelationHeatmap";
import { TrendInsights } from "@/components/trends/TrendInsights";

export default function Trends() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/metrics", user?.id],
    enabled: !!user,
  });

  const { data: cycle } = useQuery({
    queryKey: ["/api/cycles", user?.id, "latest"],
    queryFn: async () => {
      const response = await fetch(`/api/cycles/${user?.id}/latest`);
      if (!response.ok) throw new Error("Failed to fetch cycle");
      return response.json();
    },
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" data-testid="button-nav-dashboard">
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/goals">
                  <Button variant="ghost" size="sm" data-testid="button-nav-goals">
                    <Target className="w-4 h-4 mr-2" />
                    Goals
                  </Button>
                </Link>
                <Link href="/export">
                  <Button variant="ghost" size="sm" data-testid="button-nav-export">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </Link>
              </div>
            </div>
            <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              Health Trends & Analysis
            </h1>
            <p className="text-muted-foreground mt-2">
              Discover patterns in your health data over time
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="overview" data-testid="tab-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="metrics" data-testid="tab-metrics">
                Metrics
              </TabsTrigger>
              <TabsTrigger value="correlations" data-testid="tab-correlations">
                Correlations
              </TabsTrigger>
              <TabsTrigger value="anomalies" data-testid="tab-anomalies">
                Anomalies
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Key Insights
                    </CardTitle>
                    <CardDescription>
                      AI-powered analysis of your health trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TrendInsights 
                      metrics={metrics} 
                      cycle={cycle}
                      isLoading={metricsLoading} 
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Recent Anomalies
                    </CardTitle>
                    <CardDescription>
                      Unusual patterns detected in your data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnomalyDetector 
                      metrics={metrics} 
                      isLoading={metricsLoading}
                      preview={true}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>30-Day Overview</CardTitle>
                  <CardDescription>
                    Your key health metrics over the past month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HistoricalChart 
                    data={metrics} 
                    metricKeys={['sleepScore', 'hrv', 'recoveryScore']}
                    isLoading={metricsLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-6">
              <div className="grid gap-6">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Moon className="w-5 h-5 text-primary" />
                      Sleep & Recovery Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HistoricalChart 
                      data={metrics} 
                      metricKeys={['sleepScore', 'recoveryScore']}
                      isLoading={metricsLoading}
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-primary" />
                      Heart Rate Variability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HistoricalChart 
                      data={metrics} 
                      metricKeys={['hrv']}
                      isLoading={metricsLoading}
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Droplet className="w-5 h-5 text-primary" />
                      Glucose & Temperature
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HistoricalChart 
                      data={metrics} 
                      metricKeys={['avgGlucose', 'temperature']}
                      isLoading={metricsLoading}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="correlations" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Metric Correlations</CardTitle>
                  <CardDescription>
                    Discover how your health metrics relate to each other
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CorrelationHeatmap 
                    metrics={metrics} 
                    isLoading={metricsLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anomalies" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Anomaly Detection</CardTitle>
                  <CardDescription>
                    Identifying unusual patterns in your health data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AnomalyDetector 
                    metrics={metrics} 
                    isLoading={metricsLoading}
                    preview={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
