
'use client';

import { useState, useTransition, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, AlertTriangle, CheckCircle, XCircle, FileText, RefreshCw, ListChecks, ChevronLeft, ChevronRight, BookOpen, RotateCcw, UploadCloud, FileType, Trash2, Info, HelpCircle, Edit3 } from 'lucide-react'; // Added Info
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getNotesForClient, saveGeneratedQuizAttempt, logStudyActivity } from '@/lib/firestore-client';
import type { Note, ObjectiveQuizQuestion, TheoryQuizQuestion, UserQuizAttempt, UserTheoryAnswer, ObjectiveQuizResult, TheoryQuizResult, StoredQuiz, GenerateQuizFromNotesInput as AppClientGenerateQuizFromNotesInput, GenerateQuizFromNotesOutput } from '@/types';
import { handleGenerateQuizAction } from '@/app/actions/generate-quiz-action';
import { useLoading } from '@/contexts/loading-context';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as pdfjsLib from 'pdfjs-dist';

const QUESTIONS_PER_PAGE = 1;
const LOCAL_STORAGE_QUIZ_HISTORY_KEY_PREFIX = 'flashflow_quizGenHistory_';
const MAX_LOCAL_STORAGE_QUESTIONS = 50;

const OBJECTIVE_QUESTION_COUNT_OPTIONS = [10, 15, 20];
const DEFAULT_OBJECTIVE_QUESTION_COUNT = 10;
const THEORY_QUESTION_COUNT_OPTIONS = [3, 5, 7];
const DEFAULT_THEORY_QUESTION_COUNT = 5;

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit for PDF

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/workers/pdf.worker.min.js`;
}


export default function QuizGeneratorPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { startLoading: startAppLoading, stopLoading: stopAppLoading, isLoading: isAppLoading } = useLoading();
  const queryClient = useQueryClient();

  const [quizSource, setQuizSource] = useState<'notes' | 'pdf'>('notes');
  const [quizMode, setQuizMode] = useState<'objective' | 'theory'>('objective');
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(DEFAULT_OBJECTIVE_QUESTION_COUNT);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [notesFetched, setNotesFetched] = useState(false);
  const [contentForQuiz, setContentForQuiz] = useState<string>('');

  // State for questions
  const [objectiveQuestions, setObjectiveQuestions] = useState<ObjectiveQuizQuestion[]>([]);
  const [theoryQuestions, setTheoryQuestions] = useState<TheoryQuizQuestion[]>([]);
  const [lastGeneratedObjectiveQuestions, setLastGeneratedObjectiveQuestions] = useState<ObjectiveQuizQuestion[]>([]);
  const [lastGeneratedTheoryQuestions, setLastGeneratedTheoryQuestions] = useState<TheoryQuizQuestion[]>([]);

  // State for user answers
  const [userObjectiveAttempts, setUserObjectiveAttempts] = useState<UserQuizAttempt[]>([]);
  const [userTheoryAnswers, setUserTheoryAnswers] = useState<Record<string, string>>({}); // questionId -> userAnswer

  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [objectiveQuizResults, setObjectiveQuizResults] = useState<ObjectiveQuizResult[]>([]);
  const [currentScore, setCurrentScore] = useState(0); 

  const [isFetchingNotes, startFetchingNotesTransition] = useTransition();
  const [isGeneratingQuiz, startGeneratingQuizTransition] = useTransition();

  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (quizMode === 'objective') {
      setSelectedQuestionCount(DEFAULT_OBJECTIVE_QUESTION_COUNT);
    } else {
      setSelectedQuestionCount(DEFAULT_THEORY_QUESTION_COUNT);
    }
    resetQuizState(); 
  }, [quizMode]);

  const getLocalStorageKey = useCallback(() => {
    if (!currentUser?.uid) return null;
    const suffix = quizSource === 'pdf' ? 'pdf_uploads' : selectedCategory;
    return `${LOCAL_STORAGE_QUIZ_HISTORY_KEY_PREFIX}${currentUser.uid}_${suffix}_${quizMode}`;
  }, [currentUser?.uid, selectedCategory, quizSource, quizMode]);

  const getRecentQuestionsFromLocalStorage = useCallback((): string[] => {
    const key = getLocalStorageKey();
    if (!key || typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error reading recent questions from local storage:", e);
      return [];
    }
  }, [getLocalStorageKey]);

  const saveQuestionTextsToLocalStorage = useCallback((questions: (ObjectiveQuizQuestion | TheoryQuizQuestion)[]) => {
    const key = getLocalStorageKey();
    if (!key || typeof window === 'undefined') return;
    try {
      const existingQuestionTexts = getRecentQuestionsFromLocalStorage();
      const newQuestionTexts = questions.map(q => q.questionText);
      const updatedQuestionTexts = [...newQuestionTexts, ...existingQuestionTexts].slice(0, MAX_LOCAL_STORAGE_QUESTIONS);
      localStorage.setItem(key, JSON.stringify(updatedQuestionTexts));
    } catch (e) {
      console.error("Error saving question texts to local storage:", e);
    }
  }, [getLocalStorageKey, getRecentQuestionsFromLocalStorage]);

  const resetQuizState = () => {
    setObjectiveQuestions([]);
    setTheoryQuestions([]);
    setLastGeneratedObjectiveQuestions([]);
    setLastGeneratedTheoryQuestions([]);
    setUserObjectiveAttempts([]);
    setUserTheoryAnswers({});
    setQuizSubmitted(false);
    setObjectiveQuizResults([]);
    setCurrentScore(0);
    setCurrentPage(0);
  };

  const fetchUserNotesAndCategories = useCallback(async () => {
    if (!currentUser?.uid) {
      toast({ title: "Authentication Error", description: "Please log in to fetch your notes.", variant: "destructive" });
      return;
    }
    startAppLoading();
    startFetchingNotesTransition(async () => {
      try {
        const fetchedNotes = await getNotesForClient(currentUser.uid);
        setAllNotes(fetchedNotes);
        const uniqueCategories = ['all', ...new Set(fetchedNotes.map(note => note.category || 'Uncategorized').filter(Boolean))].sort((a, b) => {
            if (a === 'all') return -1; if (b === 'all') return 1;
            if (a === 'Uncategorized') return 1; if (b === 'Uncategorized') return -1;
            return a.localeCompare(b);
        });
        setCategories(uniqueCategories);
        if (fetchedNotes.length === 0) {
          toast({ title: "No Notes Found", description: "You don't have any notes. You can upload a PDF or create notes first.", variant: "default" });
          setContentForQuiz('');
        } else {
          toast({ title: "Notes Fetched", description: `Ready to generate a quiz from ${fetchedNotes.length} note(s).`, className: 'bg-accent text-accent-foreground' });
        }
        setNotesFetched(true);
        resetQuizState();
      } catch (error) {
        toast({ title: "Error Fetching Notes", description: (error as Error).message, variant: "destructive" });
      } finally {
        stopAppLoading();
      }
    });
  }, [currentUser?.uid, toast, startAppLoading, stopAppLoading]);

  useEffect(() => {
    if (quizSource === 'notes' && notesFetched) {
      let contentToSet = '';
      if (selectedCategory === "all") {
        contentToSet = allNotes.map(note => `Title: ${note.title}\nContent:\n${note.content}`).join('\n\n---\n\n');
      } else {
        const filteredNotes = allNotes.filter(note => (note.category || 'Uncategorized') === selectedCategory);
        contentToSet = filteredNotes.map(note => `Title: ${note.title}\nContent:\n${note.content}`).join('\n\n---\n\n');
      }
      setContentForQuiz(contentToSet);
      resetQuizState();
    }
  }, [selectedCategory, allNotes, notesFetched, quizSource]);

   useEffect(() => {
    if (quizSource === 'notes' && pdfFile) {
      setPdfFile(null); setPdfFileName(null);
    }
    if (quizSource === 'pdf') {
        setContentForQuiz(''); resetQuizState();
    }
  }, [quizSource, pdfFile]);

  const handlePdfFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: "Invalid File", description: "Please select a PDF file.", variant: "destructive" }); return;
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      toast({ title: "File Too Large", description: `PDF file size should not exceed ${MAX_PDF_SIZE_BYTES / (1024*1024)}MB.`, variant: "destructive" }); return;
    }
    setPdfFile(file); setPdfFileName(file.name); setIsExtractingPdf(true);
    setContentForQuiz(''); resetQuizState(); startAppLoading();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
      }
      setContentForQuiz(fullText);
      toast({ title: "PDF Processed", description: "Text extracted. Ready to generate quiz.", className: "bg-accent text-accent-foreground" });
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({ title: "PDF Processing Error", description: "Could not extract text.", variant: "destructive" });
      setPdfFile(null); setPdfFileName(null);
    } finally {
      setIsExtractingPdf(false); stopAppLoading();
    }
  };

  const clearPdfFile = () => {
    setPdfFile(null); setPdfFileName(null); setContentForQuiz('');
    if (pdfInputRef.current) pdfInputRef.current.value = "";
    if (quizSource === 'pdf' && notesFetched) {
        let contentToSet = '';
        if (selectedCategory === "all") contentToSet = allNotes.map(note => `Title: ${note.title}\nContent:\n${note.content}`).join('\n\n---\n\n');
        else {
            const filteredNotes = allNotes.filter(note => (note.category || 'Uncategorized') === selectedCategory);
            contentToSet = filteredNotes.map(note => `Title: ${note.title}\nContent:\n${note.content}`).join('\n\n---\n\n');
        }
        setContentForQuiz(contentToSet);
    }
    resetQuizState();
  };

  const handleGenerateQuiz = () => {
    if (!currentUser?.uid) { toast({ title: "Authentication Error", variant: "destructive" }); return; }
    if (!contentForQuiz.trim()) { toast({ title: "No Content", description: "Select notes or upload PDF.", variant: "destructive" }); return; }
    if (contentForQuiz.length < 50) { toast({ title: "Content Too Short", description: "Min 50 characters for quiz.", variant: "destructive" }); return; }
    startAppLoading();
    startGeneratingQuizTransition(async () => {
      try {
        const recentQuestionTexts = quizMode === 'objective' ? getRecentQuestionsFromLocalStorage() : [];
        const inputForAction: AppClientGenerateQuizFromNotesInput = {
            notesContent: contentForQuiz,
            questionCount: selectedQuestionCount,
            quizMode: quizMode,
            recentQuestionTexts: recentQuestionTexts,
            quizSourceType: quizSource,
        };
        if (quizSource === 'notes' && selectedCategory !== "all" && selectedCategory !== "Uncategorized") {
            inputForAction.noteCategory = selectedCategory;
        }
        const result = await handleGenerateQuizAction(inputForAction);
        if (result.success && result.data) {
          resetQuizState(); 
          if (result.data.generatedQuizMode === 'objective' && result.data.objectiveQuestions) {
            setObjectiveQuestions(result.data.objectiveQuestions);
            setLastGeneratedObjectiveQuestions(result.data.objectiveQuestions);
            setUserObjectiveAttempts(result.data.objectiveQuestions.map(q => ({ questionId: q.id, selectedOptionIndex: null })));
            if (result.data.objectiveQuestions.length > 0) saveQuestionTextsToLocalStorage(result.data.objectiveQuestions);
          } else if (result.data.generatedQuizMode === 'theory' && result.data.theoryQuestions) {
            setTheoryQuestions(result.data.theoryQuestions);
            setLastGeneratedTheoryQuestions(result.data.theoryQuestions);
            setUserTheoryAnswers({}); 
            if (result.data.theoryQuestions.length > 0) saveQuestionTextsToLocalStorage(result.data.theoryQuestions);
          }
          if ((result.data.objectiveQuestions?.length || 0) > 0 || (result.data.theoryQuestions?.length || 0) > 0) {
            toast({ title: "Quiz Generated!", description: `Your ${result.data.objectiveQuestions?.length || result.data.theoryQuestions?.length}-question quiz is ready.`, className: 'bg-accent text-accent-foreground' });
          } else {
            toast({ title: "No Questions Generated", description: "AI couldn't generate questions from the content for the selected mode. Try different content or mode.", variant: "default" });
          }
        } else {
          toast({ title: "Quiz Generation Failed", description: result.error || "Could not generate quiz.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Quiz Generation Error", description: (error as Error).message, variant: "destructive" });
      } finally {
        stopAppLoading();
      }
    });
  };

  const handleObjectiveOptionSelect = (questionId: string, optionIndex: number) => {
    if (quizSubmitted) return;
    setUserObjectiveAttempts(prev => prev.map(attempt =>
      attempt.questionId === questionId ? { ...attempt, selectedOptionIndex: optionIndex } : attempt
    ));
  };

  const handleTheoryAnswerChange = (questionId: string, answer: string) => {
    if (quizSubmitted) return;
    setUserTheoryAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const saveQuizAttemptMutation = useMutation({
    mutationFn: async (quizAttemptData: Omit<StoredQuiz, 'id'>) => {
      if (!currentUser?.uid) throw new Error("User information is missing.");
      await saveGeneratedQuizAttempt(currentUser.uid, quizAttemptData);
      await logStudyActivity(currentUser.uid);
      return quizAttemptData;
    },
    onSuccess: (savedData) => {
      queryClient.invalidateQueries({ queryKey: ['attemptedGeneratedQuizzes', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['languageInsights', currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['activityLog', currentUser?.uid] });
      const scoreText = savedData.quizMode === 'objective' ? `You scored ${savedData.userScore}%.` : 'Your answers have been saved.';
      toast({ title: "Quiz Submitted & Saved!", description: `${scoreText} Check your answers.`, className: 'bg-accent text-accent-foreground' });
    },
    onError: (e) => { toast({ title: "Error Saving Quiz Attempt", description: (e as Error).message, variant: "destructive" }); },
    onSettled: () => { stopAppLoading(); }
  });

  const handleSubmitQuiz = () => {
    if (!currentUser?.uid) { toast({ title: "Error", description: "User missing.", variant: "destructive"}); return; }
    
    let quizAttemptData: Omit<StoredQuiz, 'id'>;
    
    if (quizMode === 'objective') {
      if (userObjectiveAttempts.some(attempt => attempt.selectedOptionIndex === null)) {
          toast({ title: "Incomplete Quiz", description: "Answer all questions.", variant: "warning" }); return;
      }
      startAppLoading();
      let correctAnswers = 0;
      const results: ObjectiveQuizResult[] = objectiveQuestions.map(q => {
        const attempt = userObjectiveAttempts.find(a => a.questionId === q.id);
        const isCorrect = attempt?.selectedOptionIndex === q.correctOptionIndex;
        if (isCorrect) correctAnswers++;
        return { ...q, userSelectedOptionIndex: attempt?.selectedOptionIndex ?? null, isCorrect };
      });
      const calculatedScore = Math.round((correctAnswers / objectiveQuestions.length) * 100);
      setObjectiveQuizResults(results);
      setCurrentScore(calculatedScore);

      quizAttemptData = {
        userId: currentUser.uid,
        quizMode: 'objective',
        questions: objectiveQuestions,
        userScore: calculatedScore,
        userCorrectAnswers: correctAnswers,
        userIncorrectAnswers: objectiveQuestions.length - correctAnswers,
        questionsInQuiz: objectiveQuestions.length,
        notesContentSnippet: contentForQuiz.substring(0, 500) + (contentForQuiz.length > 500 ? '...' : ''),
        attemptedAt: Timestamp.now(), createdAt: Timestamp.now(), quizSourceType: quizSource,
      };
    } else { 
      if (theoryQuestions.some(q => !userTheoryAnswers[q.id]?.trim())) {
         toast({ title: "Incomplete Quiz", description: "Please provide an answer for all theory questions.", variant: "warning" }); return;
      }
      startAppLoading();
      const theoryAnswersToSave: UserTheoryAnswer[] = theoryQuestions.map(q => ({
        questionId: q.id,
        userAnswer: userTheoryAnswers[q.id] || ""
      }));
      quizAttemptData = {
        userId: currentUser.uid,
        quizMode: 'theory',
        theoryQuestions: theoryQuestions,
        userTheoryAnswers: theoryAnswersToSave,
        questionsInQuiz: theoryQuestions.length, 
        notesContentSnippet: contentForQuiz.substring(0, 500) + (contentForQuiz.length > 500 ? '...' : ''),
        attemptedAt: Timestamp.now(), createdAt: Timestamp.now(), quizSourceType: quizSource,
      };
    }

    if (quizSource === 'notes' && selectedCategory !== "all" && selectedCategory !== "Uncategorized") {
      quizAttemptData.noteCategory = selectedCategory;
    }
    if (quizSource === 'pdf' && pdfFileName) {
      quizAttemptData.pdfFileName = pdfFileName;
    }
    
    setQuizSubmitted(true);
    setCurrentPage(0);
    saveQuizAttemptMutation.mutate(quizAttemptData);
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleRetakeQuiz = () => {
    startAppLoading();
    if (quizMode === 'objective') {
      if (lastGeneratedObjectiveQuestions.length === 0) { toast({ title: "No quiz to retake", variant: "warning" }); stopAppLoading(); return; }
      const shuffled = shuffleArray(lastGeneratedObjectiveQuestions);
      setObjectiveQuestions(shuffled);
      setUserObjectiveAttempts(shuffled.map(q => ({ questionId: q.id, selectedOptionIndex: null })));
    } else { 
      if (lastGeneratedTheoryQuestions.length === 0) { toast({ title: "No quiz to retake", variant: "warning" }); stopAppLoading(); return; }
      const shuffled = shuffleArray(lastGeneratedTheoryQuestions);
      setTheoryQuestions(shuffled);
      setUserTheoryAnswers({}); 
    }
    setQuizSubmitted(false); setObjectiveQuizResults([]); setCurrentScore(0); setCurrentPage(0);
    toast({ title: "Quiz Reloaded!", description: "Questions reshuffled.", className: 'bg-accent text-accent-foreground' });
    stopAppLoading();
  };

  const isLoading = isFetchingNotes || isGeneratingQuiz || saveQuizAttemptMutation.isPending || isAppLoading || isExtractingPdf;
  
  const questionsForCurrentMode = quizMode === 'objective' ? objectiveQuestions : theoryQuestions;
  const currentQuestionForDisplay = questionsForCurrentMode[currentPage];
  const currentObjectiveResultForDisplay = (quizMode === 'objective' && quizSubmitted) ? objectiveQuizResults[currentPage] : null;
  
  const progress = questionsForCurrentMode.length > 0 ? ((currentPage + 1 ) / questionsForCurrentMode.length) * 100 : 0;
  
  const allQuestionsAnswered = quizMode === 'objective'
    ? userObjectiveAttempts.every(attempt => attempt.selectedOptionIndex !== null)
    : theoryQuestions.every(q => !!userTheoryAnswers[q.id]?.trim());

  const questionCountOptions = quizMode === 'objective' ? OBJECTIVE_QUESTION_COUNT_OPTIONS : THEORY_QUESTION_COUNT_OPTIONS;

  if (quizSource === 'notes' && !notesFetched && !isLoading) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4 sm:p-6">
        <Card className="w-full max-w-lg shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl font-bold">AI Quiz Generator</CardTitle>
            <CardDescription className="text-md sm:text-lg">
              Generate personalized quizzes from your study notes or a PDF. Choose between objective or theory questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => { setQuizSource('notes'); fetchUserNotesAndCategories();}} size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
              Use My Notes
            </Button>
            <Button onClick={() => setQuizSource('pdf')} size="lg" variant="outline" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileType className="mr-2 h-5 w-5" />}
              Upload PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">AI Quiz Generator</CardTitle>
          <CardDescription className="text-md sm:text-lg text-muted-foreground">
            Test your knowledge with AI-generated quizzes. Choose your source and question style.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-medium">Quiz Source</Label>
            <RadioGroup value={quizSource} onValueChange={(value: 'notes' | 'pdf') => { setQuizSource(value); if (value === 'notes' && !notesFetched) fetchUserNotesAndCategories(); }} className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Label htmlFor="source-notes" className={cn("flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer flex-1", quizSource === 'notes' && "bg-primary/10 border-primary ring-2 ring-primary")}>
                <RadioGroupItem value="notes" id="source-notes" /> <span>Use My Notes</span>
              </Label>
              <Label htmlFor="source-pdf" className={cn("flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer flex-1", quizSource === 'pdf' && "bg-primary/10 border-primary ring-2 ring-primary")}>
                <RadioGroupItem value="pdf" id="source-pdf" /> <span>Upload PDF</span>
              </Label>
            </RadioGroup>
          </div>

          {quizSource === 'notes' && (
            <div className="flex flex-col sm:flex-row gap-3 items-center flex-wrap mt-4">
              <Button onClick={fetchUserNotesAndCategories} variant="outline" className="w-full sm:w-auto" disabled={isLoading}>
                {isFetchingNotes ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
                Re-Fetch Notes ({allNotes.length} loaded)
              </Button>
              {categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoading}>
                  <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[220px]"><SelectValue placeholder="Select note category" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Notes' : c}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          )}
          {quizSource === 'pdf' && (
            <div className="mt-4 space-y-3">
              <Label htmlFor="pdf-upload-input" className="font-medium">Upload PDF Document</Label>
              {pdfFileName ? (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2"><FileType className="h-5 w-5 text-primary" /><span className="text-sm font-medium truncate max-w-[200px] sm:max-w-xs">{pdfFileName}</span></div>
                  <Button variant="ghost" size="icon" onClick={clearPdfFile} disabled={isLoading}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ) : (
                <div className={cn("mt-1 flex flex-col justify-center items-center w-full h-32 px-4 py-4 border-2 border-dashed rounded-md cursor-pointer hover:border-accent transition-colors", isLoading && "opacity-50 cursor-not-allowed")} onClick={() => !isLoading && pdfInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isLoading) pdfInputRef.current?.click();}}>
                    <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground mt-1 text-center"><span className="font-semibold text-accent">Click to upload PDF</span></p><p className="text-xs text-muted-foreground text-center">Max {MAX_PDF_SIZE_BYTES / (1024*1024)}MB. Text will be extracted.</p>
                </div>
              )}
              <Input id="pdf-upload-input" ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfFileChange} className="hidden" disabled={isLoading} />
              {isExtractingPdf && <div className="flex items-center text-primary text-sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting text...</div>}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Label className="text-base font-medium">Question Style</Label>
            <RadioGroup value={quizMode} onValueChange={(value: 'objective' | 'theory') => setQuizMode(value)} className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Label htmlFor="mode-objective" className={cn("flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer flex-1", quizMode === 'objective' && "bg-primary/10 border-primary ring-2 ring-primary")}>
                <RadioGroupItem value="objective" id="mode-objective" /> <span>Objective (Multiple Choice)</span>
              </Label>
              <Label htmlFor="mode-theory" className={cn("flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer flex-1", quizMode === 'theory' && "bg-primary/10 border-primary ring-2 ring-primary")}>
                <RadioGroupItem value="theory" id="mode-theory" /> <span>Theory (Written Answer)</span>
              </Label>
            </RadioGroup>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-center flex-wrap pt-2">
            <Select value={selectedQuestionCount.toString()} onValueChange={(v) => setSelectedQuestionCount(parseInt(v))} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px]"><SelectValue placeholder="Number of questions" /></SelectTrigger>
              <SelectContent>{questionCountOptions.map(c => <SelectItem key={c} value={c.toString()}>{c} Questions</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleGenerateQuiz} className="w-full sm:w-auto flex-grow sm:flex-grow-0" disabled={isLoading || !contentForQuiz.trim() || contentForQuiz.length < 50} size="lg">
              {isGeneratingQuiz ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
              Generate Quiz
            </Button>
          </div>
           {(contentForQuiz.length > 0 && contentForQuiz.length < 50) && ( <Alert variant="warning"><AlertTriangle className="h-4 w-4" /><AlertTitle>Content Too Short</AlertTitle><AlertDescription>The {quizSource === 'pdf' ? 'extracted PDF content' : `notes in the selected category`} is less than 50 characters. Provide more content.</AlertDescription></Alert> )}
           {quizSource === 'notes' && !notesFetched && ( <Alert variant="default" className="mt-4"><Info className="h-4 w-4"/><AlertTitle>Fetch Notes</AlertTitle><AlertDescription>Click "Use My Notes" and "Re-Fetch Notes" if you haven't already to load your notes for quiz generation.</AlertDescription></Alert> )}
        </CardContent>
      </Card>

      {isGeneratingQuiz && ( <Card><CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]"><Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary mb-4" /><p className="text-muted-foreground text-sm sm:text-base">AI is generating your {quizMode} quiz...</p></CardContent></Card> )}

      {questionsForCurrentMode.length > 0 && currentQuestionForDisplay && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                 <CardTitle className="text-lg sm:text-xl md:text-2xl">
                    {quizSubmitted ? `Result for Question ${currentPage + 1}` : `Question ${currentPage + 1} of ${questionsForCurrentMode.length}`} ({quizMode} mode)
                 </CardTitle>
                 {quizSubmitted && quizMode === 'objective' && currentObjectiveResultForDisplay && (
                    <Badge variant={currentObjectiveResultForDisplay.isCorrect ? 'default' : 'destructive'} className={cn(currentObjectiveResultForDisplay.isCorrect && 'bg-accent text-accent-foreground', 'text-xs sm:text-sm')}>
                        {currentObjectiveResultForDisplay.isCorrect ? 'Correct' : 'Incorrect'}
                    </Badge>
                 )}
            </div>
            <Progress value={progress} className="mt-2 h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base sm:text-lg font-semibold whitespace-pre-wrap">{(currentQuestionForDisplay as ObjectiveQuizQuestion | TheoryQuizQuestion).questionText}</p>
            
            {quizMode === 'objective' && (currentQuestionForDisplay as ObjectiveQuizQuestion).options && (
              <RadioGroup key={`${currentQuestionForDisplay.id}-${currentPage}`} value={userObjectiveAttempts.find(a => a.questionId === currentQuestionForDisplay.id)?.selectedOptionIndex?.toString()} onValueChange={(v) => handleObjectiveOptionSelect(currentQuestionForDisplay.id, parseInt(v))} disabled={quizSubmitted || isLoading} className="space-y-2">
                {(currentQuestionForDisplay as ObjectiveQuizQuestion).options.map((option, index) => {
                  const optionId = `${currentQuestionForDisplay.id}-option-${index}`;
                  let optionStyle = "";
                  if (quizSubmitted && currentObjectiveResultForDisplay) {
                    if (index === (currentQuestionForDisplay as ObjectiveQuizQuestion).correctOptionIndex) optionStyle = "text-accent border-accent ring-2 ring-accent";
                    else if (index === currentObjectiveResultForDisplay.userSelectedOptionIndex && !currentObjectiveResultForDisplay.isCorrect) optionStyle = "text-destructive border-destructive ring-2 ring-destructive";
                  }
                  return ( <Label htmlFor={optionId} className={cn("flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer text-sm sm:text-base", optionStyle, (quizSubmitted || isLoading) && "cursor-default opacity-70")} key={optionId}>
                    <RadioGroupItem value={index.toString()} id={optionId} disabled={quizSubmitted || isLoading} /> <span>{String.fromCharCode(65 + index)}. {option}</span></Label>
                  );
                })}
              </RadioGroup>
            )}

            {quizMode === 'theory' && (
              <div>
                <Label htmlFor={`theory-answer-${currentQuestionForDisplay.id}`} className="font-medium">Your Answer:</Label>
                <Textarea id={`theory-answer-${currentQuestionForDisplay.id}`} value={userTheoryAnswers[currentQuestionForDisplay.id] || ''} onChange={(e) => handleTheoryAnswerChange(currentQuestionForDisplay.id, e.target.value)} rows={5} placeholder="Type your answer here..." disabled={quizSubmitted || isLoading} className="mt-1"/>
              </div>
            )}

            {quizSubmitted && (
              <Card className="mt-4 bg-card p-3 sm:p-4 border">
                <CardContent className="space-y-3 text-sm sm:text-base">
                  {quizMode === 'objective' && currentObjectiveResultForDisplay && (
                    <>
                      <Alert variant={currentObjectiveResultForDisplay.isCorrect ? 'default' : 'destructive'} className={cn(currentObjectiveResultForDisplay.isCorrect && "border-accent bg-accent/10")}>
                        {currentObjectiveResultForDisplay.isCorrect ? <CheckCircle className="h-5 w-5 text-accent"/> : <XCircle className="h-5 w-5 text-destructive"/>}
                        <AlertTitle>{currentObjectiveResultForDisplay.isCorrect ? "Correct!" : "Incorrect"}</AlertTitle>
                        <AlertDescription>
                           Your Answer: {currentObjectiveResultForDisplay.userSelectedOptionIndex !== null ? `${String.fromCharCode(65 + currentObjectiveResultForDisplay.userSelectedOptionIndex)}. ${(currentQuestionForDisplay as ObjectiveQuizQuestion).options[currentObjectiveResultForDisplay.userSelectedOptionIndex]}` : "Not answered"}
                        </AlertDescription>
                      </Alert>
                       <Alert variant="default" className="border-primary bg-primary/5">
                         <Info className="h-5 w-5 text-primary"/>
                         <AlertTitle>Correct Answer & Explanation</AlertTitle>
                         <AlertDescription>
                           <p><strong>Correct: </strong>{String.fromCharCode(65 + (currentQuestionForDisplay as ObjectiveQuizQuestion).correctOptionIndex)}. {(currentQuestionForDisplay as ObjectiveQuizQuestion).options[(currentQuestionForDisplay as ObjectiveQuizQuestion).correctOptionIndex]}</p>
                           <div className="mt-1 pt-1 border-t border-dashed border-primary/30">
                             <p className="whitespace-pre-wrap">{(currentQuestionForDisplay as ObjectiveQuizQuestion).explanation}</p>
                           </div>
                         </AlertDescription>
                       </Alert>
                    </>
                  )}
                  {quizMode === 'theory' && (
                    <div className="space-y-3">
                       <Alert variant="default" className="border-input">
                         <Edit3 className="h-5 w-5 text-foreground"/>
                         <AlertTitle>Your Submitted Answer</AlertTitle>
                         <AlertDescription className="whitespace-pre-wrap">
                           {userTheoryAnswers[currentQuestionForDisplay.id] || "No answer provided."}
                         </AlertDescription>
                       </Alert>
                       <Alert variant="default" className="border-primary bg-primary/5">
                         <Info className="h-5 w-5 text-primary"/>
                         <AlertTitle>AI's Ideal Answer / Key Points</AlertTitle>
                         <AlertDescription className="whitespace-pre-wrap">
                           {(currentQuestionForDisplay as TheoryQuizQuestion).idealAnswer}
                         </AlertDescription>
                       </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
          <CardContent className="pt-2">
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
              <Button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0 || isLoading} variant="outline" className="w-full sm:w-auto"><ChevronLeft className="mr-2 h-4 w-4"/> Previous</Button>
              {!quizSubmitted && currentPage === questionsForCurrentMode.length - 1 && ( <Button onClick={handleSubmitQuiz} disabled={isLoading || !allQuestionsAnswered} className="w-full sm:w-auto">{saveQuizAttemptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}<ListChecks className="mr-2 h-4 w-4"/> Submit Quiz</Button> )}
              {quizSubmitted && currentPage === questionsForCurrentMode.length - 1 && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button onClick={handleRetakeQuiz} disabled={isLoading || (quizMode === 'objective' ? lastGeneratedObjectiveQuestions.length === 0 : lastGeneratedTheoryQuestions.length === 0)} className="w-full sm:w-auto" variant="outline"><RotateCcw className="mr-2 h-4 w-4"/> Retake Quiz</Button>
                    <Button onClick={handleGenerateQuiz} disabled={isLoading || !contentForQuiz.trim()} className="w-full sm:w-auto"><Wand2 className="mr-2 h-4 w-4"/> Generate New Quiz</Button>
                </div>
              )}
              <Button onClick={() => setCurrentPage(p => Math.min(questionsForCurrentMode.length - 1, p + 1))} disabled={currentPage === questionsForCurrentMode.length - 1 || isLoading} variant="outline" className="w-full sm:w-auto">Next <ChevronRight className="ml-2 h-4 w-4"/></Button>
            </div>
            {!quizSubmitted && currentPage === questionsForCurrentMode.length - 1 && !allQuestionsAnswered && ( <p className="text-xs text-muted-foreground mt-2 text-center">Answer all questions to enable submission.</p> )}
          </CardContent>
        </Card>
      )}

      {questionsForCurrentMode.length > 0 && quizSubmitted && (
        <Card className="shadow-lg text-center p-4 sm:p-6">
            <CardHeader><CardTitle className="text-xl sm:text-2xl">Quiz Results Summary ({quizMode} mode)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {quizMode === 'objective' && (
                  <>
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{currentScore}%</p>
                    <p className="text-sm sm:text-base text-muted-foreground">You answered {objectiveQuizResults.filter(r => r.isCorrect).length} out of {objectiveQuestions.length} questions correctly.</p>
                  </>
                )}
                {quizMode === 'theory' && (
                     <p className="text-lg sm:text-xl text-muted-foreground">You completed {theoryQuestions.length} theory question(s). Review your answers above against the ideal solutions.</p>
                )}
                <div className="flex flex-col sm:flex-row justify-center gap-3 mt-2">
                  <Button onClick={handleRetakeQuiz} className="w-full sm:w-auto" variant="outline" disabled={isLoading || (quizMode === 'objective' ? lastGeneratedObjectiveQuestions.length === 0 : lastGeneratedTheoryQuestions.length === 0)}><RotateCcw className="mr-2 h-4 w-4"/> Retake Quiz</Button>
                  <Button onClick={handleGenerateQuiz} className="w-full sm:w-auto" disabled={isLoading || !contentForQuiz.trim()}><Wand2 className="mr-2 h-4 w-4"/> Generate Another Quiz</Button>
                </div>
            </CardContent>
        </Card>
      )}

      {(quizSource === 'notes' && notesFetched && allNotes.length === 0 && !isLoading) && ( <Card className="p-6 sm:p-8 text-center"><CardHeader><BookOpen className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" /><CardTitle className="text-xl sm:text-2xl">No Notes Found</CardTitle></CardHeader><CardContent><p className="text-sm sm:text-base text-muted-foreground">You don't have notes to generate a quiz from. Create notes first.</p><Link href="/notes/new" passHref><Button className="mt-4 w-full sm:w-auto" onClick={() => startAppLoading()}>Create Note</Button></Link></CardContent></Card> )}
      {(quizSource === 'pdf' && !pdfFile && !isLoading) && ( <Card className="p-6 sm:p-8 text-center"><CardHeader><FileType className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" /><CardTitle className="text-xl sm:text-2xl">No PDF Selected</CardTitle></CardHeader><CardContent><p className="text-sm sm:text-base text-muted-foreground">Upload a PDF to generate a quiz.</p><Button className="mt-4 w-full sm:w-auto" onClick={() => pdfInputRef.current?.click()}><UploadCloud className="mr-2 h-5 w-5"/> Select PDF</Button></CardContent></Card> )}
      {(questionsForCurrentMode.length === 0 && !isGeneratingQuiz && (contentForQuiz.length > 0 && contentForQuiz.length >= 50) ) && (
        <Card className="p-6 sm:p-8 text-center">
            <CardHeader>
                <HelpCircle className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                <CardTitle className="text-xl sm:text-2xl">Ready to Generate!</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm sm:text-base text-muted-foreground">
                    Your content is loaded. Choose your preferred question style and count, then click "Generate Quiz".
                </p>
                 <Button onClick={handleGenerateQuiz} className="mt-4 w-full sm:w-auto" disabled={isLoading || !contentForQuiz.trim()} size="lg">
                    <Wand2 className="mr-2 h-5 w-5"/> Generate Quiz Now
                </Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

