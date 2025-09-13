
// app/(auth)/login/page.tsx
'use client';

import { AuthButton } from '@/components/auth/auth-button';
import { Logo } from '@/components/icons/logo';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { EffectCallback } from 'react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { EmailPasswordLoginForm } from '@/components/auth/email-password-login-form';
import { Separator } from '@/components/ui/separator';
import { useLoading } from '@/contexts/loading-context';

export default function LoginPage() {
  const { currentUser, loading: authHookLoading } = useAuth();
  const { startLoading, stopLoading, isLoading: isAppLoading } = useLoading();
  const router = useRouter();

  useEffect(() => {
    // This effect runs when auth state (currentUser, authHookLoading) or app loading state (isAppLoading) changes.
    if (!authHookLoading) { // Auth state has resolved
      if (currentUser) { // User is logged in
        if (!isAppLoading) { // If not already loading (e.g. for redirect), start loading
          startLoading();
        }
        router.replace('/dashboard');
      } else { // No user is logged in (auth resolved, currentUser is null)
        if (isAppLoading) { // If app was in a loading state (e.g., from a previous action or navigation), stop it.
          stopLoading();
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- router, startLoading, stopLoading are stable
  }, [currentUser, authHookLoading, isAppLoading]); // Added isAppLoading to ensure effect re-evaluates if it changes.

  // Show loader if Firebase Auth is still loading OR if a global app loading operation is in progress.
  const showPageLoader = authHookLoading || isAppLoading;

  if (showPageLoader) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If auth is done, no user, and no app loading, render the login form.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 h-12 w-auto" />
          <CardTitle className="text-2xl font-bold">Welcome Back to FlashFlow!</CardTitle>
          <CardDescription>Sign in to continue your learning journey.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <EmailPasswordLoginForm />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          <AuthButton /> {/* This is the Google Sign In button, it has its own loading logic */}
          
          <p className="mt-6 px-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline" onClick={startLoading}>
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

