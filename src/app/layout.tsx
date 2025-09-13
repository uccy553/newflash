
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
// Removed: import { GeistMono } from 'geist/font/mono'; 
import './globals.css';
import { AppProviders } from '@/providers/app-providers';
import { cn } from '@/lib/utils';

const geistSans = GeistSans; // Using the direct import as per latest Geist guidelines
// Removed: const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'FlashFlow - Your Smart Study Companion',
  description: 'Your smart learning companion. Create flashcards, take notes, get AI assistance, and master any subject with spaced repetition.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen flex flex-col bg-background font-sans antialiased', // Added flex flex-col
          geistSans.variable
          // Removed: geistMono.variable
        )}
      >
        <div className="flex-grow"> {/* Wrapper for main content to allow footer to stick to bottom */}
          <AppProviders>
            {children} 
            {/* Toaster is rendered by AppProviders after its children */}
          </AppProviders>
        </div>
        <footer className="w-full border-t bg-card"> {/* w-full for explicitness */}
          <div className="container mx-auto px-4 py-8 text-center text-sm text-foreground sm:px-6 lg:px-8"> {/* Changed text-black to text-foreground */}
            &copy; {new Date().getFullYear()} all rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}

