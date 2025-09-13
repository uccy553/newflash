
'use client';

import type { Flashcard } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';
import { Edit, Trash2, Tags, CalendarDays, ChevronsRightLeft, MessageSquareQuote, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { TextToSpeechButton } from '@/components/common/text-to-speech-button';

interface FlashcardItemProps {
  flashcard: Flashcard;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  showActions?: boolean;
  isQuizMode?: boolean;
  onReveal?: () => void;
  revealed?: boolean;
}

export function FlashcardItem({ 
  flashcard, 
  onEdit, 
  onDelete, 
  showActions = true,
  isQuizMode = false,
  onReveal,
  revealed = false // In quiz mode, this means the answer side is shown
}: FlashcardItemProps) {
  const [isFrontNonQuiz, setIsFrontNonQuiz] = useState(true); // Only for non-quiz mode

  const flipCardNonQuiz = () => {
    if (!isQuizMode) {
      setIsFrontNonQuiz(!isFrontNonQuiz);
    }
  };

  // Determine title based on mode and state
  const displayTitleText = isQuizMode 
    ? (revealed ? "Answer & Details" : "Term / Question") 
    : (isFrontNonQuiz ? "Term / Question" : "Answer / Definition / Details");

  const MainContent = () => {
    if (isQuizMode) {
      if (!revealed) { // Quiz mode, front of card
        return (
          <>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-lg font-medium flex-grow">{flashcard.front}</p>
              <TextToSpeechButton textToSpeak={flashcard.front} size="sm" variant="ghost" title="Pronounce term (uses English TTS)"/>
            </div>
            {flashcard.phoneticTranscriptionIPA && (
              <div className="mt-1 flex items-center text-sm text-muted-foreground">
                <Volume2 className="h-4 w-4 mr-1.5" />
                <span>{flashcard.phoneticTranscriptionIPA}</span>
              </div>
            )}
          </>
        );
      } else { // Quiz mode, back of card (revealed)
        return (
          <>
            {/* Show front again for reference */}
            <div className="mb-3 pb-3 border-b border-dashed">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-base font-medium text-muted-foreground flex-grow">{flashcard.front}</p>
                <TextToSpeechButton textToSpeak={flashcard.front} size="sm" variant="ghost" title="Pronounce term (uses English TTS)"/>
              </div>
              {flashcard.phoneticTranscriptionIPA && (
                <div className="mt-1 flex items-center text-xs text-muted-foreground/80">
                   <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                  <span>{flashcard.phoneticTranscriptionIPA}</span>
                </div>
              )}
            </div>
            {/* Now the back content */}
            <p className="whitespace-pre-wrap">{flashcard.back}</p>
            {flashcard.exampleSentence && (
              <div className="mt-4 pt-3 border-t border-dashed">
                <h4 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center">
                  <MessageSquareQuote className="h-4 w-4 mr-2"/> Example / Context:
                </h4>
                <p className="text-sm italic text-foreground/90 whitespace-pre-wrap">{flashcard.exampleSentence}</p>
              </div>
            )}
          </>
        );
      }
    } else { // Not quiz mode (normal view)
      if (isFrontNonQuiz) {
        return (
          <>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-lg font-medium flex-grow">{flashcard.front}</p>
              <TextToSpeechButton textToSpeak={flashcard.front} size="sm" variant="ghost" title="Pronounce term (uses English TTS)"/>
            </div>
            {flashcard.phoneticTranscriptionIPA && (
              <div className="mt-1 flex items-center text-sm text-muted-foreground">
                 <Volume2 className="h-4 w-4 mr-1.5" />
                <span>{flashcard.phoneticTranscriptionIPA}</span>
              </div>
            )}
          </>
        );
      } else { // Not quiz mode, back of card
        return (
          <>
            <p className="whitespace-pre-wrap">{flashcard.back}</p>
            {flashcard.exampleSentence && (
              <div className="mt-4 pt-3 border-t border-dashed">
                <h4 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center">
                  <MessageSquareQuote className="h-4 w-4 mr-2"/> Example / Context:
                </h4>
                <p className="text-sm italic text-foreground/90 whitespace-pre-wrap">{flashcard.exampleSentence}</p>
              </div>
            )}
          </>
        );
      }
    }
  };

  return (
    <Card className="w-full shadow-lg flex flex-col h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold">{displayTitleText}</CardTitle>
          {!isQuizMode && (
             <Button variant="ghost" size="icon" onClick={flipCardNonQuiz} aria-label="Flip card">
              <ChevronsRightLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto text-foreground text-base leading-relaxed py-2 min-h-[150px]">
        <MainContent />
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3 pt-4 border-t">
        {isQuizMode && !revealed && onReveal && (
          <Button onClick={onReveal} className="w-full" size="lg">Reveal Answer</Button>
        )}
        {(showActions && !isQuizMode) && (
          <div className="flex justify-end w-full space-x-2">
            <Button variant="outline" size="sm" onClick={() => flashcard.id && onEdit(flashcard.id)}>
              <Edit className="mr-1.5 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => flashcard.id && onDelete(flashcard.id)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </div>
        )}
        <div className="text-xs text-muted-foreground w-full">
          {flashcard.tags && flashcard.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1 items-center">
              <Tags className="h-3.5 w-3.5 mr-1" />
              {flashcard.tags.map(tag => <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>)}
            </div>
          )}
          <div className="flex items-center">
             <CalendarDays className="h-3.5 w-3.5 mr-1" />
            Next review: {flashcard.nextReview instanceof Timestamp ? format(flashcard.nextReview.toDate(), 'MMM d, yyyy') : 'N/A'}
             <span className="mx-1">·</span>
             Updated: {flashcard.updatedAt instanceof Timestamp ? formatDistanceToNow(flashcard.updatedAt.toDate(), { addSuffix: true }) : 'N/A'}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

