
'use client';

import { useState, useTransition, ChangeEvent, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2, FileImage, CheckCircle, UploadCloud, FolderPlus, Trash2, PackageOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleDigitizeNoteAction } from '@/app/actions/digitize-note-action';
import type { DigitizeHandwrittenNoteOutput } from '@/ai/flows/digitize-handwritten-note-flow';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { createNote } from '@/lib/firestore-client';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLoading } from '@/contexts/loading-context';
import { MAX_IMAGES_PER_UPLOAD } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

const TARGET_IMAGE_SIZE_MB = 0.6;
const TARGET_IMAGE_SIZE_BYTES = TARGET_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_COMPRESSION_SIZE_MB = 5;
const MAX_COMPRESSION_SIZE_BYTES = MAX_COMPRESSION_SIZE_MB * 1024 * 1024;

export function DigitizeNoteForm() {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [digitizedResult, setDigitizedResult] = useState<DigitizeHandwrittenNoteOutput | null>(null);
  const [isProcessingAi, startAiTransition] = useTransition();
  const [isCompressing, setIsCompressing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null);

  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { startLoading: startAppLoading, stopLoading: stopAppLoading, isLoading: isAppLoading } = useLoading();

  const resetFormState = useCallback(() => {
    setImageFiles([]);
    setImagePreviews([]);
    setDigitizedResult(null);
    setTitle('');
    setContent('');
    setCategoryInput('');
    setProcessingProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleDeleteImage = useCallback((indexToDelete: number) => {
    setImageFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToDelete));
    setImagePreviews(prevPreviews => prevPreviews.filter((_, index) => index !== indexToDelete));
  }, []);

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: TARGET_IMAGE_SIZE_MB,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed ${file.name} from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

      if (compressedFile instanceof Blob && !(compressedFile instanceof File)) {
        return new File([compressedFile], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        });
      }
      return compressedFile as File;
    } catch (error) {
      console.error('Error compressing image:', error);
      toast({
        title: 'Compression Error',
        description: `Could not compress ${file.name}. Using original file.`,
        variant: 'warning',
      });
      return file;
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newSelectedFilesArray = Array.from(files);

      if (imageFiles.length + newSelectedFilesArray.length > MAX_IMAGES_PER_UPLOAD) {
        toast({
          title: "Too Many Files",
          description: `You can upload a maximum of ${MAX_IMAGES_PER_UPLOAD} images in total. You have ${imageFiles.length} already selected.`,
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setIsCompressing(true);
      startAppLoading();

      try {
        let validNewFiles: File[] = [];
        let validNewPreviews: string[] = [];

        for (const file of newSelectedFilesArray) {
           if (!file.type.startsWith('image/')) {
            toast({
              title: "Invalid File Type",
              description: `File "${file.name}" is not a valid image type and was skipped.`,
              variant: "warning",
            });
            continue;
          }

          const shouldCompress = file.size > TARGET_IMAGE_SIZE_BYTES;
          const processedFile = shouldCompress ? await compressImage(file) : file;

          if (processedFile.size > MAX_COMPRESSION_SIZE_BYTES) {
            toast({
              title: "File Too Large",
              description: `Image "${file.name}" is too large (Max: ${MAX_COMPRESSION_SIZE_MB}MB after potential compression) and was skipped.`,
              variant: "warning",
            });
            continue;
          }
          validNewFiles.push(processedFile);

          const preview = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(processedFile);
          });
          validNewPreviews.push(preview);
        }

        setImageFiles(prev => [...prev, ...validNewFiles]);
        setImagePreviews(prev => [...prev, ...validNewPreviews]);

      } catch (error) {
        console.error("Error processing images:", error);
        toast({
          title: "Processing Error",
          description: "Could not process the uploaded images.",
          variant: "destructive",
        });
      } finally {
        setIsCompressing(false);
        stopAppLoading();
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleDigitize = () => {
    if (imagePreviews.length === 0) {
      toast({
        title: 'No Images Selected',
        description: 'Please select images of your handwritten notes.',
        variant: 'destructive'
      });
      return;
    }

    startAppLoading();
    setDigitizedResult(null);
    setContent('');
    setTitle('');
    setProcessingProgress({ current: 0, total: imagePreviews.length });

    startAiTransition(async () => {
      let combinedContent = "";
      let suggestedTitleFromFirst = "";

      try {
        for (let i = 0; i < imagePreviews.length; i++) {
          const preview = imagePreviews[i];
          setProcessingProgress({ current: i + 1, total: imagePreviews.length });

          toast({
            title: `Digitizing Image ${i + 1} of ${imagePreviews.length}`,
            description: "AI is processing...",
            duration: 3000,
          });

          const result = await handleDigitizeNoteAction({ imageDataUri: preview });
          if (result.success && result.data) {
            if (i === 0) {
              suggestedTitleFromFirst = result.data.suggestedTitle;
            }
            combinedContent += (result.data.correctedAndFormattedText || "") + "\n\n";
          } else {
            toast({
              title: `Error Processing Image ${i + 1}`,
              description: result.error || `Failed to process image ${i + 1}. It will be skipped.`,
              variant: 'destructive',
              duration: 5000,
            });
            combinedContent += `[Error processing image ${i + 1}]\n\n`;
          }
        }

        if (!combinedContent.trim() && imagePreviews.length > 0) {
          throw new Error("No text was successfully extracted from the uploaded images.");
        }

        setDigitizedResult({ suggestedTitle: suggestedTitleFromFirst, correctedAndFormattedText: combinedContent.trim() });
        setTitle(suggestedTitleFromFirst);
        setContent(combinedContent.trim());

        toast({
          title: 'Digitization Complete!',
          description: `Processed ${imagePreviews.length} image(s). Review the extracted text and save your note.`,
          className: 'bg-accent text-accent-foreground',
          duration: 7000,
        });
      } catch (error) {
        console.error("Digitization error:", error);
        toast({
          title: 'Digitization Failed',
          description: (error as Error).message || 'An unknown error occurred during the batch process.',
          variant: 'destructive'
        });
      } finally {
        setProcessingProgress(null);
        stopAppLoading();
      }
    });
  };

  const saveNoteMutation = useMutation({
    mutationFn: async (noteData: { title: string; content: string; category: string }) => {
      if (!currentUser) throw new Error('User not authenticated.');
      startAppLoading();
      const { ...restOfNoteData } = noteData;

      return createNote(currentUser.uid, {
        ...restOfNoteData,
        // Save the first image preview as sourceImageUrl, if any.
        sourceImageUrl: imagePreviews.length > 0 ? imagePreviews[0] : undefined,
      });
    },
    onSuccess: (newNoteId) => {
      queryClient.invalidateQueries({ queryKey: ['notes', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['userNoteCategories', currentUser?.uid] });
      toast({
        title: 'Note Saved!',
        description: 'Your digitized note has been saved.',
        className: 'bg-accent text-accent-foreground'
      });
      resetFormState();
      router.push(`/notes/${newNoteId}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Saving Note',
        description: `Failed: ${error.message}`,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      stopAppLoading();
    }
  });


  const handleSaveNote = () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Title and content are required to save the note.',
        variant: 'destructive'
      });
      return;
    }
    saveNoteMutation.mutate({ title, content, category: categoryInput.trim() });
  };

  const isLoading = isProcessingAi || saveNoteMutation.isPending || isAppLoading || isCompressing;
  const uploadButtonText = imageFiles.length > 0 ? `Add More Images (${imageFiles.length}/${MAX_IMAGES_PER_UPLOAD})` : `Select Note Images (0/${MAX_IMAGES_PER_UPLOAD})`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Digitize Handwritten Notes</CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground">
            Upload images of your notes (up to {MAX_IMAGES_PER_UPLOAD} pages). AI will extract text and help create a digital note.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="note-image-upload-trigger" className="text-base font-medium block text-center sm:text-left">
              {uploadButtonText}
            </Label>
            {imagePreviews.length > 0 && (
              <ScrollArea className="w-full rounded-md border bg-muted/20 p-2 max-h-80">
                <div className="flex flex-wrap gap-3 p-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 border rounded-md overflow-hidden group">
                      <Image
                        src={preview}
                        alt={`Note preview ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          onClick={() => handleDeleteImage(index)}
                          disabled={isLoading}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                       <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[0.5rem] sm:text-[0.6rem] p-0.5 text-center truncate">
                        {imageFiles[index]?.name} ({(imageFiles[index]?.size / 1024 / 1024).toFixed(2)}MB)
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar />
              </ScrollArea>
            )}
             {imageFiles.length === 0 && (
                <div
                    id="note-image-upload-trigger"
                    className={cn(
                    "mt-1 flex flex-col justify-center items-center w-full h-32 sm:h-40 px-4 pt-4 pb-4 border-2 border-dashed rounded-md cursor-pointer hover:border-accent transition-colors",
                    (isLoading || imageFiles.length >= MAX_IMAGES_PER_UPLOAD) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !(isLoading || imageFiles.length >= MAX_IMAGES_PER_UPLOAD) && fileInputRef.current?.click()}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !(isLoading || imageFiles.length >= MAX_IMAGES_PER_UPLOAD)) fileInputRef.current?.click();}}
                    aria-label="Upload handwritten note images"
                >
                    <UploadCloud className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-center">
                    <span className="font-semibold text-accent">Click or tap to upload images</span>
                    </p>
                    <p className="text-[0.6rem] sm:text-xs text-muted-foreground text-center">
                    PNG, JPG up to {MAX_COMPRESSION_SIZE_MB}MB each. Max {MAX_IMAGES_PER_UPLOAD} total.
                    </p>
                </div>
             )}
            <Input
              id="note-image-upload-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isLoading || imageFiles.length >= MAX_IMAGES_PER_UPLOAD}
              multiple
            />
            {imageFiles.length > 0 && imageFiles.length < MAX_IMAGES_PER_UPLOAD && (
                <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || imageFiles.length >= MAX_IMAGES_PER_UPLOAD}
                    className="mt-2 w-full sm:w-auto"
                >
                    <PackageOpen className="mr-2 h-4 w-4"/> Add More Images
                </Button>
            )}
          </div>

          {isCompressing && (
            <div className="mt-2 flex items-center text-primary text-sm p-2 bg-primary/10 rounded-md">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Compressing selected images... please wait.</span>
            </div>
          )}

          <Button
            onClick={handleDigitize}
            disabled={imagePreviews.length === 0 || isLoading}
            className="w-full sm:w-auto"
            size="lg"
          >
            {(isProcessingAi || (isAppLoading && !saveNoteMutation.isPending && !isCompressing)) ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-5 w-5" />
            )}
            Digitize {imageFiles.length > 0 ? `${imageFiles.length} Image(s)` : 'Notes'} with AI
          </Button>
        </CardContent>
      </Card>

      {processingProgress && (
        <Card className="shadow-lg">
          <CardHeader className="text-center sm:text-left">
            <CardTitle className="text-lg sm:text-xl">Digitization In Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[150px] space-y-3">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm sm:text-base text-center">
              Processing image {processingProgress.current} of {processingProgress.total}...
            </p>
            <Progress value={(processingProgress.current / processingProgress.total) * 100} className="w-full max-w-md" />
          </CardContent>
        </Card>
      )}

      {digitizedResult && !processingProgress && (
        <Card className="shadow-lg">
          <CardHeader className="text-center sm:text-left">
            <CardTitle className="text-xl sm:text-2xl flex flex-col sm:flex-row items-center justify-center sm:justify-start">
              <CheckCircle className="mr-0 sm:mr-3 h-7 w-7 text-accent mb-2 sm:mb-0" /> Review & Save Digitized Note
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              AI has processed {imagePreviews.length} image(s). Review the suggested title and combined content, assign a category, then save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="note-title" className="text-lg font-medium">Note Title</Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter note title"
                className="mt-1 text-base"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="note-category" className="text-lg font-medium">Category / Folder (Optional)</Label>
              <Input
                id="note-category"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                placeholder="e.g., Biology Notes, History Midterm"
                className="mt-1 text-base"
                disabled={isLoading}
              />
               <p className="text-xs text-muted-foreground sm:text-sm mt-1">
                Assign this note to a category. If left blank, it will be 'Uncategorized'.
              </p>
            </div>

            <div>
              <Label htmlFor="note-content" className="text-lg font-medium">
                Digitized Content {imagePreviews.length > 1 && `(Combined from ${imagePreviews.length} images)`}
              </Label>
              <Textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="AI Processed Content"
                rows={10}
                className="mt-1 text-base min-h-[200px] sm:min-h-[300px] resize-y"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSaveNote}
              disabled={isLoading || !title.trim() || !content.trim()}
              className="w-full sm:w-auto"
              size="lg"
            >
              {saveNoteMutation.isPending || (isAppLoading && !isProcessingAi && !isCompressing) ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <FolderPlus className="mr-2 h-5 w-5" />
              )}
              Save Digitized Note
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    
