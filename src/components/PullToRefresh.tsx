'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 70; // px of actual downward drag to trigger refresh
const MIN_DRAG_TRIGGER = 35; // Deadband: micro-movements (<35px) are completely ignored to ensure taps never get swallowed

export default function PullToRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const isPulling = useRef(false);
  const currentPull = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resetIndicator = () => {
      isPulling.current = false;
      currentPull.current = 0;
      if (containerRef.current) {
        containerRef.current.style.display = 'none';
        containerRef.current.style.transform = 'translateY(-60px)';
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      // Never intercept touches on clickable or interactive elements
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, a, input, select, textarea, [role="button"], [tabindex], label')) {
        isPulling.current = false;
        return;
      }

      // Only prepare if at the very top of the page
      if (window.scrollY <= 2) {
        startY.current = e.touches[0].clientY;
        startX.current = e.touches[0].clientX;
        currentPull.current = 0;
      } else {
        isPulling.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || window.scrollY > 2) {
        if (isPulling.current) resetIndicator();
        return;
      }

      const touch = e.touches[0];
      const diffY = touch.clientY - startY.current;
      const diffX = touch.clientX - startX.current;

      // If user is swiping horizontally (like carousel, category tabs, etc.), cancel immediately
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (isPulling.current) resetIndicator();
        return;
      }

      // If user has intentionally pulled downwards past the deadband threshold
      if (diffY > MIN_DRAG_TRIGGER) {
        isPulling.current = true;
        const activePull = diffY - MIN_DRAG_TRIGGER;
        const damped = Math.min(PULL_THRESHOLD + 20, Math.pow(activePull, 0.85));
        currentPull.current = damped;

        // Direct DOM mutation for silky smooth 60fps performance without triggering React re-renders during touch
        if (containerRef.current) {
          containerRef.current.style.display = 'flex';
          containerRef.current.style.transform = `translateY(${Math.max(10, damped - 15)}px)`;
          containerRef.current.style.opacity = `${Math.min(1, Math.max(0.3, damped / PULL_THRESHOLD))}`;
        }
        if (iconRef.current) {
          const rotation = (damped / PULL_THRESHOLD) * 360;
          iconRef.current.style.transform = `rotate(${rotation}deg)`;
        }
      } else if (isPulling.current && diffY <= MIN_DRAG_TRIGGER) {
        resetIndicator();
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      const pull = currentPull.current;
      isPulling.current = false;

      if (pull >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        if (containerRef.current) {
          containerRef.current.style.display = 'flex';
          containerRef.current.style.transform = 'translateY(40px)';
          containerRef.current.style.opacity = '1';
        }
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(25); } catch (_) {}
        }
        setTimeout(() => {
          window.location.reload();
        }, 350);
      } else {
        resetIndicator();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []); // Run ONCE on mount, NEVER rebind listeners during touch interactions

  return (
    <div
      ref={containerRef}
      style={{
        display: isRefreshing ? 'flex' : 'none',
        transform: isRefreshing ? 'translateY(40px)' : 'translateY(-60px)'
      }}
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none justify-center transition-transform duration-150 ease-out md:hidden"
      aria-hidden="true"
    >
      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 shadow-xl border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-emerald-500">
        <RefreshCw
          ref={iconRef}
          className={`w-5 h-5 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
        />
      </div>
    </div>
  );
}
