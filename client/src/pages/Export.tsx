import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subMonths } from "date-fns";
import { Download, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Export() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 3));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'metrics' | 'goals' | 'cycles') => {
    if (!user) return;

    setIsExporting(true);
    try {
      let url = "";
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      switch (type) {
        case 'metrics':
          url = `/api/export/metrics/${user.id}?startDate=${startStr}&endDate=${endStr}`;
          break;
        case 'goals':
          url = `/api/export/goals/${user.id}`;
          break;
        case 'cycles':
          url = `/api/export/cycles/${user.id}?startDate=${startStr}&endDate=${endStr}`;
          break;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `export-${type}-${Date.now()}.csv`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export successful",
        description: `Your ${type} data has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Export Your Health Data</h1>
        <p className="text-muted-foreground">
          Download your health data in CSV format for your records or to share with healthcare providers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range Selection</CardTitle>
          <CardDescription>
            Select the date range for exporting your health metrics and cycle tracking data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Health Metrics</CardTitle>
            <CardDescription>
              Export sleep, HRV, glucose, and other health metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleExport('metrics')}
              disabled={isExporting}
              data-testid="button-export-metrics"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Metrics
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Goals</CardTitle>
            <CardDescription>
              Export all your health goals and progress tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleExport('goals')}
              disabled={isExporting}
              data-testid="button-export-goals"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Goals
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cycle Tracking</CardTitle>
            <CardDescription>
              Export menstrual cycle data and symptoms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleExport('cycles')}
              disabled={isExporting}
              data-testid="button-export-cycles"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Cycles
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About Your Data Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            All exports are in CSV (Comma-Separated Values) format, which can be opened with:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Microsoft Excel, Google Sheets, or Apple Numbers</li>
            <li>Medical records systems and health apps</li>
            <li>Data analysis tools like R or Python</li>
          </ul>
          <p className="mt-4">
            Your exported data includes only information from the selected date range. Health Goals export includes all goals regardless of date range.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
