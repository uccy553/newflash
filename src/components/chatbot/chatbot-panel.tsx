
'use client';

import type { FormEvent } from 'react';
import React, { useState, useRef, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, User as UserIconLucide, MessageSquareText, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { handleChatbotInteraction } from '@/app/actions/chatbot-action';
import type { EnglishTutorChatInput } from '@/ai/flows/english-tutor-chat-flow';
import type { MessagePart } from 'genkit';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: MessagePart[];
  avatar?: string;
  name?: string;
  isError?: boolean;
  sessionId?: string; // For tracking chat sessions
}

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatbotPanel({ isOpen, onClose }: ChatbotPanelProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isChatLoading, startChatTransition] = useTransition();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 100); 
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (messages.length === 0 || !currentSessionId) {
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        setCurrentSessionId(newSessionId);
        const initialGreeting = currentUser
          ? `Hello ${currentUser?.displayName || 'learner'}! I'm Flash, your AI study tutor. How can I help you today? Ask me anything about your studies!`
          : `Hello! Please log in to use the AI study tutor.`;
        
        setMessages([{
          id: `bot-greeting-${Date.now()}`,
          role: 'model',
          content: [{ text: initialGreeting }],
          name: 'Flash AI Tutor',
          sessionId: newSessionId,
        }]);
      }
    }
  }, [isOpen, currentUser, messages.length, currentSessionId]);


  const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    if (!currentUser?.uid) {
      toast({
        title: 'Not Logged In',
        description: 'Please log in to chat with the AI tutor.',
        variant: 'destructive',
      });
      setMessages(prev => [...prev, {
        id: `bot-login-required-${Date.now()}`,
        role: 'model',
        content: [{ text: "You need to be logged in to use the chat features."}],
        name: "Flash AI Tutor",
        isError: true,
        sessionId: currentSessionId || undefined,
      }]);
      return;
    }

    const userMessageContent = trimmedInput;
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: [{ text: userMessageContent }],
      avatar: currentUser.photoURL || undefined,
      name: currentUser.displayName || 'You',
      sessionId: currentSessionId || undefined,
    };

    const currentMessagesForHistory = [...messages];

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    scrollToBottom();

    const historyForAICall = currentMessagesForHistory
      .filter(msg => msg.sessionId === currentSessionId) 
      .map(msg => ({
        role: msg.role,
        content: msg.content.map(part => {
          if (part.text) return { text: part.text };
          if (part.toolRequest) return { toolRequest: part.toolRequest };
          if (part.toolResponse) return { toolResponse: part.toolResponse };
          return part; 
        }) as MessagePart[],
      }));

    startChatTransition(async () => {
      const inputForAction: EnglishTutorChatInput = {
        userId: currentUser.uid, 
        message: userMessageContent,
        history: historyForAICall,
        sessionId: currentSessionId || `session_${Date.now()}`, 
      };

      console.log("[ChatbotPanel] Sending to action:", JSON.stringify(inputForAction, null, 2));

      const result = await handleChatbotInteraction(inputForAction);
      let botMessage: Message;

      if (result.success && result.data?.response) {
        botMessage = {
          id: `bot-${Date.now()}`,
          role: 'model',
          content: [{ text: result.data.response }],
          name: 'Flash AI Tutor',
          sessionId: currentSessionId || undefined,
        };
      } else {
        const errorText = result.error || 'Failed to get response from the chatbot. Please try again.';
        toast({
          title: 'Chatbot Error',
          description: errorText,
          variant: 'destructive',
        });
        botMessage = {
          id: `bot-error-${Date.now()}`,
          role: 'model',
          content: [{ text: `Sorry, I encountered an error: ${errorText}` }],
          name: 'Flash AI Tutor',
          isError: true,
          sessionId: currentSessionId || undefined,
        };
      }
      setMessages(prev => [...prev, botMessage]);
      scrollToBottom();
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0 shadow-2xl">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center text-lg">
            <MessageSquareText className="mr-2 h-6 w-6 text-primary" /> Flash - Your AI Tutor
          </SheetTitle>
          <SheetDescription>Ask study-related questions and get helpful explanations.</SheetDescription>
           <SheetClose
             className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
             onClick={onClose} 
           />
        </SheetHeader>

        <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4"> 
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'flex items-end gap-2',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'model' && (
                  <Avatar className="h-8 w-8 self-start"> 
                    <AvatarFallback className={cn("bg-primary text-primary-foreground", msg.isError && "bg-destructive text-destructive-foreground")}>
                      {msg.isError ? <AlertTriangle className="h-4 w-4"/> : "AI"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 shadow-sm',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none'
                                        : (msg.isError ? 'bg-destructive/10 text-destructive-foreground rounded-bl-none' : 'bg-secondary text-secondary-foreground rounded-bl-none')
                  )}
                >
                  {msg.content.map((part, index) => {
                    if (part.text) {
                      const lines = part.text.split('\n');
                      return (
                        <p key={index} className="text-sm whitespace-pre-wrap">
                          {lines.map((line, i) => (
                            <React.Fragment key={i}>
                              {line}
                              {i < lines.length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
                {msg.role === 'user' && currentUser && (
                  <Avatar className="h-8 w-8 self-start"> 
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User'} />
                    <AvatarFallback>{currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : <UserIconLucide />}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-end gap-2 justify-start">
                 <Avatar className="h-8 w-8 self-start"> 
                    <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                  </Avatar>
                <div className="max-w-[75%] rounded-lg px-3 py-2 shadow-sm bg-secondary text-secondary-foreground rounded-bl-none flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Flash is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="p-4 border-t mt-auto"> 
          <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder={currentUser ? "Ask Flash anything..." : "Please log in to chat"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isChatLoading || !currentUser}
              className="flex-grow text-[16px] md:text-[16px]"
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={isChatLoading || !inputValue.trim() || !currentUser}>
              {isChatLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
