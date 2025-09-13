
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, BookText, CalendarPlus, FileQuestion, Percent, Activity, Target, TrendingUp, TrendingDown, Info, Zap, Lightbulb } from 'lucide-react';
import { getFlashcardsCountByPeriod, getAttemptedGeneratedQuizzes, getFlashcards, getRecentActivityLogs } from '@/lib/firestore-client';
import type { StoredQuiz, ActivityLogEntry, TopicPerformanceStat, GeneratePersonalizedTipsInput } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays, parseISO, startOfToday } from 'date-fns';
import { handleGeneratePersonalizedTipsAction } from '@/app/actions/generate-personalized-tips-action';
import { useToast } from '@/hooks/use-toast';


// Helper to calculate streak
const calculateCurrentStreak = (activityLogs: ActivityLogEntry[]): number => {
  if (!activityLogs || activityLogs.length === 0) {
    // console.log("[calculateCurrentStreak] No activity logs, streak is 0");
    return 0;
  }

  const sortedLogs = activityLogs.sort((a, b) => b.id!.localeCompare(a.id!));
  // console.log("[calculateCurrentStreak] Sorted activity logs:", sortedLogs.map(log => log.id));
  const logDatesSet = new Set(sortedLogs.map(log => log.id!));
  // console.log("[calculateCurrentStreak] Log dates set:", logDatesSet);

  let simplerStreak = 0;
  let currentDate = startOfToday();

  if (logDatesSet.has(formatDateForId(currentDate))) {
    simplerStreak = 1;
    // console.log(`[calculateCurrentStreak] Activity found for ${formatDateForId(currentDate)}, streak is now ${simplerStreak}`);
    for (let i = 1; i < 365; i++) { // Iterate up to a year for practical limit
      currentDate = subDays(startOfToday(), i);
      if (logDatesSet.has(formatDateForId(currentDate))) {
        simplerStreak++;
        // console.log(`[calculateCurrentStreak] Activity found for ${formatDateForId(currentDate)}, streak is now ${simplerStreak}`);
      } else {
        // console.log(`[calculateCurrentStreak] No activity for ${formatDateForId(currentDate)}, streak broken at ${simplerStreak}`);
        break;
      }
    }
  } else {
    // console.log(`[calculateCurrentStreak] No activity for today (${formatDateForId(currentDate)}), streak is 0`);
  }
  // console.log("[calculateCurrentStreak] Final calculated streak:", simplerStreak);
  return simplerStreak;
};

const formatDateForId = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const subDays = (date: Date, amount: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() - amount);
  return newDate;
};


