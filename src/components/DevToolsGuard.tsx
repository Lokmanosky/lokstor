'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Scissors, Copy, Clipboard } from 'lucide-react';

/*
 * ملاحظة أمنية هامة:
 * هذا المكون مجرد رادع بسيط للمستخدم العادي.
 * لا يُعدّ حماية أمنية حقيقية — الحماية الفعلية تبقى في API Routes على السيرفر.
 */

interface MenuPos { x: number; y: number }

export default function DevToolsGuard() {
  const [menu, setMenu] = useState<MenuPos | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isProd = process.env.NODE_ENV === 'production';

  // Close menu on outside click / scroll
  useEffect(() => {
    const close = () => setMenu(null);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
    };
  }, []);

  useEffect(() => {
    if (!isProd) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      // Determine safe position so menu doesn't overflow viewport
      const menuW = 160;
      const menuH = 130;
      let x = e.clientX;
      let y = e.clientY;
      if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
      if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;

      setMenu({ x, y });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.ctrlKey && e.key.toLowerCase() === 'u') e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProd]);

  const handleCut = useCallback(async () => {
    const sel = window.getSelection()?.toString() || '';
    if (sel) {
      await navigator.clipboard.writeText(sel).catch(() => document.execCommand('cut'));
      window.getSelection()?.deleteFromDocument();
    }
    setMenu(null);
  }, []);

  const handleCopy = useCallback(async () => {
    const sel = window.getSelection()?.toString() || '';
    if (sel) {
      await navigator.clipboard.writeText(sel).catch(() => document.execCommand('copy'));
    }
    setMenu(null);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        el.value = el.value.slice(0, start) + text + el.value.slice(end);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch {
      document.execCommand('paste');
    }
    setMenu(null);
  }, []);

  // In dev, render nothing
  if (!isProd) return null;

  return (
    <>
      {menu && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: menu.y, left: menu.x, zIndex: 99999 }}
          className="w-40 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden text-sm select-none animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={handleCut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Scissors className="w-4 h-4 text-rose-400" />
            <span>قص</span>
          </button>
          <div className="border-t border-white/5" />
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Copy className="w-4 h-4 text-sky-400" />
            <span>نسخ</span>
          </button>
          <div className="border-t border-white/5" />
          <button
            onClick={handlePaste}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Clipboard className="w-4 h-4 text-emerald-400" />
            <span>لصق</span>
          </button>
        </div>
      )}
    </>
  );
}
