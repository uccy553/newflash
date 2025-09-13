
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getDueFlashcards, updateFlashcardsBatch, recordQuizSession, logStudyActivity } from '@/lib/firestore-client';
import type { Flashcard, PerformanceRating } from '@/types';
import { calculateSpacedRepetition, getNextReviewDate } from '@/lib/spacedRepetition';
import { FlashcardItem } from '@/components/flashcards/flashcard-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle, XCircle, ThumbsUp, ThumbsDown, CornerDownLeft, HelpCircle, ListChecks } from 'lucide-react'; // Added ListChecks
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useLoading } from '@/contexts/loading-context';

const MAX_QUIZ_CARDS = 10; // Max cards per session

const performanceRatings: { 
  label: string; 
  value: PerformanceRating; 
  icon?: React.ElementType;
  buttonVariant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  buttonClassName?: string;
  description?: string;
}[] = [
  { label: 'Blackout', value: 0, icon: XCircle, buttonVariant: 'destructive', description: "Couldn't recall at all." },
  { label: 'Incorrect', value: 1, icon: ThumbsDown, buttonVariant: 'destructive', description: "Guessed wrong." },
  { label: 'Recalled with Difficulty', value: 2, icon: CornerDownLeft, buttonVariant: 'outline', buttonClassName: 'border-destructive text-destructive hover:bg-destructive/10 focus:bg-destructive/10', description: "Correct, but it was hard." },
  { label: 'Correct (Hesitated)', value: 3, icon: ThumbsUp, buttonVariant: 'outline', buttonClassName: 'border-primary text-primary hover:bg-primary/10 focus:bg-primary/10', description: "Correct, but hesitated." },
  { label: 'Correct (Easy)', value: 4, icon: CheckCircle, buttonVariant: 'default', description: "Recalled it easily." },
  { label: 'Perfect Recall', value: 5, icon: CheckCircle, buttonVariant: 'default', buttonClassName: 'bg-accent text-accent-foreground hover:bg-accent/90', description: "Knew it instantly, perfectly!" },
];

