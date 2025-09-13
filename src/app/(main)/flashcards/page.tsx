
'use client'; // Add 'use client' as we are using hooks like useLoading

import { FlashcardList } from '@/components/flashcards/flashcard-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { useLoading } from '@/contexts/loading-context'; // Import useLoading


export default function AllFlashcardsPage() {
  const { startLoading } = useLoading(); // Get startLoading from context

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Study Cards</h1>
          <p className="text-muted-foreground">Manage and review all your study material.</p>
        </div>
        <Link href="/flashcards/new" passHref>
          <Button size="lg" className="shadow-md" onClick={startLoading}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Card
          </Button>
        </Link>
      </div>
      <FlashcardList />
    </div>
  );
}

