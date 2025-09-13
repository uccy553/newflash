
'use client';

import type { SuggestFlashcardTagsInput } from '@/ai/flows/suggest-flashcard-tags';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { handleSuggestTagsAction } from '@/app/actions/suggest-tags-action';

interface AiTagSuggesterProps {
  frontContent: string;
  backContent: string;
  exampleSentenceContent?: string;
  currentTags: string[];
  onTagsSuggested: (tags: string[]) => void;
}

export function AiTagSuggester({ frontContent, backContent, exampleSentenceContent, currentTags, onTagsSuggested }: AiTagSuggesterProps) {
  const [isPending, startTransition] = useTransition();
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSuggestTags = () => {
    if (!frontContent.trim() && !backContent.trim()) {
      toast({
        title: 'Cannot Suggest Tags',
        description: 'Please provide some content for the study card first.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const input: SuggestFlashcardTagsInput = { 
        frontContent, 
        backContent, 
        exampleSentence: exampleSentenceContent 
      };
      const result = await handleSuggestTagsAction(input);
      
      if (result.success && result.tags) {
        const newSuggestions = result.tags.filter(tag => !currentTags.includes(tag) && !suggestedTags.includes(tag));
        setSuggestedTags(prev => [...new Set([...prev, ...newSuggestions])]); // Use Set to ensure unique suggestions locally
        if (newSuggestions.length === 0 && result.tags.length > 0) {
           toast({ title: 'Tags Suggested', description: 'Some suggestions are already present or added.' });
        } else if (newSuggestions.length > 0) {
           toast({ title: 'Tags Suggested!', description: 'Click on tags to add them.' });
        } else {
           toast({ title: 'No New Tags Suggested', description: 'AI could not find new relevant tags. Try adding more content or an example to your study card.' });
        }
      } else {
        toast({
          title: 'Error Suggesting Tags',
          description: result.error || 'An unknown error occurred.',
          variant: 'destructive',
        });
      }
    });
  };

  const addSuggestedTag = (tag: string) => {
    onTagsSuggested([...currentTags, tag]);
    setSuggestedTags(prev => prev.filter(t => t !== tag));
  };

  return (
    <div className="space-y-3">
      <Button type="button" onClick={handleSuggestTags} disabled={isPending || (!frontContent.trim() && !backContent.trim())} variant="outline" size="sm">
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        Suggest Tags with AI
      </Button>
      {suggestedTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">AI Suggestions (click to add):</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                onClick={() => addSuggestedTag(tag)}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && addSuggestedTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

