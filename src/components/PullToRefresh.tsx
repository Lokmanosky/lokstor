'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 65; // px of downward pull to trigger refresh

export default function PullToRefresh() {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only activate when at the very top of the page
      if (window.scrollY <= 2) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      } else {
        isPulling.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      // Downward pull at top of the page
      if (diff > 0 && window.scrollY <= 2) {
        // Damped rubber-band pull distance
        const damped = Math.min(THRESHOLD + 20, Math.pow(diff, 0.85));
        setPullY(damped);
      } else {
        setPullY(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullY >= THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullY(50); // Hold at spinner height
        
        // Haptic feedback if supported by browser/device
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(20); } catch (_) {}
        }

        // Trigger page refresh
        setTimeout(() => {
          window.location.reload();
        }, 350);
      } else {
        setPullY(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullY, isRefreshing]);

  if (pullY === 0 && !isRefreshing) return null;

  const progress = Math.min(1, pullY / THRESHOLD);
  const rotation = isRefreshing ? 0 : progress * 360;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex justify-center transition-transform duration-150 ease-out md:hidden"
      style={{
        transform: `translateY(${Math.max(12, pullY - 15)}px)`,
        opacity: Math.max(0.3, progress)
      }}
      aria-hidden="true"
    >
      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 shadow-xl border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-emerald-500">
        <RefreshCw 
          className={`w-5 h-5 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: isRefreshing ? undefined : `rotate(${rotation}deg)` }}
        />
      </div>
    </div>
  );
}

