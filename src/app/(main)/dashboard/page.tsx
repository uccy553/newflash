
'use client'; 

import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { LanguageInsightsStats } from '@/components/dashboard/language-insights-stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, BookOpen, ListChecks, BarChart3, Sparkles, ClipboardList } from 'lucide-react';
import Image from 'next/image';
import { useLoading } from '@/contexts/loading-context'; 

export default function DashboardPage() {
  const { startLoading } = useLoading(); 

  const quickActions = [
    { href: '/flashcards/new', label: 'New Study Card', icon: PlusCircle, description: 'Add new terms, concepts, or questions.' },
    { href: '/flashcards', label: 'My Study Cards', icon: BookOpen, description: 'Browse and manage your study cards.' },
    { href: '/quiz', label: 'Due Cards Review', icon: ListChecks, description: 'Review cards based on spaced repetition.' },
    { href: '/quiz-generator', label: 'Generate Quiz', icon: ClipboardList, description: 'Create a quiz from your notes.' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Welcome to FlashFlow!</h1>
          <p className="text-lg text-muted-foreground">Your personal space for effective learning.</p>
        </div>
        <Link href="/flashcards/new" passHref>
          <Button size="lg" className="shadow-md hover:shadow-lg transition-shadow" onClick={startLoading}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Study Card
          </Button>
        </Link>
      </div>

      <DashboardOverview />

      <section>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link href={action.href} key={action.label} passHref>
              <Card 
                className="h-full transform transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-xl flex flex-col"
                onClick={startLoading} 
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">{action.label}</CardTitle>
                  <action.icon className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
         <Card className="shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                <CardTitle className="text-2xl flex items-center"><Sparkles className="mr-3 h-7 w-7 text-primary" /> Learning Insights</CardTitle>
                <CardDescription className="text-base">Track your journey to mastery with detailed stats.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <LanguageInsightsStats />
                 <div className="mt-8 rounded-lg overflow-hidden">
                    <Image
                      src="https://picsum.photos/1200/400"
                      alt="Stylized representation of learning and progress charts"
                      width={1200}
                      height={400}
                      className="object-cover"
                      data-ai-hint="learning progress chart"
                      priority
                    />
                 </div>
            </CardContent>
         </Card>
      </section>
    </div>
  );
}
