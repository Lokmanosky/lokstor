'use client';

import { LogOut, Bell, Menu, Sun, Moon } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface Props { sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void; }

export default function AdminTopBar({ sidebarOpen, setSidebarOpen }: Props) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check initial theme safely on client
    const saved = localStorage.getItem('adminTheme') || 'light';
    setTheme(saved);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), where('read', '==', false));
    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size));
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('adminTheme', newTheme);
  };

  return (
    <div className="sticky top-0 z-30 h-16 bg-[var(--admin-card)] border-b border-[var(--admin-border)] px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-medium text-[var(--admin-text)] text-sm">لوحة التحكم</h2>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={toggleTheme} className="p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] rounded-md transition-colors">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        
        <button className="relative p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] rounded-md transition-colors">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--admin-danger)] rounded-full border border-[var(--admin-card)]" />
          )}
        </button>

        <div className="h-4 w-px bg-[var(--admin-border)]" />

        <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج</span>
        </button>
      </div>
    </div>
  );
}
