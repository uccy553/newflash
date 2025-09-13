
'use client';

import { NoteForm } from '@/components/notes/note-form';
import { useAuth } from '@/hooks/use-auth';
import { getNote } from '@/lib/firestore';
import type { Note as NoteType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditNotePage() {
  const params = useParams();
  const noteId = params.id as string;
  const { currentUser } = useAuth();

  const { data: note, isLoading, error } = useQuery<NoteType | null>({
    queryKey: ['note', currentUser?.uid, noteId],
    queryFn: async () => {
      if (!currentUser?.uid || !noteId) return null;
      return getNote(currentUser.uid, noteId);
    },
    enabled: !!currentUser?.uid && !!noteId,
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
            <AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Note
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Could not load the note details. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  if (!note) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Note Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The requested note could not be found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full"> {/* Ensure full width */}
      <NoteForm noteId={noteId} initialData={note} />
    </div>
  );
}
