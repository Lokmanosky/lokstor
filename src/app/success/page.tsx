'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Order } from '@/types';
import { Check, RefreshCw, Download, Copy, CheckCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';

function isUrl(str: string) {
  try {
    new URL(str);
    return str.startsWith('http://') || str.startsWith('https://');
  } catch {
    return false;
  }
}

function DeliveryBox({ content }: { content: string }) {
  const { t, lang } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (isUrl(content)) {
    return (
      <div className="space-y-3 pt-4">
        <a
          href={content}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="chargily-btn inline-flex items-center justify-center gap-3 w-full py-4 px-8 rounded-2xl text-slate-950 font-black text-base shadow-xl"
        >
          <Download className="w-5 h-5" />
          <span>{t('success.downloadNow')}</span>
        </a>
        <p className="text-[11px] text-slate-500">
          {t('success.downloadNotice')}
        </p>
      </div>
    );
  }

  // Plain text content: account credentials, code, instructions, etc.
  return (
    <div className={`space-y-3 pt-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
      <p className="text-xs text-emerald-400 font-bold">{t('success.deliverableTitle')}</p>
      <div className="relative bg-[var(--store-bg)] border border-emerald-500/30 rounded-2xl p-5">
        <pre className="text-sm text-[var(--store-text)] whitespace-pre-wrap break-words font-mono leading-relaxed" dir="ltr">
          {content}
        </pre>
        <button
          onClick={handleCopy}
          className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white hover:bg-slate-700 transition-colors shadow-sm cursor-pointer`}
        >
          {copied ? (
            <><CheckCheck className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">{t('common.copied')}</span></>
          ) : (
            <><Copy className="w-3.5 h-3.5 text-white" /><span className="text-white">{t('common.copy')}</span></>
          )}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        {t('success.deliverableNotice')}
      </p>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const isMock = searchParams.get('mock') === 'true';
  const guestToken = searchParams.get('token');

  const { t, lang, formatCurrency } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmingMock, setConfirmingMock] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const { user } = useAuth();

  const fetchOrder = async (confirmDemo = false) => {
    if (!orderId) return;
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (user) {
        try {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }

      const q = new URLSearchParams();
      if (confirmDemo) q.set('mock_confirm', 'true');
      if (guestToken) q.set('token', guestToken);
      const qs = q.toString();
      const url = `/api/orders/${orderId}${qs ? `?${qs}` : ''}`;

      const res = await fetch(url, { headers });
      const data = await res.json();

      if (res.ok && data.order) {
        setOrder(data.order);
      } else {
        setErrorMsg(data.error || t('success.orderNotFoundDesc'));
      }
    } catch (err: any) {
      setErrorMsg(t('success.orderNotFoundDesc'));
    } finally {
      setLoading(false);
      setConfirmingMock(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    fetchOrder(isMock);

    // Auto-polling every 3 seconds if order is not yet marked paid
    let polls = 0;
    const interval = setInterval(() => {
      if (order?.status === 'paid' || polls >= 12) {
        clearInterval(interval);
        return;
      }
      polls++;
      fetchOrder(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, isMock, order?.status, user, guestToken]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center bg-[var(--store-card)] border border-[var(--store-border)] shadow-xl rounded-3xl p-12 my-12" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="inline-block w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-[var(--store-text)] mb-2">{t('success.verifying')}</h2>
        <p className="text-[var(--store-text-muted)] text-xs">{t('success.pleaseWait')}</p>
      </div>
    );
  }

  if (!orderId || (!loading && !order)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center bg-[var(--store-card)] border border-[var(--store-border)] shadow-xl rounded-3xl p-12 my-12 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto text-2xl font-bold">!</div>
        <h2 className="text-2xl font-bold text-[var(--store-text)]">{t('success.orderNotFound')}</h2>
        <p className="text-[var(--store-text-muted)] text-xs leading-relaxed max-w-md mx-auto">
          {errorMsg || t('success.orderNotFoundDesc')}
        </p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">
          <ArrowRight className={`w-4 h-4 ${lang !== 'ar' ? 'rotate-180' : ''}`} /><span>{t('success.backHome')}</span>
        </Link>
      </div>
    );
  }

  const isPaid = order?.status === 'paid';
  const deliveryContent = order?.downloadUrl;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-[var(--store-card)] border border-[var(--store-border)] shadow-xl p-8 sm:p-12 rounded-3xl text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Status Icon */}
        <div className="relative">
          {isPaid ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-[var(--store-text)]">
            {isPaid ? t('success.title') : t('success.processing')}
          </h1>
          <p className="text-[var(--store-text-muted)] text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            {isPaid ? t('success.descPaid') : t('success.descProcessing')}
          </p>
        </div>

        {/* Order Info */}
        <div className="bg-[var(--store-bg)] border border-[var(--store-border)] p-6 rounded-2xl space-y-3 text-xs">
          <div className="flex justify-between items-center text-[var(--store-text-muted)] border-b border-[var(--store-border)] pb-3">
            <span>{t('success.orderId')}</span>
            <span className="font-mono font-bold text-[var(--store-text)]" dir="ltr">{order?.id}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--store-text-muted)] border-b border-[var(--store-border)] pb-3">
            <span>{t('success.product')}</span>
            <span className="font-bold text-[var(--store-text)]">{order?.productName}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--store-text-muted)] border-b border-[var(--store-border)] pb-3">
            <span>{t('success.email')}</span>
            <span className="text-emerald-400 font-semibold" dir="ltr">{order?.customerEmail}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--store-text-muted)]">
            <span>{t('success.amountPaid')}</span>
            <span className="font-black text-[var(--store-text)] text-sm">{formatCurrency(order?.productPrice || order?.amount || 0)}</span>
          </div>
        </div>

        {/* Delivery Section */}
        {isPaid ? (
          deliveryContent ? (
            <DeliveryBox content={deliveryContent} />
          ) : (
            <div className="pt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <p className="font-bold">{t('success.preparingDeliverable')}</p>
              <p className="text-[var(--store-text-muted)] mt-1">{t('success.contactIfDelayed')}</p>
            </div>
          )
        ) : (
          <div className="space-y-4 pt-2">
            <button
              onClick={() => fetchOrder(false)}
              className="w-full py-3 rounded-xl bg-[var(--store-bg)] text-[var(--store-text)] font-bold text-xs border border-[var(--store-border)] hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t('account.refreshPayment')}</span>
            </button>

            {/* Dev Mock Confirm */}
            {isMock && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2">
                <p className="font-bold">Test Mode:</p>
                <button
                  onClick={() => { setConfirmingMock(true); fetchOrder(true); }}
                  disabled={confirmingMock}
                  className="mt-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  {confirmingMock ? 'Confirming...' : 'Mock Confirm Payment'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/" className="text-xs text-[var(--store-text-muted)] hover:text-[var(--store-text)] font-semibold">
          {t('success.backHome')}
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[var(--store-text-muted)] text-sm">...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
