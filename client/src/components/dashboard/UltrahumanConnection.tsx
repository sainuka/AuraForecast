import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface UltrahumanConnectionProps {
  isConnected?: boolean;
  lastSync?: string;
  onConnect?: () => void;
  onSync?: () => void;
  isLoading?: boolean;
}

export function UltrahumanConnection({
  isConnected = false,
  lastSync,
  onConnect,
  onSync,
  isLoading = false,
}: UltrahumanConnectionProps) {
  if (!isConnected) {
    return (
      <Card className="shadow-sm border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <CardTitle className="text-xl font-heading">Connect Ultrahuman</CardTitle>
          </div>
          <CardDescription>
            Link your Ultrahuman device to start tracking your health metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Get access to comprehensive health data including:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 pl-4">
              <li>• Sleep quality and recovery metrics</li>
              <li>• Heart rate variability (HRV)</li>
              <li>• Continuous glucose monitoring (CGM)</li>
              <li>• Movement and activity tracking</li>
              <li>• Temperature and VO2 Max</li>
            </ul>
          </div>
          <Button 
            className="w-full" 
            onClick={onConnect}
            disabled={isLoading}
            data-testid="button-connect-ultrahuman"
          >
            {isLoading ? "Connecting..." : "Connect Ultrahuman Device"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <CardTitle className="text-xl font-heading">Ultrahuman Connected</CardTitle>
          </div>
          <Badge className="gap-1" data-testid="badge-connection-status">
            <CheckCircle2 className="w-3 h-3" />
            Connected
          </Badge>
        </div>
        <CardDescription>
          Your health data is syncing automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Last synced</span>
          <span className="text-sm font-medium" data-testid="text-last-sync">
            {lastSync ? new Date(lastSync).toLocaleString() : "Never"}
          </span>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={onSync}
          disabled={isLoading}
          data-testid="button-sync-data"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Syncing..." : "Sync Now"}
        </Button>
      </CardContent>
    </Card>
  );
}
