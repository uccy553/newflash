
'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react'; // Or use a custom Chat icon

interface ChatbotFABProps {
  onClick: () => void;
}

export function ChatbotFAB({ onClick }: ChatbotFABProps) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 
                 text-primary border-2 border-primary/40 hover:bg-primary/10 hover:border-primary/60"
      aria-label="Open AI Tutor Chat"
      size="icon"
    >
      <MessageCircle className="h-7 w-7" />
    </Button>
  );
}

