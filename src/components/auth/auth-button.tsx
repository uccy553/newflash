
'use client';

import { auth, googleAuthProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/contexts/loading-context';
import { Loader2 } from 'lucide-react';


export function AuthButton() {
  const { currentUser, loading: authHookLoading } = useAuth();
  const { startLoading, stopLoading, isLoading: isAppLoading } = useLoading();
  const router = useRouter();

  const handleSignIn = async () => {
    startLoading();
    try {
      await signInWithPopup(auth, googleAuthProvider);
      // Navigation to dashboard will trigger stopLoading via layout effect
      router.push('/dashboard');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      stopLoading(); // Stop loading on error
      // TODO: Show error toast
    }
  };

  const handleSignOut = async () => {
    startLoading();
    try {
      await signOut(auth);
      // Navigation to home will trigger stopLoading via layout effect
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      stopLoading(); // Stop loading on error
      // TODO: Show error toast
    }
  };

  const isLoading = authHookLoading || isAppLoading;

  if (isLoading && !currentUser) { // Show loading only if not already logged in and an operation is pending
    return <Button variant="outline" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
  }


  if (currentUser) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User Avatar'} />
                <AvatarFallback>
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : <UserIcon />}
                </AvatarFallback>
              </Avatar>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{currentUser.displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={handleSignIn} variant="default" className="shadow-sm" disabled={isLoading}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      <LogIn className="mr-2 h-4 w-4" />
      Sign In with Google
    </Button>
  );
}
