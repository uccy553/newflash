
'use client';

import { useAuth } from '@/hooks/use-auth';
import { getFlashcards, deleteFlashcard } from '@/lib/firestore';
import type { Flashcard } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashcardItem } from './flashcard-item';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useLoading } from '@/contexts/loading-context';

const ITEMS_PER_PAGE = 6;

export function FlashcardList() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { startLoading, stopLoading, isLoading: isAppLoading } = useLoading();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: flashcards, isLoading: queryIsLoading, error } = useQuery<Flashcard[]>({
    queryKey: ['flashcards', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser?.uid) return [];
      startLoading(); 
      try {
        const cards = await getFlashcards(currentUser.uid);
        return cards;
      } finally {
        stopLoading(); 
      }
    },
    enabled: !!currentUser?.uid,
  });

  const deleteMutation = useMutation({
    mutationFn: (flashcardId: string) => {
      if (!currentUser?.uid) throw new Error("User not authenticated.");
      startLoading();
      return deleteFlashcard(currentUser.uid, flashcardId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentUser?.uid] });
      toast({ title: 'Success!', description: 'Flashcard deleted.', className: 'bg-accent text-accent-foreground' });
       // Reset to first page if current page becomes empty after deletion
      if (flashcards && (flashcards.length - 1) % ITEMS_PER_PAGE === 0 && currentPage > 1) {
        setCurrentPage(prev => Math.max(1, prev -1));
      } else if (flashcards && flashcards.length -1 === 0) {
        setCurrentPage(1);
      }
    },
    onError: (e) => {
      toast({ title: 'Error', description: `Failed to delete flashcard: ${(e as Error).message}`, variant: 'destructive' });
    },
    onSettled: () => {
      setCardToDelete(null);
      setShowDeleteConfirm(false);
      stopLoading();
    }
  });

  const handleEdit = (id: string) => {
    startLoading();
    router.push(`/flashcards/edit/${id}`);
  };

  const handleDeleteInitiate = (id: string) => {
    setCardToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (cardToDelete) {
      deleteMutation.mutate(cardToDelete);
    }
  };
  
  const isLoading = queryIsLoading || isAppLoading;

  if (isLoading && (!flashcards || flashcards.length === 0) ) { 
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
          <Card key={i} className="h-[300px] animate-pulse bg-muted/50"></Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive flex flex-col items-center justify-center rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h3 className="text-xl font-semibold">Error Loading Flashcards</h3>
        <p className="text-sm mt-2">Could not fetch your flashcards. Please try again later.</p>
      </div>
    );
  }

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center min-h-[400px] bg-card">
        <Inbox className="h-16 w-16 text-muted-foreground/70 mb-6" />
        <h3 className="text-2xl font-semibold text-foreground">No Flashcards Yet!</h3>
        <p className="mt-2 text-muted-foreground max-w-md">
          It looks like your collection is empty. Start by creating your first flashcard to begin your learning journey.
        </p>
        <Link href="/flashcards/new" passHref className="mt-8">
          <Button size="lg" className="shadow-md" onClick={startLoading}>Create Your First Flashcard</Button>
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(flashcards.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentFlashcards = flashcards.slice(startIndex, endIndex);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentFlashcards.map((flashcard) => (
          <FlashcardItem
            key={flashcard.id}
            flashcard={flashcard}
            onEdit={handleEdit}
            onDelete={handleDeleteInitiate}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || isLoading || deleteMutation.isPending}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || isLoading || deleteMutation.isPending}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this flashcard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCardToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || isAppLoading}
            >
              {(deleteMutation.isPending || isAppLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
