
'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TextToSpeechButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  textToSpeak: string;
  lang?: string;
  children?: ReactNode;
}

export function TextToSpeechButton({ 
  textToSpeak, 
  lang = 'en-US', 
  className, 
  variant = 'ghost', 
  size = 'icon', 
  disabled, 
  children,
  ...props 
}: TextToSpeechButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({
        title: 'Pronunciation Error',
        description: 'Speech synthesis is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }

    if (!textToSpeak || !textToSpeak.trim()) {
       toast({
        title: 'Pronunciation Error',
        description: 'No text provided to pronounce.',
        variant: 'default',
      });
      return;
    }
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false); 
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error event:', event);
      let description = 'Could not pronounce the text.';
      if (event.error) {
        description = `Pronunciation failed: ${event.error}.`;
        if (event.error === 'voice-unavailable' || event.error === 'language-unavailable') {
          description += ` Please check if a voice for language '${lang}' is installed and enabled in your system/browser settings.`;
        } else if (event.error === 'audio-busy' || event.error === 'audio-hardware') {
          description += ` There might be an issue with your audio output. Ensure your device/browser is not muted.`;
        } else if (event.error === 'synthesis-unavailable') {
            description += ` Speech synthesis might be unavailable on your system or browser.`;
        } else if (event.error === 'network') {
            description += ` A network error occurred. Some voices may require an internet connection.`;
        } else if (event.error === 'text-too-long') {
            description += ` The text is too long to pronounce.`;
        }
      } else {
        description += ` An unknown error occurred. Check browser console for details.`;
      }
      toast({
        title: 'Pronunciation Error',
        description: description,
        variant: 'destructive',
      });
      setIsSpeaking(false);
    };

    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.speak(utterance);
            window.speechSynthesis.onvoiceschanged = null; 
        };
    } else {
        window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleSpeak}
      disabled={disabled || isSpeaking || !textToSpeak.trim()}
      className={cn(className)}
      aria-label={isSpeaking ? "Stop pronunciation" : "Pronounce text"}
      {...props}
    >
      {children ? (
        <>
          {isSpeaking && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {children}
        </>
      ) : (
        isSpeaking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />
      )}
    </Button>
  );
}
