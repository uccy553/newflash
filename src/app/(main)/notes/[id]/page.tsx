
'use client';

import { useAuth } from '@/hooks/use-auth';
import { getNote, deleteNote, createFlashcard } from '@/lib/firestore-client';
import type { Note as NoteType, Flashcard, SuggestedFlashcard } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, Edit, Trash2, ArrowLeft, FolderOpen, Sparkles, FileText, Check, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';


import { useState, useTransition } from 'react';
import { useLoading } from '@/contexts/loading-context';
import { Badge } from '@/components/ui/badge';
import { handleGenerateFlashcardsFromNoteAction } from '@/app/actions/generate-flashcards-from-note-action';
import { DEFAULT_EASE_FACTOR, DEFAULT_INTERVAL, DEFAULT_REPETITIONS } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';

interface SuggestedFlashcardWithSelection extends SuggestedFlashcard {
  id: string; // for temporary client-side keying
  isSelected: boolean;
  // For potential editing before creation
  editedFront: string;
  editedBack: string;
  editedExampleSentence: string;
  editedSuggestedTags: string[];
}


export default function ViewNotePage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { startLoading, stopLoading, isLoading: isAppLoading } = useLoading();

  const [isGeneratingFlashcards, startGeneratingFlashcardsTransition] = useTransition();
  const [suggestedFlashcards, setSuggestedFlashcards] = useState<SuggestedFlashcardWithSelection[]>([]);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [isCreatingFlashcards, setIsCreatingFlashcards] = useState(false);


  const { data: note, isLoading: queryIsLoading, error } = useQuery<NoteType | null>({
    queryKey: ['note', currentUser?.uid, noteId],
    queryFn: async () => {
      if (!currentUser?.uid || !noteId) return null;
      startLoading();
      try {
        return await getNote(currentUser.uid, noteId);
      } finally {
        stopLoading();
      }
    },
    enabled: !!currentUser?.uid && !!noteId,
  });
  
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!currentUser?.uid || !noteId) throw new Error("User or Note ID missing.");
      startLoading();
      return deleteNote(currentUser.uid, noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', currentUser?.uid] });
      toast({ title: 'Success!', description: 'Note deleted.', className: 'bg-accent text-accent-foreground' });
      router.push('/notes');
    },
    onError: (e) => {
      toast({ title: 'Error', description: `Failed to delete note: ${(e as Error).message}`, variant: 'destructive' });
    },
    onSettled: () => {
      setShowDeleteConfirm(false);
      stopLoading();
    }
  });

  const handleGenerateFlashcards = async () => {
    if (!note || !note.content) {
      toast({ title: "Cannot Generate", description: "Note content is empty.", variant: "destructive" });
      return;
    }
    if (note.content.length < 50) {
        toast({ title: "Content Too Short", description: "Note content should be at least 50 characters to generate meaningful flashcards.", variant: "destructive" });
        return;
    }
    startLoading();
    startGeneratingFlashcardsTransition(async () => {
      try {
        const result = await handleGenerateFlashcardsFromNoteAction({ 
          noteContent: note.content, 
          targetFlashcardCount: 10 // Requesting up to 10 flashcards
        });
        if (result.success && result.data?.suggestedFlashcards) {
          if (result.data.suggestedFlashcards.length === 0) {
            toast({ title: "No Flashcards Suggested", description: "AI couldn't identify distinct concepts to turn into flashcards from this note. Try a different note or ensure it has clear terms/definitions.", variant: "default", duration: 7000 });
          } else {
            setSuggestedFlashcards(
              result.data.suggestedFlashcards.map((sf, index) => ({
                ...sf,
                id: `suggested-${index}-${Date.now()}`,
                isSelected: true, // Select all by default
                editedFront: sf.front,
                editedBack: sf.back,
                editedExampleSentence: sf.exampleSentence || '',
                editedSuggestedTags: sf.suggestedTags || [],
              }))
            );
            setShowSuggestionsModal(true);
            toast({ title: "Flashcard Suggestions Ready!", description: `Review the ${result.data.suggestedFlashcards.length} suggestions and select which ones to create.`, className: "bg-accent text-accent-foreground" });
          }
        } else {
          toast({ title: "Generation Failed", description: result.error || "Could not generate flashcard suggestions.", variant: "destructive" });
        }
      } catch (e) {
        toast({ title: "Error Generating Flashcards", description: (e as Error).message, variant: "destructive" });
      } finally {
        stopLoading();
      }
    });
  };

  const handleToggleFlashcardSelection = (id: string) => {
    setSuggestedFlashcards(prev =>
      prev.map(sf => (sf.id === id ? { ...sf, isSelected: !sf.isSelected } : sf))
    );
  };

  const handleSuggestedFlashcardChange = (id: string, field: keyof SuggestedFlashcardWithSelection, value: string | string[]) => {
    setSuggestedFlashcards(prev =>
      prev.map(sf => (sf.id === id ? { ...sf, [field]: value } : sf))
    );
  };


  const handleCreateSelectedFlashcards = async () => {
    if (!currentUser?.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const selectedToCreate = suggestedFlashcards.filter(sf => sf.isSelected);
    if (selectedToCreate.length === 0) {
      toast({ title: "No Flashcards Selected", description: "Please select at least one suggested flashcard to create.", variant: "default" });
      return;
    }

    setIsCreatingFlashcards(true);
    startLoading();
    let successCount = 0;
    let errorCount = 0;

    for (const sf of selectedToCreate) {
      const flashcardData: Omit<Flashcard, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        front: sf.editedFront,
        back: sf.editedBack,
        exampleSentence: sf.editedExampleSentence || '',
        phoneticTranscriptionIPA: '', // Not generated by this flow currently
        tags: sf.editedSuggestedTags || [],
        nextReview: Timestamp.now(),
        interval: DEFAULT_INTERVAL,
        easeFactor: DEFAULT_EASE_FACTOR,
        repetitions: DEFAULT_REPETITIONS,
      };
      try {
        await createFlashcard(currentUser.uid, flashcardData);
        successCount++;
      } catch (e) {
        console.error("Failed to create flashcard:", sf.front, e);
        errorCount++;
      }
    }
    setIsCreatingFlashcards(false);
    stopLoading();
    setShowSuggestionsModal(false);
    setSuggestedFlashcards([]);

    if (successCount > 0) {
      toast({ title: "Flashcards Created!", description: `${successCount} flashcard(s) created successfully.`, className: "bg-accent text-accent-foreground" });
      queryClient.invalidateQueries({ queryKey: ['flashcards', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentUser?.uid] });
    }
    if (errorCount > 0) {
      toast({ title: "Some Flashcards Failed", description: `${errorCount} flashcard(s) could not be created. Check console for details.`, variant: "destructive" });
    }
    if (successCount === 0 && errorCount === 0) { // Should not happen if selectedToCreate > 0
       toast({ title: "No Action Taken", description: "No flashcards were processed.", variant: "default" });
    }
  };


  const isLoading = queryIsLoading || isAppLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
       <Card className="border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Note
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Could not load the note details. Please try again later.</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!note) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Note Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The requested note could not be found or you don't have permission to view it.</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => { startLoading(); router.push('/notes'); }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Notes
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGenerateFlashcards} 
            disabled={isGeneratingFlashcards || isCreatingFlashcards || isLoading}
          >
            {(isGeneratingFlashcards || (isAppLoading && !deleteMutation.isPending)) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Flashcards from Note
          </Button>
          <Link href={`/notes/edit/${note.id}`} passHref>
            <Button variant="default" size="sm" onClick={startLoading}  disabled={isGeneratingFlashcards || isCreatingFlashcards || isLoading}>
              <Edit className="mr-2 h-4 w-4" /> Edit Note
            </Button>
          </Link>
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"  disabled={isGeneratingFlashcards || isCreatingFlashcards || isLoading}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Note
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this study note.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteMutation.mutate()} 
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  disabled={deleteMutation.isPending || isAppLoading}
                >
                  {(deleteMutation.isPending || isAppLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold break-words">{note.title}</CardTitle>
          <div className="text-sm text-muted-foreground space-y-1 mt-1">
            <p>Created: {note.createdAt ? format(note.createdAt.toDate(), 'PPP p') : 'N/A'}</p>
            <p>Last Updated: {note.updatedAt ? format(note.updatedAt.toDate(), 'PPP p') : 'N/A'}</p>
            {note.category && (
              <div className="flex items-center">
                <FolderOpen className="mr-2 h-4 w-4 text-primary" />
                Category: <Badge variant="secondary" className="ml-2">{note.category}</Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-base leading-relaxed">
            {note.content}
          </div>
        </CardContent>
      </Card>

      {/* Modal for Suggested Flashcards */}
      <Dialog open={showSuggestionsModal} onOpenChange={setShowSuggestionsModal}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center">
              <FileText className="mr-2 h-6 w-6 text-primary" />
              AI Suggested Flashcards
            </DialogTitle>
            <DialogDescription>
              Review these flashcards generated from your note. Select the ones you want to create. You can also edit them here before creating.
            </DialogDescription>
          </DialogHeader>
          
          {suggestedFlashcards.length > 0 ? (
            <ScrollArea className="max-h-[60vh] p-1 pr-3">
              <div className="space-y-4">
                {suggestedFlashcards.map((sf) => (
                  <Card key={sf.id} className="bg-card/50 p-4">
                    <div className="flex items-start space-x-3 mb-3">
                      <Checkbox
                        id={`select-${sf.id}`}
                        checked={sf.isSelected}
                        onCheckedChange={() => handleToggleFlashcardSelection(sf.id)}
                        className="mt-1"
                        aria-label={`Select flashcard with front: ${sf.editedFront}`}
                      />
                      <div className="grid gap-1.5 leading-none flex-1">
                        <Label htmlFor={`select-${sf.id}`} className="text-sm font-medium">
                          Select this flashcard
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor={`front-${sf.id}`} className="text-xs font-semibold">Front (Term/Question)</Label>
                        <Textarea id={`front-${sf.id}`} value={sf.editedFront} onChange={(e) => handleSuggestedFlashcardChange(sf.id, 'editedFront', e.target.value)} className="text-sm" rows={2}/>
                      </div>
                      <div>
                        <Label htmlFor={`back-${sf.id}`} className="text-xs font-semibold">Back (Answer/Definition)</Label>
                        <Textarea id={`back-${sf.id}`} value={sf.editedBack} onChange={(e) => handleSuggestedFlashcardChange(sf.id, 'editedBack', e.target.value)} className="text-sm" rows={3}/>
                      </div>
                      <div>
                        <Label htmlFor={`example-${sf.id}`} className="text-xs font-semibold">Example Sentence (Optional)</Label>
                        <Input id={`example-${sf.id}`} value={sf.editedExampleSentence} onChange={(e) => handleSuggestedFlashcardChange(sf.id, 'editedExampleSentence', e.target.value)} className="text-sm h-8"/>
                      </div>
                       <div>
                        <Label htmlFor={`tags-${sf.id}`} className="text-xs font-semibold">Tags (Optional, comma-separated)</Label>
                        <Input 
                          id={`tags-${sf.id}`} 
                          value={sf.editedSuggestedTags.join(', ')} 
                          onChange={(e) => handleSuggestedFlashcardChange(sf.id, 'editedSuggestedTags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} 
                          placeholder="e.g. vocabulary, chapter 5"
                          className="text-sm h-8"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
             <div className="py-8 text-center text-muted-foreground">
                <Info className="mx-auto h-8 w-8 mb-2" />
                No flashcard suggestions available.
             </div>
          )}
          <DialogFooter className="sm:justify-between mt-4 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleCreateSelectedFlashcards} 
              disabled={isCreatingFlashcards || suggestedFlashcards.filter(sf => sf.isSelected).length === 0}
            >
              {isCreatingFlashcards ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
              Create Selected ({suggestedFlashcards.filter(sf => sf.isSelected).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

