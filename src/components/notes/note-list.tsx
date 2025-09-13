
'use client';

import { useAuth } from '@/hooks/use-auth';
import { getNotesForClient, deleteNote } from '@/lib/firestore-client'; // Ensure using client version
import type { Note } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NoteItem } from './note-item';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Inbox, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useLoading } from '@/contexts/loading-context';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function NoteList() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { startLoading, stopLoading, isLoading: isAppLoading } = useLoading();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const { data: notes, isLoading: queryIsLoading, error } = useQuery<Note[]>({
    queryKey: ['notes', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser?.uid) return [];
      startLoading();
      try {
        return await getNotesForClient(currentUser.uid); // Using getNotesForClient
      } finally {
        stopLoading();
      }
    },
    enabled: !!currentUser?.uid,
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => {
      if (!currentUser?.uid) throw new Error("User not authenticated.");
      startLoading();
      return deleteNote(currentUser.uid, noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', currentUser?.uid] });
      toast({ title: 'Success!', description: 'Note deleted.', className: 'bg-accent text-accent-foreground' });
    },
    onError: (e) => {
      toast({ title: 'Error', description: `Failed to delete note: ${(e as Error).message}`, variant: 'destructive' });
    },
    onSettled: () => {
      setNoteToDelete(null);
      setShowDeleteConfirm(false);
      stopLoading();
    }
  });

  const handleEdit = (id: string) => {
    startLoading(); 
    router.push(`/notes/edit/${id}`);
  };

  const handleDeleteInitiate = (id: string) => {
    setNoteToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (noteToDelete) {
      deleteMutation.mutate(noteToDelete);
    }
  };
  
  const isLoading = queryIsLoading || isAppLoading;

  if (isLoading && (!notes || notes.length === 0)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => ( 
          <Card key={i} className="h-[150px] animate-pulse bg-muted/50"></Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive flex flex-col items-center justify-center rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h3 className="text-xl font-semibold">Error Loading Notes</h3>
        <p className="text-sm mt-2">Could not fetch your notes. Please try again later.</p>
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center min-h-[400px] bg-card">
        <Inbox className="h-16 w-16 text-muted-foreground/70 mb-6" />
        <h3 className="text-2xl font-semibold text-foreground">No Notes Yet!</h3>
        <p className="mt-2 text-muted-foreground max-w-md">
          You haven't created any notes. Start by creating a new note or digitizing your handwritten ones.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link href="/notes/new" passHref>
              <Button size="lg" className="shadow-md" onClick={startLoading}>Create New Note</Button>
            </Link>
            <Link href="/notes/digitize" passHref>
              <Button size="lg" variant="outline" className="shadow-md" onClick={startLoading}>Digitize Handwritten Note</Button>
            </Link>
        </div>
      </div>
    );
  }

  // Group all notes by category
  const groupedNotes: { [category: string]: Note[] } = (notes || []).reduce((acc, note) => {
    const category = note.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(note);
    return acc;
  }, {} as { [category: string]: Note[] });

  const categories = Object.keys(groupedNotes).sort((a, b) => {
    if (a === 'Uncategorized') return 1; 
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b); 
  });

  return (
    <>
      <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
        {categories.map((category) => (
          <AccordionItem value={category} key={category} className="border rounded-lg shadow-sm bg-card">
            <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
              <div className="flex items-center">
                <FolderOpen className="mr-3 h-6 w-6 text-primary" />
                {category} ({groupedNotes[category].length})
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-0">
              {groupedNotes[category].length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {groupedNotes[category].map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      onEdit={handleEdit}
                      onDelete={handleDeleteInitiate}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No notes in this category.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || isAppLoading}
            >
              {(deleteMutation.isPending || isAppLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
