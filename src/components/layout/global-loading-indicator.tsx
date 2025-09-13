
'use client';

import { useLoading } from '@/contexts/loading-context';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect, useRef } from 'react';

export function GlobalLoadingIndicator() {
  const { isLoading } = useLoading();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  
  // To store timeouts/intervals
  const fillIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timers when isLoading changes or component unmounts
    const clearTimers = () => {
      if (fillIntervalRef.current) clearInterval(fillIntervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };

    clearTimers();

    if (isLoading) {
      setVisible(true);
      setProgress(0); // Reset progress to 0 to start filling effect

      let currentProgress = 0;
      fillIntervalRef.current = setInterval(() => {
        currentProgress += 5; // Adjust increment for speed (e.g., 5 for 18 steps to 90)
        if (currentProgress >= 90) { // Cap at 90% while loading
          setProgress(90);
          if (fillIntervalRef.current) clearInterval(fillIntervalRef.current);
        } else {
          setProgress(currentProgress);
        }
      }, 80); // Adjust interval time for speed (e.g., 18 * 80ms = ~1.44s to reach 90%)
    } else {
      // If it was loading (visible)
      if (visible) {
        // if (fillIntervalRef.current) clearInterval(fillIntervalRef.current); // Already cleared above
        setProgress(100); // Animate to 100%

        // Set a timeout to hide the progress bar after completion animation
        hideTimeoutRef.current = setTimeout(() => {
          setVisible(false);
          setProgress(0); // Reset progress for the next time
        }, 500); // Duration for the 100% fill CSS transition + brief pause
      }
    }

    // Cleanup function to clear timers when the component unmounts or before the effect re-runs due to isLoading change
    return () => {
      clearTimers();
    };
  }, [isLoading]); // Effect runs when isLoading changes

  // This secondary useEffect handles cleanup specifically on component unmount.
  // It's good practice, though the cleanup in the main effect should also cover it.
  useEffect(() => {
    return () => {
      if (fillIntervalRef.current) clearInterval(fillIntervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);


  if (!visible) {
    return null;
  }

  return (
    <div 
      className="fixed top-16 left-0 w-full z-50 h-1" // h-16 assumes header height is 4rem (64px)
      role="progressbar" 
      aria-valuenow={progress} 
      aria-busy={isLoading} 
      aria-live="polite"
    >
      {/* The Progress component's track is bg-secondary and indicator is bg-primary by default */}
      <Progress value={progress} className="h-1 rounded-none" />
    </div>
  );
}
