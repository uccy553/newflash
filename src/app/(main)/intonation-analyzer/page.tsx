
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, AlertTriangle, Info, LineChart as LineChartIcon, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleAnalyzeIntonationAction } from '@/app/actions/analyze-intonation-action';
import type { AnalyzeSentenceIntonationOutput } from '@/ai/flows/analyze-intonation-flow';
import { TextToSpeechButton } from '@/components/common/text-to-speech-button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts" // RechartsTooltip to avoid name clash
import type { ChartConfig } from "@/components/ui/chart"
import { useLoading } from '@/contexts/loading-context';

const chartConfig = {
  pitch: {
    label: "Pitch Contour",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export default function IntonationAnalyzerPage() {
  const [sentence, setSentence] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeSentenceIntonationOutput | null>(null);
  const [isAnalyzing, startTransition] = useTransition();
  const { toast } = useToast();
  const { startLoading: startAppLoading, stopLoading: stopAppLoading, isLoading: isAppLoading } = useLoading();


  const handleSubmit = () => {
    if (!sentence.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter an English sentence to analyze.',
        variant: 'destructive',
      });
      return;
    }

    startAppLoading();
    setAnalysisResult(null); 
    startTransition(async () => {
      try {
        const result = await handleAnalyzeIntonationAction({ sentence });
        if (result.success && result.data) {
          setAnalysisResult(result.data);
          toast({
            title: 'Analysis Complete',
            description: 'Intonation analysis successful.',
            className: 'bg-accent text-accent-foreground'
          });
        } else {
          setAnalysisResult(null);
          toast({
            title: 'Analysis Failed',
            description: result.error || 'An unknown error occurred.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        setAnalysisResult(null);
        toast({
          title: 'Analysis Error',
          description: (error as Error).message || 'An unexpected error occurred during analysis.',
          variant: 'destructive',
        });
      } finally {
        stopAppLoading();
      }
    });
  };

  const isLoading = isAnalyzing || isAppLoading;

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">English Intonation Analyzer</CardTitle>
          <CardDescription className="text-md sm:text-lg text-muted-foreground">
            Enter an English sentence to analyze its intonation pattern, sentence type, and see a visual representation of its pitch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Textarea
              placeholder="e.g., Are you coming to the party tonight?"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              rows={3}
              className="text-base"
              disabled={isLoading}
            />
             <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                <TextToSpeechButton
                    textToSpeak={sentence}
                    disabled={!sentence.trim() || isLoading}
                    className="w-full sm:w-auto"
                    variant="outline"
                >
                    <Volume2 className="mr-2 h-5 w-5" /> Pronounce Sentence
                </TextToSpeechButton>
                <Button onClick={handleSubmit} disabled={isLoading || !sentence.trim()} className="w-full sm:w-auto">
                    {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                    <Wand2 className="mr-2 h-5 w-5" />
                    )}
                    Analyze Intonation
                </Button>
             </div>
          </div>
        </CardContent>
      </Card>

      {analysisResult && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-md sm:text-lg font-semibold text-primary">Sentence Type</h3>
              <p className="text-sm sm:text-base text-foreground">{analysisResult.sentenceType}</p>
            </div>
            <div>
              <h3 className="text-md sm:text-lg font-semibold text-primary">Intonation Pattern</h3>
              <p className="text-sm sm:text-base text-foreground">{analysisResult.intonationPattern}</p>
            </div>
            <div>
              <h3 className="text-md sm:text-lg font-semibold text-primary">Explanation</h3>
              <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap">{analysisResult.explanation}</p>
            </div>

            {analysisResult.pitchContourData && analysisResult.pitchContourData.length > 0 && (
              <div>
                <h3 className="text-md sm:text-lg font-semibold text-primary mb-2">Visual Pitch Contour</h3>
                 <Alert className="mb-4 bg-primary/5 border-primary/30">
                    <Info className="h-5 w-5 text-primary" />
                    <AlertTitle className="text-primary">Note on Visualization</AlertTitle>
                    <AlertDescription>
                        This graph is a simplified representation of the pitch movement and may not reflect precise phonetic measurements. It illustrates the general contour (e.g., rising, falling).
                    </AlertDescription>
                </Alert>
                <ChartContainer config={chartConfig} className="w-full h-[250px] md:h-[300px]">
                  <LineChart
                    data={analysisResult.pitchContourData}
                    margin={{ top: 5, right: 20, left: 5, bottom: 25 }} // Adjusted margins
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={[0, 1]}
                      ticks={[0, 0.25, 0.5, 0.75, 1]}
                      tickFormatter={(value) => `${value * 100}%`}
                      label={{ value: "Sentence Duration", position: "insideBottom", dy:10, offset: 0 }}
                      className="text-[10px] sm:text-xs" // Smaller tick labels on mobile
                    />
                    <YAxis 
                        dataKey="pitch" 
                        type="number" 
                        domain={[0, 6]} 
                        ticks={[1,2,3,4,5]}
                        label={{ value: "Relative Pitch", angle: -90, position: "insideLeft", offset: 10 }} // Adjusted label offset
                        className="text-[10px] sm:text-xs" // Smaller tick labels on mobile
                    />
                    <RechartsTooltip
                      content={<ChartTooltipContent indicator="dot" />}
                      cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3"}}
                    />
                    <Line
                      dataKey="pitch"
                      type="monotone" 
                      stroke="var(--color-pitch)"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "var(--color-pitch)", strokeWidth:1, stroke: "hsl(var(--background))" }}
                      activeDot={{ r: 7, fill: "var(--color-pitch)", strokeWidth:2, stroke: "hsl(var(--background))" }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            )}
             {analysisResult.pitchContourData && analysisResult.pitchContourData.length === 0 && (
                 <Alert variant="default" className="bg-muted/50">
                    <Info className="h-5 w-5 text-muted-foreground" />
                    <AlertTitle>Pitch Contour Data</AlertTitle>
                    <AlertDescription>
                        AI did not provide specific data points for the pitch contour visualization for this sentence.
                    </AlertDescription>
                </Alert>
             )}

          </CardContent>
        </Card>
      )}
       {isLoading && !analysisResult && (
           <Card className="shadow-lg">
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Analyzing sentence intonation...</p>
                </CardContent>
           </Card>
       )}
    </div>
  );
}