async function fetchLanguageInsights(userId: string) {
  const [
    newCardsLast7Days,
    newCardsLast30Days,
    allFlashcards,
    attemptedGeneratedQuizzes,
    recentActivity
  ] = await Promise.all([
    getFlashcardsCountByPeriod(userId, 7),
    getFlashcardsCountByPeriod(userId, 30),
    getFlashcards(userId), // For total study cards count
    getAttemptedGeneratedQuizzes(userId), // For AI quiz generator stats
    getRecentActivityLogs(userId, 60) // Fetch last 60 days of activity for streak
  ]);

  const totalQuizzesFromNotes = attemptedGeneratedQuizzes.length;
  let averageScoreFromNotes = 0;
  if (totalQuizzesFromNotes > 0) {
    const totalScoreSum = attemptedGeneratedQuizzes.reduce((sum, quiz) => sum + (quiz.userScore ?? 0), 0);
    averageScoreFromNotes = Math.round(totalScoreSum / totalQuizzesFromNotes);
  }
  const totalStudyCards = allFlashcards.length;

  const topicPerformance: Record<string, { totalScore: number; quizCount: number; }> = {};
  attemptedGeneratedQuizzes.forEach(quiz => {
    const category = quiz.noteCategory?.trim();
    if (category && category !== '' && quiz.attemptedAt && typeof quiz.userScore === 'number') {
      if (!topicPerformance[category]) {
        topicPerformance[category] = { totalScore: 0, quizCount: 0 };
      }
      topicPerformance[category].totalScore += quiz.userScore;
      topicPerformance[category].quizCount += 1;
    }
  });

  const MIN_QUIZZES_FOR_MASTERY_ANALYSIS = 2; // Min quizzes to consider a topic for mastery analysis
  const EXCELLING_THRESHOLD = 80;
  const NEEDS_PRACTICE_THRESHOLD = 70;

  const excellingTopics: TopicPerformanceStat[] = [];
  const needsPracticeTopics: TopicPerformanceStat[] = [];

  Object.entries(topicPerformance).forEach(([categoryName, stats]) => {
    if (stats.quizCount >= MIN_QUIZZES_FOR_MASTERY_ANALYSIS) {
      const avgScore = Math.round(stats.totalScore / stats.quizCount);
      if (avgScore >= EXCELLING_THRESHOLD) {
        excellingTopics.push({ name: categoryName, averageScore: avgScore, quizzesTaken: stats.quizCount });
      } else if (avgScore < NEEDS_PRACTICE_THRESHOLD) {
        needsPracticeTopics.push({ name: categoryName, averageScore: avgScore, quizzesTaken: stats.quizCount });
      }
    }
  });

  excellingTopics.sort((a, b) => b.averageScore - a.averageScore || a.name.localeCompare(b.name));
  needsPracticeTopics.sort((a, b) => a.averageScore - b.averageScore || a.name.localeCompare(b.name));

  const currentStreak = calculateCurrentStreak(recentActivity);
  // console.log("[fetchLanguageInsights] Calculated currentStreak:", currentStreak);

  // Prepare input for personalized tips AI
  const tipsInput: GeneratePersonalizedTipsInput = {
    userId,
    excellingTopics,
    needsPracticeTopics,
    currentStreak,
    newCardsLast7Days,
    averageQuizScore: averageScoreFromNotes,
    totalStudyCards,
  };

  let personalizedTips: string[] = [];
  try {
    // console.log("[fetchLanguageInsights] Calling handleGeneratePersonalizedTipsAction with input:", tipsInput);
    const tipsResult = await handleGeneratePersonalizedTipsAction(tipsInput);
    if (tipsResult.success && tipsResult.data?.tips) {
      personalizedTips = tipsResult.data.tips;
      // console.log("[fetchLanguageInsights] Received personalized tips:", personalizedTips);
    } else {
      // console.warn("[fetchLanguageInsights] Failed to generate personalized tips:", tipsResult.error);
    }
  } catch (tipError) {
    // console.error("[fetchLanguageInsights] Error calling tips action:", tipError);
  }
  
  // console.log("[fetchLanguageInsights] Returning insights object with currentStreak:", currentStreak, "and tips:", personalizedTips);
  return {
    totalStudyCards,
    newCardsLast7Days,
    newCardsLast30Days,
    totalQuizzes: totalQuizzesFromNotes, // Renamed for clarity - quizzes from notes
    averageQuizScore: averageScoreFromNotes, // Avg score from quizzes from notes
    topicMastery: {
      excellingTopics,
      needsPracticeTopics,
    },
    currentStreak,
    personalizedTips,
  };
}

