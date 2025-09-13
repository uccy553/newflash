'use client';

import { FlashcardForm } from '@/components/flashcards/flashcard-form';
import { useAuth } from '@/hooks/use-auth';
import { getFlashcard } from '@/lib/firestore';
import type { Flashcard as FlashcardType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditFlashcardPage() {
  const router = useRouter();
  const params = useParams();
  const flashcardId = params.id as string;
  const { currentUser } = useAuth();

  const { data: flashcard, isLoading, error } = useQuery<FlashcardType | null>({
    queryKey: ['flashcard', currentUser?.uid, flashcardId],
    queryFn: async () => {
      if (!currentUser?.uid || !flashcardId) return null;
      return getFlashcard(currentUser.uid, flashcardId);
    },
    enabled: !!currentUser?.uid && !!flashcardId,
  });

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
            <AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Flashcard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Could not load the flashcard details. Please try again later or check if the card exists.</p>
        </CardContent>
      </Card>
    );
  }

  if (!flashcard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Flashcard Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The requested flashcard could not be found. It might have been deleted or you may not have permission to view it.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <FlashcardForm flashcardId={flashcardId} initialData={flashcard} />
    </div>
  );
}
