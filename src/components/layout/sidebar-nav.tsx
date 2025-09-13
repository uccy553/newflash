
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader as CustomSidebarHeader, 
  SidebarFooter,
  SidebarContent,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Languages, 
  AudioWaveform,
  NotebookText,
  ClipboardList, 
  Sigma, 
  ListChecks,
  X, 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoading } from '@/contexts/loading-context';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/flashcards/new', label: 'New Card', icon: PlusCircle },
  { href: '/flashcards', label: 'All Cards', icon: BookOpen },
  { href: '/quiz', label: 'Due Cards Review', icon: ListChecks },
  { href: '/quiz-generator', label: 'Quiz Generator', icon: ClipboardList }, 
  { href: '/scoreboard', label: 'Scores', icon: BarChart3 },
  { href: '/intonation-analyzer', label: 'Intonation Analyzer', icon: AudioWaveform },
  { href: '/math-solver', label: 'Math Solver', icon: Sigma },
  { href: '/notes', label: 'My Notes', icon: NotebookText },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { open, toggleSidebar, isMobile, openMobile, setOpenMobile } = useSidebar();
  const { startLoading } = useLoading();

  const handleItemClick = () => {
    startLoading(); 
    if (isMobile && openMobile) {
      setOpenMobile(false);
    }
  };

  const renderNavItems = (isCollapsed: boolean) => (
    <SidebarMenu>
      {navItems.map((item) => {
        const isExactMatch = pathname === item.href;
        
        let isHierarchicalMatch = false;
        if (!isExactMatch && item.href !== '/dashboard' && item.href !== '/') {
          // Check if pathname starts with item.href + '/' (e.g., item.href = "/flashcards", pathname = "/flashcards/edit/123")
          if (pathname.startsWith(item.href + '/')) {
            // Check if the current pathname is an exact match for another specific navItem.
            // This prevents a "parent" (e.g., /flashcards) from being active if a more specific
            // item (e.g., /flashcards/new, if /flashcards/new were considered a child for highlighting)
            // is the actual current path.
            const isPathExactlyAnotherNavItem = navItems.some(
              otherItem => otherItem.href === pathname && otherItem.href !== item.href
            );
            if (!isPathExactlyAnotherNavItem) {
              isHierarchicalMatch = true;
            }
          }
        }
        const isActive = isExactMatch || isHierarchicalMatch;

        return (
          <SidebarMenuItem key={item.href} onClick={handleItemClick}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                className="justify-start"
              >
                <item.icon className={cn("h-5 w-5", isCollapsed && "mx-auto")} />
                {!isCollapsed && <span>{item.label}</span>}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
  
  const sidebarContent = (isCollapsed: boolean, isMobileSheet: boolean) => (
    <>
      {isMobileSheet ? (
        <SheetHeader className="p-4 border-b flex flex-row items-center justify-between">
          <SheetTitle>
            <Link href="/dashboard" className="flex items-center" onClick={handleItemClick}>
              <Logo className="h-8 w-auto" />
            </Link>
          </SheetTitle>
           {/* SheetClose is implicitly provided by SheetContent */}
        </SheetHeader>
      ) : (
        <CustomSidebarHeader className={cn("p-4", isCollapsed && "p-2 justify-center")}>
          <Link href="/dashboard" className="flex items-center" onClick={handleItemClick}>
            {isCollapsed ? (
              <Languages className="h-8 w-8 text-primary" /> 
            ) : (
              <Logo className="h-8 w-auto" />
            )}
          </Link>
          {!isMobile && ( 
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(isCollapsed && "hidden")}>
              {open ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
          )}
        </CustomSidebarHeader>
      )}
      <SidebarContent className="flex-grow p-2">
        {renderNavItems(isCollapsed)}
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem onClick={handleItemClick}>
             <Link href="/settings" passHref legacyBehavior>
              <SidebarMenuButton
                isActive={pathname === '/settings'}
                tooltip={isCollapsed ? "Settings" : undefined}
                aria-label="Settings"
                className="justify-start"
              >
                <Settings className={cn("h-5 w-5", isCollapsed && "mx-auto")} />
                {!isCollapsed && <span>Settings</span>}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );

  if (isMobile) {
    return <Sidebar collapsible="offcanvas">{sidebarContent(false, true)}</Sidebar>;
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {sidebarContent(!open, false)}
    </Sidebar>
  );
}
