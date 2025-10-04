import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";

export default function UltrahumanCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const state = params.get("state");

      if (error) {
        setStatus("error");
        setMessage(params.get("error_description") || "Authorization failed");
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("No authorization code received");
        return;
      }

      const userId = state || localStorage.getItem("ultrahuman_state");
      if (!userId) {
        setStatus("error");
        setMessage("Invalid session state");
        return;
      }

      try {
        const supabase = await getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setStatus("error");
          setMessage("Please log in first");
          return;
        }

        const response = await fetch("/api/ultrahuman/callback", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ code, userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to connect");
        }

        localStorage.removeItem("ultrahuman_state");
        setStatus("success");
        setMessage("Successfully connected to Ultrahuman!");
        
        setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Failed to exchange authorization code");
      }
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === "loading" && "Connecting to Ultrahuman..."}
            {status === "success" && "Connection Successful!"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
          <CardDescription className="text-center">
            {status === "loading" && "Please wait while we complete the connection"}
            {status === "success" && "Redirecting to your dashboard..."}
            {status === "error" && "There was a problem connecting your device"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          )}
          {status === "success" && (
            <CheckCircle2 className="w-12 h-12 text-chart-4" />
          )}
          {status === "error" && (
            <>
              <AlertCircle className="w-12 h-12 text-destructive" />
              <p className="text-sm text-muted-foreground text-center">{message}</p>
              <Button
                onClick={() => setLocation("/dashboard")}
                variant="outline"
                className="w-full"
                data-testid="button-back-dashboard"
              >
                Back to Dashboard
              </Button>
            </>
          )}
          {status === "success" && (
            <p className="text-sm text-muted-foreground text-center">{message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
