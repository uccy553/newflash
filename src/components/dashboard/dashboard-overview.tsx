'use client';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import type { Flashcard } from '@/types';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, BookCopy, Clock, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchDashboardStats(userId: string) {
  const flashcardsRef = collection(db, 'users', userId, 'flashcards');
  
  // Total flashcards
  const allCardsQuery = query(flashcardsRef);
  const allCardsSnapshot = await getDocs(allCardsQuery);
  const totalCards = allCardsSnapshot.size;

  // Cards due today
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  const dueCardsQuery = query(flashcardsRef, where('nextReview', '<=', Timestamp.fromDate(today)));
  const dueCardsSnapshot = await getDocs(dueCardsQuery);
  const dueTodayCount = dueCardsSnapshot.size;
  
  // For simplicity, quiz stats are not calculated here yet. This would typically involve another query.
  // This is a placeholder for average score.
  const averageScore = 0; // Placeholder

  return { totalCards, dueTodayCount, averageScore };
}

export function DashboardOverview() {
  const { currentUser } = useAuth();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats', currentUser?.uid],
    queryFn: () => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return fetchDashboardStats(currentUser.uid);
    },
    enabled: !!currentUser?.uid,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
              <Skeleton className="mt-1 h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">Error Loading Stats</CardTitle>
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-destructive">Could not load dashboard statistics. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }
  
  const overviewItems = [
    { title: 'Total Flashcards', value: stats?.totalCards ?? 0, icon: BookCopy, description: 'All cards in your collection' },
    { title: 'Due Today', value: stats?.dueTodayCount ?? 0, icon: Clock, description: 'Cards scheduled for review' },
    { title: 'Average Score', value: `${stats?.averageScore ?? 0}%`, icon: BarChart, description: 'Your quiz performance (coming soon)' },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {overviewItems.map((item) => (
        <Card key={item.title} className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
            <item.icon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{item.value}</div>
            <p className="text-xs text-muted-foreground pt-1">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
