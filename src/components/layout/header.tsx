
'use client';

import Link from 'next/link';
import { Logo } from '@/components/icons/logo';
import { AuthButton } from '@/components/auth/auth-button';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme'; // Import useTheme

export function Header() {
  const { toggleSidebar, isMobile } = useSidebar();
  const { theme, toggleTheme } = useTheme(); // Use the theme hook

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {isMobile && (
             <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
               <Menu className="h-6 w-6" />
             </Button>
           )}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Logo className="h-8 w-auto" />
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