export function QuizMode() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { startLoading, stopLoading, isLoading: isAppLoading } = useLoading();

  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, cardsReviewed: 0 });
  const [updatedCardsBuffer, setUpdatedCardsBuffer] = useState<Pick<Flashcard, 'id' | 'nextReview' | 'interval' | 'easeFactor' | 'repetitions'>[]>([]);

  const fetchDeck = useCallback(async () => {
    if (!currentUser?.uid) return;
    setIsLoadingInitial(true);
    startLoading();
    setError(null);
    setQuizFinished(false);
    setCurrentCardIndex(0);
    setRevealed(false);
    setSessionStats({ correct: 0, incorrect: 0, cardsReviewed: 0 });
    setUpdatedCardsBuffer([]);
    try {
      const dueCards = await getDueFlashcards(currentUser.uid, MAX_QUIZ_CARDS);
      setDeck(dueCards);
      if (dueCards.length === 0) {
        setQuizFinished(true); 
      }
    } catch (e) {
      setError('Failed to load study cards for review.');
      console.error(e);
    } finally {
      setIsLoadingInitial(false);
      stopLoading();
    }
  }, [currentUser?.uid, startLoading, stopLoading]);

  useEffect(() => {
    fetchDeck();
  }, [fetchDeck]);
  
  const saveUpdatedCardsMutation = useMutation({
    mutationFn: async (cardsToUpdate: typeof updatedCardsBuffer) => {
       if (!currentUser?.uid || cardsToUpdate.length === 0) return;
       startLoading();
       await updateFlashcardsBatch(currentUser.uid, cardsToUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['languageInsights', currentUser?.uid] }); // For streak
      toast({ title: 'Progress Saved', description: 'Your review progress has been synced.', className: 'bg-accent text-accent-foreground' });
    },
    onError: (e) => {
      toast({ title: 'Sync Error', description: `Failed to save review progress: ${(e as Error).message}`, variant: 'destructive' });
    },
    onSettled: () => {
        stopLoading();
    }
  });

  const recordSessionMutation = useMutation({
    mutationFn: async (stats: typeof sessionStats) => {
      if (!currentUser?.uid) return;
      startLoading();
      const score = stats.cardsReviewed > 0 ? Math.round((stats.correct / stats.cardsReviewed) * 100) : 0;
      await recordQuizSession(currentUser.uid, {
        date: Timestamp.now(),
        score,
        cardsReviewed: stats.cardsReviewed,
        correctAnswers: stats.correct,
        incorrectAnswers: stats.incorrect,
      });
      // Also log general study activity for streak
      await logStudyActivity(currentUser.uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizHistory', currentUser?.uid]});
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['languageInsights', currentUser?.uid] }); // For streak
      queryClient.invalidateQueries({ queryKey: ['activityLog', currentUser?.uid] });
    },
    onError: (e) => {
      toast({ title: 'Error Saving Session', description: `Failed to record review session: ${(e as Error).message}`, variant: 'destructive' });
    },
    onSettled: () => {
        stopLoading();
    }
  });

  const handlePerformanceRating = (quality: PerformanceRating) => {
    if (!currentUser || currentCardIndex >= deck.length) return;
    startLoading(); 

    const card = deck[currentCardIndex];
    const { interval, repetitions, easeFactor } = calculateSpacedRepetition(
      { interval: card.interval, repetitions: card.repetitions, easeFactor: card.easeFactor },
      quality
    );
    const nextReviewDate = getNextReviewDate(interval);

    const updatedCardData = {
      id: card.id!,
      nextReview: Timestamp.fromDate(nextReviewDate),
      interval,
      repetitions,
      easeFactor,
    };
    
    const newBuffer = [...updatedCardsBuffer, updatedCardData];
    setUpdatedCardsBuffer(newBuffer);

    const newStats = {
      ...sessionStats,
      correct: quality >= 3 ? sessionStats.correct + 1 : sessionStats.correct,
      incorrect: quality < 3 ? sessionStats.incorrect + 1 : sessionStats.incorrect,
      cardsReviewed: sessionStats.cardsReviewed + 1,
    };
    setSessionStats(newStats);

    if (currentCardIndex < deck.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setRevealed(false);
      stopLoading(); 
    } else {
      saveUpdatedCardsMutation.mutate(newBuffer); 
      recordSessionMutation.mutate(newStats);  
      setUpdatedCardsBuffer([]); 
      setQuizFinished(true);
      // stopLoading() is handled by the mutations' onSettled
    }
  };
  
  const currentCard = deck[currentCardIndex];
  const progress = deck.length > 0 ? ((sessionStats.cardsReviewed ) / deck.length) * 100 : 0;

  if (isLoadingInitial || (isAppLoading && !currentCard && !quizFinished)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10 text-center p-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <CardTitle className="text-destructive">Error</CardTitle>
        <CardDescription className="text-destructive/80">{error}</CardDescription>
        <Button onClick={fetchDeck} className="mt-6">Try Again</Button>
      </Card>
    );
  }
  
  if (quizFinished && deck.length === 0 && !error) {
     return (
      <Card className="text-center p-8 shadow-lg">
        <CardHeader>
          <ListChecks className="h-16 w-16 text-accent mx-auto mb-4" />
          <CardTitle className="text-2xl">All Due Cards Reviewed!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">You have no study cards due for review right now. Great job!</CardDescription>
        </CardHeader>
        <CardContent className="mt-6">
          <Link href="/dashboard" passHref>
            <Button size="lg" onClick={startLoading}>Back to Dashboard</Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-8">Want to add more study material or review your collection?</p>
           <div className="flex justify-center gap-4 mt-2">
            <Link href="/flashcards/new" passHref><Button variant="outline" onClick={startLoading}>Add New Card</Button></Link>
            <Link href="/flashcards" passHref><Button variant="outline" onClick={startLoading}>View All Cards</Button></Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (quizFinished && deck.length > 0) { 
    return (
      <Card className="text-center p-8 shadow-lg">
        <CardHeader>
          <CheckCircle className="h-16 w-16 text-accent mx-auto mb-4" />
          <CardTitle className="text-2xl">Review Session Complete!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl text-muted-foreground mb-2">You reviewed {sessionStats.cardsReviewed} study card(s).</p>
          <p className="text-2xl font-semibold">
            Score: <span className="text-primary">{sessionStats.cardsReviewed > 0 ? Math.round((sessionStats.correct / sessionStats.cardsReviewed) * 100) : 0}%</span>
          </p>
          <p className="text-lg">
            Correct: <span className="text-accent">{sessionStats.correct}</span> | Incorrect: <span className="text-destructive">{sessionStats.incorrect}</span>
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={fetchDeck} size="lg" disabled={isAppLoading}>
              {isAppLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Review More Due Cards
            </Button>
            <Link href="/dashboard" passHref>
              <Button variant="outline" size="lg" onClick={startLoading} disabled={isAppLoading}>
                 {isAppLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentCard) {
    return (
      <Card className="text-center p-8">
        <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4"/>
        <CardTitle>Loading Review Session...</CardTitle>
        <CardDescription>Preparing your learning session. If this persists, try refreshing.</CardDescription>
      </Card>
    );
  }
  
  const isActionLoading = saveUpdatedCardsMutation.isPending || recordSessionMutation.isPending || isAppLoading;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Due Cards Review</CardTitle>
          <CardDescription>Card {sessionStats.cardsReviewed + 1} of {deck.length}. Based on your Spaced Repetition schedule.</CardDescription>
          <Progress value={progress} className="w-full mt-2 h-3" />
        </CardHeader>
        <CardContent>
          <FlashcardItem 
            flashcard={currentCard} 
            isQuizMode={true} 
            revealed={revealed} 
            onReveal={() => { startLoading(); setRevealed(true); stopLoading();}}
            showActions={false}
            onEdit={()=>{}} onDelete={()=>{}} 
          />
        </CardContent>
      </Card>

      {revealed && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">How well did you recall the term/question?</CardTitle>
            <CardDescription>Your honest rating helps optimize future reviews.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {performanceRatings.map(rating => (
              <Button 
                key={rating.value} 
                variant={rating.buttonVariant}
                className={cn(
                  `w-full h-auto py-3 text-left justify-start items-start flex-col sm:flex-row sm:items-center`,
                  rating.buttonClassName
                )}
                onClick={() => handlePerformanceRating(rating.value)}
                disabled={isActionLoading}
              >
                {isActionLoading && currentCardIndex === deck.length -1 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <div className="flex items-center mb-1 sm:mb-0">
                  {rating.icon && <rating.icon className="mr-2 h-5 w-5 shrink-0" />}
                  <span className="font-semibold">{rating.label}</span>
                </div>
                {rating.description && <span className="text-xs opacity-80 ml-0 sm:ml-7">{rating.description}</span>}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
