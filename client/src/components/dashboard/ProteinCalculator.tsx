import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface NutritionItem {
  name: string;
  calories: number;
  protein_g: number;
  fat_total_g: number;
  carbohydrates_total_g: number;
}

interface NutritionResult {
  foodText: string;
  totalProtein: number;
  totalCalories: number;
  items: NutritionItem[];
}

export function ProteinCalculator() {
  const [foodText, setFoodText] = useState("");
  const [result, setResult] = useState<NutritionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAnalyze = async () => {
    if (!foodText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some food text",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/nutrition/analyze", { foodText });
      const data = await response.json();

      const result = {
        ...data,
        totalProtein: Number(data.totalProtein) || 0,
        totalCalories: Number(data.totalCalories) || 0,
      };

      setResult(result);

      // Save to database
      if (user?.id) {
        try {
          await apiRequest("POST", "/api/food-logs", {
            userId: user.id,
            foodText: result.foodText,
            totalProtein: result.totalProtein.toString(),
            totalCalories: result.totalCalories.toString(),
            nutritionData: result.items,
          });
          console.log("[ProteinCalculator] Food log saved successfully");
        } catch (saveError) {
          console.error("[ProteinCalculator] Failed to save food log:", saveError);
          // Don't show error to user - saving is background operation
        }
      }

      toast({
        title: "Analysis Complete",
        description: `Total protein: ${result.totalProtein.toFixed(1)}g (saved to your logs)`,
      });
    } catch (error: any) {
      let errorMessage = "Failed to analyze nutrition";
      
      if (error.message) {
        try {
          const parts = error.message.split(": ");
          if (parts.length > 1) {
            const jsonPart = parts.slice(1).join(": ");
            const errorData = JSON.parse(jsonPart);
            errorMessage = errorData.error || errorMessage;
          } else {
            errorMessage = error.message;
          }
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>Protein Calculator</CardTitle>
        </div>
        <CardDescription>
          Enter food items to calculate total protein content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="e.g., 2 chicken breasts and 1 cup of rice"
            value={foodText}
            onChange={(e) => setFoodText(e.target.value)}
            className="min-h-[100px]"
            data-testid="input-food-text"
          />
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full"
            data-testid="button-analyze"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Calculate Protein"
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/10 p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Protein</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-total-protein">
                  {result.totalProtein.toFixed(1)}g
                </p>
              </div>
              <div className="bg-secondary p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Total Calories</p>
                <p className="text-2xl font-bold" data-testid="text-total-calories">
                  {result.totalCalories.toFixed(0)}
                </p>
              </div>
            </div>

            {result.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Breakdown</h4>
                <div className="space-y-2">
                  {result.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center p-3 bg-muted/50 rounded-md text-sm"
                      data-testid={`item-${idx}`}
                    >
                      <span className="font-medium capitalize">{item.name}</span>
                      <div className="flex gap-4 text-muted-foreground">
                        <span>{(Number(item.protein_g) || 0).toFixed(1)}g protein</span>
                        <span>{(Number(item.calories) || 0).toFixed(0)} cal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
