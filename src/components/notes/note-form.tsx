
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createNote, updateNote } from '@/lib/firestore-client';
import type { Note } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FolderPlus } from 'lucide-react';
import { useEffect } from 'react';
import { useLoading } from '@/contexts/loading-context';

const noteFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(150, 'Title must be 150 characters or less.'),
  content: z.string().min(1, 'Content is required.'),
  category: z.string().max(50, 'Category must be 50 characters or less.').optional().default(''),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface NoteFormProps {
  noteId?: string;
  initialData?: Note;
}

export function NoteForm({ noteId, initialData: propInitialData }: NoteFormProps) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { startLoading, stopLoading, isLoading: isAppLoading } = useLoading();

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: propInitialData?.title || '',
      content: propInitialData?.content || '',
      category: propInitialData?.category || '',
    },
  });

  useEffect(() => {
    if (propInitialData) {
      form.reset({
        title: propInitialData.title,
        content: propInitialData.content,
        category: propInitialData.category || '',
      });
    } else {
      form.reset({
        title: '',
        content: '',
        category: '',
      });
    }
  }, [propInitialData, form]);


  const mutationOptions = {
    onSuccess: (newOrUpdatedNoteId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['notes', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['userNoteCategories', currentUser?.uid] }); 
      const targetNoteId = noteId || newOrUpdatedNoteId;
      if (targetNoteId) {
        queryClient.invalidateQueries({ queryKey: ['note', currentUser?.uid, targetNoteId] });
      }
      toast({
        title: 'Success!',
        description: `Study note ${noteId ? 'updated' : 'created'} successfully.`,
        className: 'bg-accent text-accent-foreground',
      });
      router.push(targetNoteId ? `/notes/${targetNoteId}` : '/notes');
    },
    onError: (error: Error) => {
      toast({
        title: noteId ? 'Error Updating Note' : 'Error Creating Note',
        description: `Failed: ${error.message}`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      stopLoading();
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: NoteFormValues) => {
      if (!currentUser) throw new Error('User not authenticated.');
      const noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        title: data.title,
        content: data.content,
        category: data.category?.trim() || '',
      };
      return createNote(currentUser.uid, noteData);
    },
    ...mutationOptions,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: NoteFormValues) => {
      if (!currentUser || !noteId) throw new Error('User or Note ID missing.');
      const noteData: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>> = {
        title: data.title,
        content: data.content,
        category: data.category?.trim() || '',
      };
      await updateNote(currentUser.uid, noteId, noteData);
      return noteId;
    },
    ...mutationOptions,
  });


  async function onSubmit(data: NoteFormValues) {
    startLoading();
    if (!currentUser) {
      toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive' });
      stopLoading();
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) {
      toast({ title: 'Validation Error', description: 'Please correct the errors in the form.', variant: 'destructive' });
      stopLoading();
      return;
    }

    const finalData = { ...data, category: data.category?.trim() || '' };

    if (noteId) {
      updateMutation.mutate(finalData);
    } else {
      createMutation.mutate(finalData);
    }
  }

  const isProcessing = createMutation.isPending || updateMutation.isPending || isAppLoading;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">{noteId ? 'Edit Study Note' : 'Create New Study Note'}</CardTitle>
        <CardDescription>
          {noteId ? 'Modify your existing study note.' : 'Jot down your insights, summaries, or important details for any subject.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Note Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chapter 1 Key Concepts, Photosynthesis Summary" {...field} disabled={isProcessing} />
                  </FormControl>
                  <FormDescription>A concise title for your note.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Category / Folder (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., English 101, History Midterm" {...field} disabled={isProcessing} />
                  </FormControl>
                  <FormDescription>Assign this note to a category or folder. If left blank, it will be 'Uncategorized'.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Note Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your notes here..."
                      {...field}
                      rows={10}
                      className="resize-y min-h-[200px]"
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormDescription>The main body of your note.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isProcessing}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing} className="min-w-[120px]">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                {noteId ? 'Save Changes' : 'Create Note'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
