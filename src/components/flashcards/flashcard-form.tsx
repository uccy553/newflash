
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFlashcard, updateFlashcard } from '@/lib/firestore-client';
import type { Flashcard } from '@/types';
import { DEFAULT_EASE_FACTOR, DEFAULT_INTERVAL, DEFAULT_REPETITIONS } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AiTagSuggester } from './ai-tag-suggester';
import { Badge } from '@/components/ui/badge';
import { XIcon, Loader2, SparklesIcon, InfoIcon } from 'lucide-react';
import { useState, useEffect, useTransition } from 'react';
import { handleGenerateFlashcardContentAction } from '@/app/actions/generate-flashcard-content-action';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TextToSpeechButton } from '@/components/common/text-to-speech-button';
import { useLoading } from '@/contexts/loading-context';


const flashcardFormSchema = z.object({
  front: z.string().min(1, 'Term/Question is required.'),
  back: z.string().min(1, 'Answer/Definition is required.'),
  exampleSentence: z.string().optional(),
  phoneticTranscriptionIPA: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type FlashcardFormValues = z.infer<typeof flashcardFormSchema>;

interface FlashcardFormProps {
  flashcardId?: string;
  initialData?: Flashcard;
}

export function FlashcardForm({ flashcardId, initialData: propInitialData }: FlashcardFormProps) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { startLoading, stopLoading, isLoading: isAppLoading } = useLoading();
  const [currentTags, setCurrentTags] = useState<string[]>(propInitialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isGeneratingContent, startGenerateContentTransition] = useTransition();

  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: {
      front: propInitialData?.front || '',
      back: propInitialData?.back || '',
      exampleSentence: propInitialData?.exampleSentence || '',
      phoneticTranscriptionIPA: propInitialData?.phoneticTranscriptionIPA || '',
      tags: propInitialData?.tags || [],
    },
  });
  
  useEffect(() => {
    if (propInitialData) {
      form.reset({
        front: propInitialData.front,
        back: propInitialData.back,
        exampleSentence: propInitialData.exampleSentence || '',
        phoneticTranscriptionIPA: propInitialData.phoneticTranscriptionIPA || '',
        tags: propInitialData.tags || [],
      });
      setCurrentTags(propInitialData.tags || []);
    } else {
      form.reset({
        front: '',
        back: '',
        exampleSentence: '',
        phoneticTranscriptionIPA: '',
        tags: [],
      });
      setCurrentTags([]);
    }
  }, [propInitialData, form]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentUser?.uid] });
      if (flashcardId) {
        queryClient.invalidateQueries({ queryKey: ['flashcard', currentUser?.uid, flashcardId] });
        toast({ title: 'Success!', description: 'Study card updated successfully.', className: 'bg-accent text-accent-foreground' });
      } else {
        toast({ title: 'Success!', description: 'New study card created successfully.', className: 'bg-accent text-accent-foreground' });
      }
      router.push('/flashcards');
    },
    onError: (error: Error) => {
      toast({ 
        title: flashcardId ? 'Error Updating Card' : 'Error Creating Card', 
        description: `Failed: ${error.message}`, 
        variant: 'destructive' 
      });
    },
    onSettled: () => {
      stopLoading();
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: FlashcardFormValues) => {
      if (!currentUser) throw new Error('User not authenticated.');
      const flashcardData: Omit<Flashcard, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        front: data.front,
        back: data.back,
        exampleSentence: data.exampleSentence || '',
        phoneticTranscriptionIPA: data.phoneticTranscriptionIPA || '',
        tags: currentTags,
        nextReview: Timestamp.now(),
        interval: DEFAULT_INTERVAL,
        easeFactor: DEFAULT_EASE_FACTOR,
        repetitions: DEFAULT_REPETITIONS,
      };
      return createFlashcard(currentUser.uid, flashcardData);
    },
    ...mutationOptions,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FlashcardFormValues) => {
      if (!currentUser || !flashcardId) throw new Error('User or Card ID missing.');
      const flashcardData: Partial<Omit<Flashcard, 'id' | 'userId' | 'createdAt'>> = {
        front: data.front,
        back: data.back,
        exampleSentence: data.exampleSentence || '',
        phoneticTranscriptionIPA: data.phoneticTranscriptionIPA || '',
        tags: currentTags,
      };
      return updateFlashcard(currentUser.uid, flashcardId, flashcardData);
    },
    ...mutationOptions,
  });

  async function onSubmit(data: FlashcardFormValues) {
    startLoading();
    if (!currentUser) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save a card.', variant: 'destructive' });
      stopLoading();
      return;
    }
    
    const isValid = await form.trigger();
    if (!isValid) { 
      toast({ title: 'Validation Error', description: 'Please correct the errors in the form.', variant: 'destructive' });
      stopLoading();
      return;
    }
    
    const dataToSubmit = { ...data, tags: currentTags };

    if (flashcardId) {
      updateMutation.mutate(dataToSubmit);
    } else {
      createMutation.mutate(dataToSubmit);
    }
  }

  const handleTagsUpdate = (newTags: string[]) => {
    const uniqueTags = [...new Set(newTags.map(tag => tag.toLowerCase().trim()).filter(tag => tag))];
    setCurrentTags(uniqueTags);
    form.setValue('tags', uniqueTags, { shouldValidate: true });
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !currentTags.includes(trimmedTag)) {
      const newTags = [...currentTags, trimmedTag];
      handleTagsUpdate(newTags);
      setTagInput('');
    } else if (currentTags.includes(trimmedTag)) {
      toast({ description: "Tag already added.", variant: "default" });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    handleTagsUpdate(newTags);
  };
  
  const watchedFront = form.watch('front');
  const watchedBack = form.watch('back');
  const watchedExampleSentence = form.watch('exampleSentence');

  const isProcessing = createMutation.isPending || updateMutation.isPending || isGeneratingContent || isAppLoading;

  const handleAutoGenerateContent = () => {
    const wordOrPhrase = form.getValues('front');
    if (!wordOrPhrase.trim()) {
      toast({
        title: 'Missing Term/Question',
        description: 'Please enter a term or question to generate content.',
        variant: 'destructive',
      });
      return;
    }

    startLoading();
    startGenerateContentTransition(async () => {
      try {
        const result = await handleGenerateFlashcardContentAction({ wordOrPhrase });
        if (result.success && result.data) {
          const { correctedWordOrPhrase, wasCorrected, definition, exampleSentence, partOfSpeech, phoneticTranscriptionIPA, additionalInfo } = result.data;
          
          if (wasCorrected) {
            form.setValue('front', correctedWordOrPhrase, { shouldValidate: true });
            toast({ 
              title: 'Term/Question Auto-corrected', 
              description: `"${wordOrPhrase}" was corrected to "${correctedWordOrPhrase}".`,
              className: 'bg-primary text-primary-foreground'
            });
          }
          
          let fullBackContent = definition;
          if (additionalInfo) {
            fullBackContent += `\n\n--- Additional Info ---\n${additionalInfo}`;
          }
          form.setValue('back', fullBackContent, { shouldValidate: true });
          form.setValue('exampleSentence', exampleSentence, { shouldValidate: true });
          form.setValue('phoneticTranscriptionIPA', phoneticTranscriptionIPA || '', { shouldValidate: true });

          const newTagsFromAI: string[] = [];
          if (partOfSpeech) newTagsFromAI.push(partOfSpeech.toLowerCase());
          
          if (newTagsFromAI.length > 0) {
             handleTagsUpdate([...currentTags, ...newTagsFromAI]);
          }
          toast({ title: 'Content Generated!', description: 'Fields populated with AI-generated content.', className: 'bg-accent text-accent-foreground' });
        } else {
          toast({
            title: 'Error Generating Content',
            description: result.error || 'An unknown error occurred.',
            variant: 'destructive',
          });
        }
      } catch (error) {
         toast({
            title: 'Error Generating Content',
            description: (error as Error).message || 'An unexpected error occurred.',
            variant: 'destructive',
          });
      } finally {
        stopLoading();
      }
    });
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">{flashcardId ? 'Edit Study Card' : 'Create New Study Card'}</CardTitle>
        <CardDescription>
          Enter the term or question for your study card. Use the ✨ icon to auto-generate definitions, examples, and more. Click the 🔊 icon to hear it pronounced (if applicable).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="front"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Term / Question</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl className="flex-grow">
                      <Textarea placeholder="e.g., Photosynthesis, What is the capital of France?, " {...field} rows={2} className="resize-none"/>
                    </FormControl>
                    <TextToSpeechButton
                        textToSpeak={field.value}
                        disabled={!field.value?.trim() || isProcessing}
                        variant="outline"
                        size="icon"
                        title="Pronounce term (uses English TTS by default)"
                        className="shrink-0"
                      />
                     <Button 
                        type="button" 
                        onClick={handleAutoGenerateContent} 
                        variant="outline" 
                        size="icon" 
                        disabled={isProcessing || !field.value?.trim()}
                        title="Auto-generate content & correct with AI"
                        className="shrink-0"
                      >
                        {isGeneratingContent || (isAppLoading && !createMutation.isPending && !updateMutation.isPending) ? <Loader2 className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                      </Button>
                  </div>
                  <FormDescription>The term, concept, or question you want to learn. AI can help generate details.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneticTranscriptionIPA"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg flex items-center">
                    Phonetic Transcription (IPA) (Optional)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>International Phonetic Alphabet. Helps with pronunciation of specific terms. <br/>AI can generate this if it's a known word/phrase.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., /fəʊtəʊˈsɪnθəsɪs/" {...field} />
                  </FormControl>
                  <FormDescription>Pronunciation guide using IPA. Can be auto-generated for known terms.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="back"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Answer / Definition / Details</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., The process by which green plants use sunlight, water, and carbon dioxide to create their own food..." {...field} rows={5} className="resize-none"/>
                  </FormControl>
                  <FormDescription>The answer, definition, explanation, or any relevant details. Can be auto-generated.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exampleSentence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Example / Context (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Plants perform photosynthesis to survive." {...field} rows={2} className="resize-none" />
                  </FormControl>
                  <FormDescription>Helps understand the term/concept in context. Can be auto-generated.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel className="text-lg">Tags (Optional)</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {currentTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-sm py-1 px-2">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5" disabled={isProcessing} aria-label={`Remove tag ${tag}`}>
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  type="text"
                  placeholder="Add a tag (e.g., biology, history, chapter 1)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); }}}
                  disabled={isProcessing}
                />
                <Button type="button" onClick={addTag} variant="outline" disabled={isProcessing || !tagInput.trim()}>Add Tag</Button>
              </div>
              <FormDescription>Categorize your study card (e.g., science, important formula, key date). AI can suggest tags based on content.</FormDescription>
              <FormField name="tags" control={form.control} render={() => <FormMessage />} /> {/* For displaying general tags error if any */}
            </FormItem>

            <AiTagSuggester 
              frontContent={watchedFront}
              backContent={watchedBack} 
              exampleSentenceContent={watchedExampleSentence}
              currentTags={currentTags}
              onTagsSuggested={handleTagsUpdate}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isProcessing}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing} className="min-w-[120px]">
                {(createMutation.isPending || updateMutation.isPending || (isAppLoading && !isGeneratingContent)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {createMutation.isPending ? 'Creating...' : 
                 updateMutation.isPending ? 'Saving...' :
                 isAppLoading && !isGeneratingContent ? 'Processing...' :
                 (flashcardId ? 'Save Changes' : 'Create Card')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

