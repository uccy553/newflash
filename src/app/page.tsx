
'use client';

import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/auth/auth-button';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { 
  Loader2, 
  LogIn, 
  Sparkles,
  BrainCircuit,
  ScanText,
  ClipboardList,
  Sigma,
  MessageSquareText,
  CheckCircle,
} from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import Image from 'next/image';
import Link from 'next/link';
import { useLoading } from '@/contexts/loading-context';
import { Card } from '@/components/ui/card';
import note from "../../public/note.jpg";
import note2 from "../../public/note2.jpg";

// New Feature Card component for cleaner code
const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <Card className="text-center p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className="mb-4 flex justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-8 w-8" />
      </div>
    </div>
    <h3 className="text-xl font-semibold text-foreground">{title}</h3>
    <p className="mt-2 text-muted-foreground">{description}</p>
  </Card>
);

export default function HomePage() {
  const { currentUser, loading: authHookLoading } = useAuth();
  const { startLoading, isLoading: isAppLoading } = useLoading();
  const router = useRouter();

  useEffect(() => {
    if (!authHookLoading && currentUser) {
      startLoading();
      router.replace('/dashboard');
    }
  }, [currentUser, authHookLoading, router, startLoading]);

  const isLoading = authHookLoading || isAppLoading;

  if (isLoading || (!authHookLoading && currentUser)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your FlashFlow experience...</p>
      </div>
    );
  }

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Flashcards',
      description: 'Generate definitions, examples, and tags for your study cards with a single click. Overcome writer\'s block and create comprehensive materials instantly.',
    },
    {
      icon: BrainCircuit,
      title: 'Spaced Repetition System',
      description: 'Our smart algorithm (SM-2) schedules card reviews at optimal intervals, transferring knowledge from short-term to long-term memory.',
    },
    {
      icon: ScanText,
      title: 'Digitize Handwritten Notes',
      description: 'Upload photos of your class notes. Our AI will extract the text, correct errors, format it, and generate a title, turning clutter into organized digital notes.',
    },
    {
      icon: ClipboardList,
      title: 'AI Quiz Generator',
      description: 'Test your knowledge by generating multiple-choice or theory-based quizzes directly from your notes or uploaded PDF documents.',
    },
    {
      icon: Sigma,
      title: 'Math Problem Solver',
      description: 'Stuck on a problem? Type it out or upload an image. Get a step-by-step solution and explanation, from algebra to calculus.',
    },
    {
      icon: MessageSquareText,
      title: 'AI Chat Tutor',
      description: 'Have a question? Chat with "Flash", your AI tutor, for help with various subjects, explanations, or just to get a different perspective.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="w-full border-b bg-card shadow-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo className="h-10 w-auto" />
          <AuthButton />
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="container mx-auto flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24 lg:py-32">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            The All-in-One <span className="text-primary">AI Study Platform</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground sm:text-xl md:text-2xl">
            FlashFlow combines AI-powered tools like note digitization, quiz generation, and math solving with proven learning techniques like spaced repetition to help you study smarter, not harder.
          </p>
          <div className="mt-10">
            <Link href="/login" passHref>
              <Button variant="default" size="lg" className="shadow-md hover:shadow-lg transition-shadow duration-300">
                <LogIn className="mr-2 h-5 w-5" />
                Start Learning for Free
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Grid Section */}
        <section id="features" className="bg-secondary py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Everything You Need to Succeed</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">FlashFlow is packed with features designed for modern students.</p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Feature Spotlight Section */}
        <section className="py-20 sm:py-24">
            <div className="container mx-auto px-4 space-y-24">
                {/* Spotlight 1: Digitize Notes */}
                <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="md:w-1/2">
                        <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">From Paper to Pixel-Perfect</h3>
                        <p className="mt-4 text-lg text-muted-foreground">Tired of messy notebooks? Snap a photo of your handwritten notes, and let our AI turn them into perfectly formatted, editable, and searchable digital text. It even suggests a title!</p>
                        <ul className="mt-6 space-y-3 text-muted-foreground">
                            <li className="flex items-start"><CheckCircle className="h-5 w-5 text-accent mr-3 mt-1 shrink-0" /><span>Accurate text extraction with OCR technology.</span></li>
                            <li className="flex items-start"><CheckCircle className="h-5 w-5 text-accent mr-3 mt-1 shrink-0" /><span>Automatic grammar correction and formatting.</span></li>
                            <li className="flex items-start"><CheckCircle className="h-5 w-5 text-accent mr-3 mt-1 shrink-0" /><span>Organize digitized notes into categories alongside your typed notes.</span></li>
                        </ul>
                    </div>
                    <div className="md:w-1/2">
                        <Image 
                            src={note}
                            alt="Animation or image showing a physical note turning into a digital one" 
                            width={600} 
                            height={400} 
                            className="rounded-lg shadow-2xl"
                            data-ai-hint="handwritten notes digital"
                        />
                    </div>
                </div>

                {/* Spotlight 2: AI Quiz Generator */}
                <div className="flex flex-col md:flex-row-reverse items-center gap-12">
                    <div className="md:w-1/2">
                        <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Test Your Knowledge, Instantly</h3>
                        <p className="mt-4 text-lg text-muted-foreground">Don't just read your notes—master them. Generate custom quizzes from any of your notes or even an uploaded PDF. Choose between multiple-choice and theory questions to truly challenge yourself.</p>
                         <ul className="mt-6 space-y-3 text-muted-foreground">
                            <li className="flex items-start"><CheckCircle className="h-5 w-5 text-accent mr-3 mt-1 shrink-0" /><span>Works with your notes or any PDF document.</span></li>
                            <li className="flex items-start"><CheckCircle className="h-5 w-5 text-accent mr-3 mt-1 shrink-0" /><span>Choose between Objective (MCQ) and Theory (written) question styles.</span></li>
                            <li className="flex items-start"><CheckCircle className="h-5 w-5 text-accent mr-3 mt-1 shrink-0" /><span>Get instant feedback and explanations to fill knowledge gaps.</span></li>
                        </ul>
                    </div>
                    <div className="md:w-1/2">
                        <Image 
                            src={note2}
                            alt="Screenshot of the AI Quiz Generator interface" 
                            width={600} 
                            height={400} 
                            className="rounded-lg shadow-2xl"
                            data-ai-hint="quiz interface"
                        />
                    </div>
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="bg-secondary">
            <div className="container mx-auto px-4 py-16 text-center sm:py-24">
                 <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Ready to Revolutionize Your Studying?</h2>
                <p className="mt-4 text-lg text-muted-foreground">Join thousands of students who study smarter with FlashFlow. Your A+ is just a click away.</p>
                <div className="mt-8">
                    <Link href="/signup" passHref>
                    <Button variant="default" size="lg" className="shadow-md hover:shadow-lg transition-shadow duration-300" onClick={startLoading}>
                        Sign Up for Free
                    </Button>
                    </Link>
                </div>
            </div>
        </section>
      </main>
    </div>
  );
}
