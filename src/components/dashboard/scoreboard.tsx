
'use client';

import { useAuth } from '@/hooks/use-auth';
import { getAttemptedGeneratedQuizzes } from '@/lib/firestore-client';
import type { StoredQuiz } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, AlertTriangle, Trophy, TrendingUp, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Custom CSS for responsive table
const responsiveTableStyles = `
  @media (max-width: 640px) {
    .responsive-table th,
    .responsive-table td {
      font-size: 0.65rem; /* Smaller font size on mobile */
      padding: 0.5rem; /* Reduced padding */
    }
    .responsive-table .hide-on-mobile {
      display: none; /* Hide less critical columns on mobile */
    }
    .responsive-table th,
    .responsive-table td {
      min-width: 0; /* Remove min-width constraints */
      white-space: normal; /* Allow wrapping */
    }
  }
`;

const ITEMS_PER_PAGE = 15;

export function Scoreboard() {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: attemptedQuizzes, isLoading, error } = useQuery<StoredQuiz[]>({
    queryKey: ['attemptedGeneratedQuizzes', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser?.uid) return [];
      return getAttemptedGeneratedQuizzes(currentUser.uid);
    },
    enabled: !!currentUser?.uid,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10 text-center p-4 w-full">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <CardTitle className="text-destructive text-sm sm:text-lg">Error Loading Scoreboard</CardTitle>
        <CardDescription className="text-destructive/80 mt-1 text-xs sm:text-sm">
          Could not fetch your quiz history. Please try again later.
        </CardDescription>
      </Card>
    );
  }

  if (!attemptedQuizzes || attemptedQuizzes.length === 0) {
    return (
      <Card className="text-center p-4 sm:p-6 shadow-lg w-full">
        <Trophy className="h-10 w-10 text-muted-foreground/70 mx-auto mb-3" />
        <CardTitle className="text-base sm:text-xl">No Quiz Activity Yet</CardTitle>
        <CardDescription className="mt-1 text-muted-foreground text-xs sm:text-base">
          Complete some AI Generated Quizzes (from your notes) to see your scores and progress here.
        </CardDescription>
      </Card>
    );
  }

  const overallStats = attemptedQuizzes.reduce(
    (acc, quiz) => {
      if (quiz.attemptedAt && typeof quiz.questionsInQuiz === 'number' && typeof quiz.userCorrectAnswers === 'number') {
        acc.totalQuizzesTaken += 1;
        acc.totalItemsReviewed += quiz.questionsInQuiz;
        acc.totalCorrectAnswers += quiz.userCorrectAnswers;
      }
      return acc;
    },
    { totalQuizzesTaken: 0, totalItemsReviewed: 0, totalCorrectAnswers: 0 }
  );

  const overallAverageScore =
    overallStats.totalItemsReviewed > 0
      ? Math.round((overallStats.totalCorrectAnswers / overallStats.totalItemsReviewed) * 100)
      : 0;

  // Pagination logic
  const totalPages = Math.ceil(attemptedQuizzes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentQuizzesForPage = attemptedQuizzes.slice(startIndex, endIndex);

  return (
    <>
      <style>{responsiveTableStyles}</style>
      <div className="w-full space-y-3 sm:space-y-4">
        <Card className="shadow-lg w-full">
          <CardHeader className="pb-1 sm:pb-2 text-center sm:text-left">
            <CardTitle className="text-lg sm:text-xl md:text-2xl flex flex-col sm:flex-row items-center justify-center sm:justify-start">
              <TrendingUp className="mr-0 sm:mr-2 h-5 w-5 text-primary mb-1 sm:mb-0" />
              AI Quiz Generator: Overall Progress
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Summary of your performance in quizzes generated from your notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 sm:p-3 text-center">
            <div className="p-1.5 sm:p-2 border rounded-md bg-card shadow-sm">
              <p className="text-base sm:text-lg md:text-xl font-bold text-primary">{overallAverageScore}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Average Score</p>
            </div>
            <div className="p-1.5 sm:p-2 border rounded-md bg-card shadow-sm">
              <p className="text-base sm:text-lg md:text-xl font-bold text-foreground">{overallStats.totalItemsReviewed}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Questions Answered</p>
            </div>
            <div className="p-1.5 sm:p-2 border rounded-md bg-card shadow-sm">
              <p className="text-base sm:text-lg md:text-xl font-bold text-accent">{overallStats.totalQuizzesTaken}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Quizzes Taken</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg w-full">
          <CardHeader className="text-center sm:text-left">
            <CardTitle className="text-lg sm:text-xl md:text-2xl flex flex-col sm:flex-row items-center justify-center sm:justify-start">
              <History className="mr-0 sm:mr-2 h-5 w-5 text-primary mb-1 sm:mb-0" />
              AI Quiz Generator: Attempt History
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Detailed log of your AI-generated quiz attempts.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
            <div className="w-full overflow-x-auto rounded-md border responsive-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">
                      Date
                    </TableHead>
                    <TableHead className="text-center px-2 py-2 text-xs font-semibold whitespace-nowrap">
                      Score
                    </TableHead>
                    <TableHead className="text-center px-2 py-2 text-xs font-semibold whitespace-nowrap">
                      Items
                    </TableHead>
                    <TableHead className="text-center px-2 py-2 text-xs font-semibold whitespace-nowrap">
                      Correct
                    </TableHead>
                    <TableHead className="text-center px-2 py-2 text-xs font-semibold whitespace-nowrap">
                      Incorrect
                    </TableHead>
                    <TableHead className="text-right px-2 py-2 text-xs font-semibold hide-on-mobile whitespace-nowrap">
                      When
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentQuizzesForPage
                    .filter((quiz) => quiz.attemptedAt)
                    .map((quiz) => (
                      <TableRow key={quiz.id}>
                        <TableCell className="font-medium px-2 py-2 text-xs whitespace-nowrap">
                          {quiz.attemptedAt ? format(quiz.attemptedAt.toDate(), 'MMM d, yy, HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center px-2 py-2 text-xs whitespace-nowrap">
                          <Badge
                            variant={
                              quiz.userScore === undefined
                                ? 'outline'
                                : quiz.userScore >= 70
                                ? 'default'
                                : quiz.userScore >= 50
                                ? 'secondary'
                                : 'destructive'
                            }
                            className={cn(
                              quiz.userScore !== undefined && quiz.userScore >= 70 && 'bg-accent text-accent-foreground',
                              'text-xs py-0.5 px-1'
                            )}
                          >
                            {quiz.userScore === undefined ? 'N/A' : `${quiz.userScore}%`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center px-2 py-2 text-xs whitespace-nowrap">
                          {quiz.questionsInQuiz ?? quiz.questions.length}
                        </TableCell>
                        <TableCell className="text-center text-accent px-2 py-2 text-xs whitespace-nowrap">
                          {quiz.userCorrectAnswers ?? 'N/A'}
                        </TableCell>
                        <TableCell className="text-center text-destructive px-2 py-2 text-xs whitespace-nowrap">
                          {quiz.userIncorrectAnswers ?? 'N/A'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground px-2 py-2 text-xs hide-on-mobile whitespace-nowrap">
                          {quiz.attemptedAt ? formatDistanceToNow(quiz.attemptedAt.toDate(), { addSuffix: true }) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
             {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center space-x-2 sm:space-x-4 p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Prev
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
