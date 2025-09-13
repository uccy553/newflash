
'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode} from 'react';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { GlobalLoadingIndicator } from '@/components/layout/global-loading-indicator';
import { useLoading } from '@/contexts/loading-context';
import { ChatbotFAB } from '@/components/chatbot/chatbot-fab';
import { ChatbotPanel } from '@/components/chatbot/chatbot-panel';

export default function MainAppLayout({ children }: { children: ReactNode }) {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { stopLoading } = useLoading();
  const pathname = usePathname();
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    // Stop loading indicator when route navigation completes
    stopLoading();
  }, [pathname, stopLoading]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    // This state should ideally not be reached due to the redirect,
    // but it's a safeguard.
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex w-full min-h-screen flex-col bg-background">
        <Header />
        <GlobalLoadingIndicator />
        <div className="flex flex-1 w-full"> {/* Ensured w-full here */}
          <SidebarNav />
          <SidebarInset> {/* SidebarInset handles its own width based on sidebar state */}
            <main className="flex-1 p-4 md:p-6 lg:p-8 w-full overflow-x-hidden"> {/* Added w-full and overflow-x-hidden */}
              {children}
            </main>
          </SidebarInset>
        </div>
        {/* Chatbot components */}
        <ChatbotFAB onClick={() => setIsChatPanelOpen(true)} />
        <ChatbotPanel isOpen={isChatPanelOpen} onClose={() => setIsChatPanelOpen(false)} />
      </div>
    </SidebarProvider>
  );
}