export function LanguageInsightsStats() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { data: insights, isLoading, error, refetch } = useQuery({
    queryKey: ['languageInsights', currentUser?.uid],
    queryFn: () => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return fetchLanguageInsights(currentUser.uid);
    },
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    // Add retry for transient errors, but not too aggressively
    retry: (failureCount, error: any) => {
        if (error.message?.includes("insufficient permissions")) return false; // Don't retry permission errors
        return failureCount < 2;
    },
    onError: (err) => {
      toast({
        title: "Error Loading Insights",
        description: `Could not fully load learning insights: ${(err as Error).message}. Some data may be missing.`,
        variant: "destructive",
        duration: 7000,
      });
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {[...Array(7)].map((_, i) => ( // Increased for tips placeholder
          <Card key={i} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
        <Card className="md:col-span-2 lg:col-span-3 shadow-sm mt-4">
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !insights) { // Only show full error if no data at all could be loaded
    return (
      <Card className="border-destructive bg-destructive/10 mt-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">Error Loading All Insights</CardTitle>
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-destructive">Could not load learning insights. Error: {(error as Error).message}</p>
          <Button onClick={() => refetch()} variant="destructive" size="sm" className="mt-2">Try Again</Button>
        </CardContent>
      </Card>
    );
  }
  
  const insightItems = [
    { title: 'Total Study Cards', value: insights?.totalStudyCards ?? 0, icon: BookText, unit: 'cards' },
    { title: 'New Cards This Week', value: insights?.newCardsLast7Days ?? 0, icon: CalendarPlus, unit: 'additions' },
    { title: 'New Cards This Month', value: insights?.newCardsLast30Days ?? 0, icon: CalendarPlus, unit: 'additions' },
    { title: 'AI Quizzes Taken (from Notes)', value: insights?.totalQuizzes ?? 0, icon: FileQuestion, unit: 'sessions' },
    { title: 'Avg. AI Quiz Score (from Notes)', value: insights?.averageQuizScore ?? 0, icon: Percent, unit: '%' },
    { title: 'Current Streak', value: insights?.currentStreak ?? 0, icon: Zap, unit: insights?.currentStreak === 1 ? 'day' : 'days' },
  ];

  const { excellingTopics = [], needsPracticeTopics = [] } = insights?.topicMastery || {};
  const personalizedTips = insights?.personalizedTips || [];

  const renderTopicList = (topics: TopicPerformanceStat[], title: string, icon: React.ElementType, badgeVariant: "default" | "secondary" | "destructive" | "outline" | null | undefined = "secondary", iconColor?: string) => {
    const IconComponent = icon;
    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold flex items-center mb-3">
          <IconComponent className={cn("mr-2 h-5 w-5", iconColor || "text-primary")} />
          {title}
        </h4>
        {topics.length > 0 ? (
          <ul className="space-y-2 pl-1">
            {topics.map(topic => (
              <li key={topic.name} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors">
                <span className="font-medium text-foreground text-sm sm:text-base">{topic.name}</span>
                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                  <Badge variant={badgeVariant} className="text-xs">
                    Avg: {topic.averageScore}%
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {topic.quizzesTaken} quiz{topic.quizzesTaken > 1 ? 'zes' : ''}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center text-sm text-muted-foreground p-3 rounded-md border border-dashed">
            <Info className="mr-2 h-4 w-4 shrink-0" />
            No topics with enough quiz data to display here yet. Keep taking quizzes in different categories!
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6 space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {insightItems.map(item => (
          <Card key={item.title} className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <item.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {item.value}
                {item.unit === '%' ? '%' : ''}
              </div>
              {item.unit !== '%' && <p className="text-xs text-muted-foreground pt-1">{item.unit}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Activity className="mr-3 h-6 w-6 text-primary" />Your Learning Journey</CardTitle>
          <CardDescription>Track your progress and identify areas for growth based on your AI quiz performance.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-sm">
          
          {renderTopicList(excellingTopics, "Topics You're Excelling In", TrendingUp, "default", "text-accent")}
          {renderTopicList(needsPracticeTopics, "Topics Needing More Practice", TrendingDown, "destructive", "text-destructive")}

          <div className="pt-4 mt-4 border-t">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">Personalized AI Tips:</h4>
                {personalizedTips.length > 0 ? (
                  <ul className="list-disc space-y-1.5 pl-5 text-foreground/90">
                    {personalizedTips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                ) : (
                  isLoading ? ( // Show skeleton only if insights are still loading
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                     </div>
                  ) : (
                    <p className="text-muted-foreground">AI is analyzing your progress... Check back soon for personalized tips, or try taking more quizzes!</p>
                  )
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
