'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GoogleSignInPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[var(--store-bg)]">
      <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}
