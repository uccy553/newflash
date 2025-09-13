
'use client';

import { useState, useTransition, ChangeEvent, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, AlertTriangle, Sigma, Brain, FileImage, UploadCloud, Trash2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleSolveMathProblemAction } from '@/app/actions/solve-math-problem-action';
import type { SolveMathProblemOutput, SolveMathProblemInput } from '@/types';
import { useLoading } from '@/contexts/loading-context';
import { MathRenderer } from '@/components/math/math-renderer';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import { MAX_MATH_IMAGE_SIZE_MB, MAX_MATH_IMAGE_SIZE_BYTES } from '@/lib/constants';

const TARGET_MATH_IMAGE_SIZE_MB = 0.5;
const TARGET_MATH_IMAGE_SIZE_BYTES = TARGET_MATH_IMAGE_SIZE_MB * 1024 * 1024;


export default function MathSolverPage() {
  const [problemStatement, setProblemStatement] = useState('');
  const [mathContext, setMathContext] = useState('');
  const [result, setResult] = useState<SolveMathProblemOutput | null>(null);
  const [isSolving, startTransition] = useTransition();
  const { toast } = useToast();
  const { startLoading: startAppLoading, stopLoading: stopAppLoading, isLoading: isAppLoading } = useLoading();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const compressMathImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: TARGET_MATH_IMAGE_SIZE_MB,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: file.type,
    };
    try {
      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed math image ${file.name} from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      return new File([compressedFile], file.name, { type: file.type, lastModified: file.lastModified });
    } catch (error) {
      console.error('Error compressing math image:', error);
      toast({
        title: 'Compression Error',
        description: `Could not compress ${file.name}. Using original.`,
        variant: 'warning',
      });
      return file;
    }
  };


  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive" });
        clearImage();
        return;
      }

      setIsCompressingImage(true);
      startAppLoading();
      setResult(null);

      try {
        const processedFile = file.size > TARGET_MATH_IMAGE_SIZE_BYTES ? await compressMathImage(file) : file;

        if (processedFile.size > MAX_MATH_IMAGE_SIZE_BYTES) {
          toast({
            title: "File Too Large",
            description: `Image is too large (Max: ${MAX_MATH_IMAGE_SIZE_MB}MB after compression). Please choose a smaller file.`,
            variant: "destructive",
          });
          clearImage();
          return;
        }

        setImageFile(processedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(processedFile);
      } catch (error) {
        console.error("Error processing image:", error);
        toast({title: "Image Processing Error", description: "Could not process the image.", variant: "destructive"});
        clearImage();
      } finally {
        setIsCompressingImage(false);
        stopAppLoading();
      }
    }
  };

  const handleSubmit = () => {
    const trimmedProblemStatement = problemStatement.trim();
    const trimmedMathContext = mathContext.trim();

    if (!trimmedProblemStatement && !imageFile) {
      toast({
        title: 'Input Required',
        description: 'Please enter a math problem statement or upload an image.',
        variant: 'destructive',
      });
      return;
    }

    startAppLoading();
    setResult(null);
    startTransition(async () => {
      // Construct payload, ensuring problemStatement is undefined if empty, not an empty string
      const inputPayload: SolveMathProblemInput = {
        ...(trimmedProblemStatement && { problemStatement: trimmedProblemStatement }),
        ...(trimmedMathContext && { mathContext: trimmedMathContext }),
        ...(imagePreview && { imageDataUri: imagePreview }),
      };
      
      // If problemStatement was not added (because it was empty),
      // and imageDataUri IS present, this structure is correct.
      // The Zod schema's .refine will check that at least one is present.
      // And .optional() with .min(1) on problemStatement means if it *is* present, it must not be empty.
      // If it's not present at all in the payload (undefined), .min(1) is not checked.

      try {
        const response = await handleSolveMathProblemAction(inputPayload);
        if (response.success && response.data) {
          setResult(response.data);
          if (response.data.solution.toLowerCase().includes("unable to solve") || response.data.solution.toLowerCase().includes("error")) {
            toast({
              title: 'Problem Parsing Issue',
              description: response.data.parsedProblem || "The AI couldn't fully understand or solve the problem as stated.",
              variant: 'warning',
              duration: 7000,
            });
          } else {
            toast({
              title: 'Solution Generated!',
              description: 'The math problem has been processed.',
              className: 'bg-accent text-accent-foreground',
            });
          }
        } else {
          setResult(null);
          toast({
            title: 'Solving Failed',
            description: response.error || 'An unknown error occurred while solving.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        setResult(null);
        console.error('Math Solver Submit Error:', error);

        let userFriendlyMessage = 'An unexpected error occurred. Please try again.';
        if (error instanceof Error && error.message) {
          if (error.message.length > 150 || error.message.includes('\n') || error.message.startsWith('[')) {
            userFriendlyMessage = 'An error occurred. Please check the console for details or try again.';
          } else {
            userFriendlyMessage = error.message;
          }
        } else if (typeof error === 'string' && error.length < 150 && !error.includes('\n') && !error.startsWith('[')) {
          userFriendlyMessage = error;
        }

        toast({
          title: 'Error Solving Problem',
          description: userFriendlyMessage,
          variant: 'destructive',
        });
      } finally {
        stopAppLoading();
      }
    });
  };

  const isLoading = isSolving || isAppLoading || isCompressingImage;

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Sigma className="mr-3 h-8 w-8 text-primary" /> AI Math Problem Solver
          </CardTitle>
          <CardDescription className="text-md sm:text-lg text-muted-foreground">
            Enter a math problem via text or upload an image. Our AI will attempt to solve it and provide a step-by-step explanation.
            Image-based solving is experimental and works best with clear, printed math.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="math-problem-text" className="font-medium text-foreground">Math Problem Statement (Text)</Label>
            <Textarea
              id="math-problem-text"
              placeholder="e.g., Solve for x: 2x + 5 = 11. Or: If a train travels at 60 mph for 3 hours, how far does it travel?"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              rows={3}
              className="text-base"
              disabled={isLoading}
            />
             <p className="text-xs text-muted-foreground">You can provide the problem as text, or upload an image, or both.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="math-image-upload" className="font-medium text-foreground">Upload Math Problem Image (Optional & Experimental)</Label>
            {imagePreview ? (
                 <div className="mt-2 space-y-2">
                    <div className="relative w-full max-w-sm h-48 border rounded-md overflow-hidden bg-muted/20">
                        <Image
                        src={imagePreview}
                        alt="Math problem preview"
                        fill
                        className="object-contain"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearImage}
                        disabled={isLoading}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Clear Image
                    </Button>
                 </div>
            ) : (
                <div
                    id="math-image-upload-trigger"
                    className={cn(
                    "mt-1 flex flex-col justify-center items-center w-full h-32 px-4 pt-4 pb-4 border-2 border-dashed rounded-md cursor-pointer hover:border-accent transition-colors",
                    isLoading && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !isLoading && fileInputRef.current?.click()}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isLoading) fileInputRef.current?.click();}}
                >
                    <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-semibold text-accent">Click to upload image</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        PNG, JPG up to {MAX_MATH_IMAGE_SIZE_MB}MB. Clear, printed math works best.
                    </p>
                    {isCompressingImage && (
                      <div className="mt-2 flex items-center text-primary text-xs">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        <span>Compressing...</span>
                      </div>
                    )}
                </div>
            )}
            <Input
              id="math-image-upload-input"
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleImageChange}
              className="hidden"
              disabled={isLoading}
            />
          </div>


          <div className="space-y-2">
            <Label htmlFor="math-context" className="font-medium text-foreground">Math Context/Topic (Optional)</Label>
            <Input
              id="math-context"
              placeholder="e.g., Algebra, Calculus, Word Problem, Geometry"
              value={mathContext}
              onChange={(e) => setMathContext(e.target.value)}
              className="text-base"
              disabled={isLoading}
            />
             <p className="text-xs text-muted-foreground">Providing context can help the AI understand the problem better.</p>
          </div>
          <Button onClick={handleSubmit} disabled={isLoading || (!problemStatement.trim() && !imageFile)} className="w-full sm:w-auto">
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-5 w-5" />
            )}
            Solve Problem with AI
          </Button>
        </CardContent>
      </Card>

      {isLoading && !result && (
        <Card className="shadow-lg">
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">AI is analyzing and solving the math problem...</p>
            {isCompressingImage && <p className="text-sm text-primary mt-2">Compressing image first...</p>}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl flex items-center">
                 <Brain className="mr-3 h-7 w-7 text-primary" /> AI Solution & Explanation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {result.extractedProblemFromImage && (
              <div>
                <h3 className="text-lg font-semibold text-primary">AI's Transcription from Image:</h3>
                <Alert variant="default" className="my-2 bg-muted/30">
                  <Info className="h-5 w-5" />
                  <AlertDescription>
                    This is the AI's best attempt at reading the math problem from your uploaded image.
                    Please verify its accuracy, as errors here can affect the solution.
                    Math OCR is experimental.
                  </AlertDescription>
                </Alert>
                <p className="text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md border mt-1">
                  {result.extractedProblemFromImage}
                </p>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-primary">AI's Understanding of the Problem:</h3>
              <p className="text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md border mt-1">
                {result.parsedProblem}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Solution:</h3>
              <div className="text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md border mt-1 text-lg font-medium">
                 <MathRenderer equation={result.solution} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Detailed Step-by-Step Explanation:</h3>
              <div className="prose dark:prose-invert max-w-none text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md border mt-1 leading-relaxed">
                {result.detailedExplanation.split('\n').map((line, index) => (
                  <p key={index} className="mb-2 last:mb-0">{line}</p>
                ))}
              </div>
            </div>
            {result.solution.toLowerCase().includes("unable to solve") && (
                 <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Review Problem Statement or Image</AlertTitle>
                    <AlertDescription>
                        The AI indicated it was unable to fully solve or parse the problem.
                        If you uploaded an image, check the "AI's Transcription from Image" for accuracy.
                        Otherwise, review your text input for clarity or try rephrasing.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
