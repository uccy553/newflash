
'use client';

import type { Note } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Edit, Trash2, Eye, ClipboardCopy } from 'lucide-react';
import Link from 'next/link';
import { useLoading } from '@/contexts/loading-context';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface NoteItemProps {
  note: Note;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NoteItem({ note, onEdit, onDelete }: NoteItemProps) {
  const { startLoading } = useLoading();
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  
  const handleViewClick = () => {
    startLoading();
  };

  const handleEditClick = () => {
    startLoading();
    if (note.id) onEdit(note.id);
  };
  
  const handleCopyNote = async () => {
    if (!note.content) {
      toast({
        title: 'Nothing to Copy',
        description: 'The note content is empty.',
        variant: 'default'
      });
      return;
    }
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(note.content);
      toast({
        title: 'Note Copied!',
        description: 'The note content has been copied to your clipboard.',
        className: 'bg-accent text-accent-foreground'
      });
    } catch (err) {
      console.error('Failed to copy note: ', err);
      toast({
        title: 'Copy Failed',
        description: 'Could not copy the note content. Please try again or copy manually.',
        variant: 'destructive'
      });
    } finally {
      setIsCopying(false);
    }
  };
  
  const contentSnippet = note.content.length > 100 
    ? `${note.content.substring(0, 100)}...` 
    : note.content;

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold truncate">{note.title}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Last updated: {note.updatedAt instanceof Timestamp ? formatDistanceToNow(note.updatedAt.toDate(), { addSuffix: true }) : 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden py-2">
        <p className="text-sm text-foreground whitespace-pre-wrap">{contentSnippet}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" onClick={handleCopyNote} disabled={isCopying} className="flex-shrink-0">
          <ClipboardCopy className="mr-1.5 h-4 w-4" /> {isCopying ? 'Copying...' : 'Copy'}
        </Button>
        <Link href={`/notes/${note.id}`} passHref>
          <Button variant="outline" size="sm" onClick={handleViewClick} className="flex-shrink-0">
            <Eye className="mr-1.5 h-4 w-4" /> View
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleEditClick} className="flex-shrink-0">
          <Edit className="mr-1.5 h-4 w-4" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => note.id && onDelete(note.id)} className="flex-shrink-0">
          <Trash2 className="mr-1.5 h-4 w-4" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
