
'use client';

import { NoteList } from '@/components/notes/note-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, ScanText } from 'lucide-react';
import { useLoading } from '@/contexts/loading-context';

export default function AllNotesPage() {
  const { startLoading } = useLoading();

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Study Notes</h1>
          <p className="text-muted-foreground">Manage and review all your study notes.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/notes/digitize" passHref>
            <Button size="lg" variant="outline" className="shadow-md w-full sm:w-auto" onClick={startLoading}>
              <ScanText className="mr-2 h-5 w-5" />
              Digitize Handwritten Note
            </Button>
          </Link>
          <Link href="/notes/new" passHref>
            <Button size="lg" className="shadow-md w-full sm:w-auto" onClick={startLoading}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Note
            </Button>
          </Link>
        </div>
      </div>
      <NoteList />
    </div>
  );
}

