'use client';

import { useState, useEffect } from 'react';
import {
  Megaphone,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  Eye,
  Sliders,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { useStoreSettings, saveStoreSettings, DEFAULT_TICKER_ITEMS, TickerItem } from '@/lib/store-settings';

const QUICK_EMOJIS = ['🎧', '⭐', '🚀', '✨', '🔥', '⚡', '🎁', '💎', '🔒', '🏷️', '📢', '🎮', '💡', '🏆'];

const FIELD_COLORS = [
  { label: 'الخانة 1', colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10 border-amber-500/20' },
  { label: 'الخانة 2', colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10 border-emerald-500/20' },
  { label: 'الخانة 3', colorClass: 'text-purple-500', bgClass: 'bg-purple-500/10 border-purple-500/20' },
  { label: 'الخانة 4', colorClass: 'text-rose-500', bgClass: 'bg-rose-500/10 border-rose-500/20' },
];

export default function AdminTickerPage() {
  const currentSettings = useStoreSettings();

  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [items, setItems] = useState<TickerItem[]>([
    { text: '', icon: '🎧' },
    { text: '', icon: '⭐' },
    { text: '', icon: '🚀' },
    { text: '', icon: '✨' },
  ]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize from current store settings
  useEffect(() => {
    if (currentSettings.tickerEnabled !== undefined) {
      setTickerEnabled(currentSettings.tickerEnabled);
    }
    const sourceItems = (currentSettings.tickerItems && currentSettings.tickerItems.length > 0)
      ? currentSettings.tickerItems
      : DEFAULT_TICKER_ITEMS;

    // Ensure we always have exactly 4 items
    const padded: TickerItem[] = [];
    for (let i = 0; i < 4; i++) {
      if (sourceItems[i]) {
        padded.push({ text: sourceItems[i].text || '', icon: sourceItems[i].icon || DEFAULT_TICKER_ITEMS[i]?.icon || '✨' });
      } else {
        padded.push({ text: DEFAULT_TICKER_ITEMS[i]?.text || '', icon: DEFAULT_TICKER_ITEMS[i]?.icon || '✨' });
      }
    }
    setItems(padded);
  }, [currentSettings]);

  const handleItemChange = (index: number, field: 'text' | 'icon', value: string) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleResetDefaults = () => {
    setItems(DEFAULT_TICKER_ITEMS.map(i => ({ ...i })));
    setTickerEnabled(true);
    setMessage({ type: 'success', text: 'تمت استعادة العبارات الافتراضية، اضغط "حفظ التغييرات" لاعتمادها' });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Clean up text
      const cleanedItems = items.map(item => ({
        text: (item.text || '').trim(),
        icon: (item.icon || '').trim(),
      }));

      await saveStoreSettings({
        tickerItems: cleanedItems,
        tickerEnabled,
      });

      setMessage({ type: 'success', text: 'تم حفظ إعدادات الشريط الإعلاني بنجاح! التحديث يظهر الآن مباشرة للزوار 🚀' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving ticker settings:', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة مجدداً' });
    } finally {
      setSaving(false);
    }
  };

  // Preview items
  const previewItems = items
    .filter(i => i.text.trim().length > 0)
    .map((item, idx) => ({
      icon: item.icon,
      text: item.text,
      colorClass: [
        'text-amber-500 dark:text-amber-400',
        'text-emerald-500 dark:text-emerald-400',
        'text-purple-500 dark:text-purple-400',
        'text-rose-500 dark:text-rose-400',
      ][idx % 4],
    }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--admin-border)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--admin-text)]">
                الشريط الإعلاني المتحرك
              </h1>
              <p className="text-xs sm:text-sm text-[var(--admin-text-muted)]">
                تخصيص العبارات الأربعة التي تظهر في الشريط الإعلاني أعلى متجرك وتتحرك بشكل مستمر
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--admin-border)] hover:bg-[var(--admin-hover)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>عرض المتجر</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>

          <button
            onClick={handleResetDefaults}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--admin-border)] hover:bg-[var(--admin-hover)] text-[var(--admin-text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
            title="استعادة النصوص الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">افتراضي</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ التغييرات</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in text-sm font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Master Toggle & Status Card */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-[var(--admin-text)]">
                تفعيل الشريط الإعلاني في المتجر
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  tickerEnabled
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-500/15 text-zinc-500 border border-zinc-500/30'
                }`}
              >
                {tickerEnabled ? 'مفعّل ونشط' : 'معطّل ومخفي'}
              </span>
            </div>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
              يمكنك تعطيل الشريط في أي وقت دون حذف العبارات المكتوبة بالأسفل
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTickerEnabled(!tickerEnabled)}
          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            tickerEnabled ? 'bg-emerald-600' : 'bg-zinc-400 dark:bg-zinc-700'
          }`}
          role="switch"
          aria-checked={tickerEnabled}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              tickerEnabled ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Live Preview Box */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-xs sm:text-sm text-[var(--admin-text)]">
              معاينة حية ومباشرة (Live Preview)
            </h3>
          </div>
          <span className="text-[11px] text-[var(--admin-text-muted)]">
            تتحرك العبارات أمامك تماماً كما يراها الزائر
          </span>
        </div>

        {/* The Live Marquee */}
        <div className="border border-[var(--admin-border)] rounded-xl overflow-hidden shadow-inner">
          <div className="bg-slate-100 dark:bg-[#131417] text-[11px] sm:text-xs py-2 overflow-hidden flex items-center relative transition-colors" dir="ltr">
            <style>{`
              @keyframes marquee-preview {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .marquee-preview-wrapper {
                display: flex;
                width: max-content;
                animation: marquee-preview 22s linear infinite;
              }
              .marquee-preview-wrapper:hover {
                animation-play-state: paused;
              }
            `}</style>
            {!tickerEnabled ? (
              <div className="w-full py-1 text-center text-xs text-zinc-400 italic" dir="rtl">
                ⚠️ الشريط معطل حالياً ولن يظهر في المتجر
              </div>
            ) : previewItems.length === 0 ? (
              <div className="w-full py-1 text-center text-xs text-zinc-400 italic" dir="rtl">
                يرجى كتابة عبارة واحدة على الأقل بالأسفل
              </div>
            ) : (
              <div className="marquee-preview-wrapper">
                {/* Block 1 */}
                <div className="flex flex-nowrap items-center gap-8 sm:gap-14 pr-8 sm:pr-14" dir="rtl">
                  {previewItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 font-bold whitespace-nowrap shrink-0">
                      {item.icon && <span className="text-sm drop-shadow-xs">{item.icon}</span>}
                      <span className={`tracking-wide whitespace-nowrap ${item.colorClass}`}>{item.text}</span>
                    </div>
                  ))}
                </div>
                {/* Block 2 (duplicate for seamless loop) */}
                <div className="flex flex-nowrap items-center gap-8 sm:gap-14 pr-8 sm:pr-14" dir="rtl" aria-hidden="true">
                  {previewItems.map((item, i) => (
                    <div key={`dup-${i}`} className="flex items-center gap-2 font-bold whitespace-nowrap shrink-0">
                      {item.icon && <span className="text-sm drop-shadow-xs">{item.icon}</span>}
                      <span className={`tracking-wide whitespace-nowrap ${item.colorClass}`}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Customizable Fields */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-[var(--admin-text)]">
            العبارات الأربعة المخصصة
          </h2>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
            اكتب العبارة الترويجية في كل خانة واختر أيقونة/إيموجي مناسب لها
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {items.map((item, idx) => {
            const badgeMeta = FIELD_COLORS[idx] || FIELD_COLORS[0];
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] space-y-3 transition-colors hover:border-emerald-500/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${badgeMeta.bgClass} ${badgeMeta.colorClass}`}>
                      {badgeMeta.label}
                    </span>
                    <span className="text-xs text-[var(--admin-text-muted)]">
                      {idx === 0 && '(مثال: دعم متوفر 24/7)'}
                      {idx === 1 && '(مثال: أسعار تنافسية)'}
                      {idx === 2 && '(مثال: تسليم فوري وآمن)'}
                      {idx === 3 && '(مثال: مرحباً بك في متجرنا)'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Icon / Emoji Input */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-[var(--admin-text-muted)] mb-1">
                      الأيقونة / الإيموجي:
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={item.icon || ''}
                        onChange={(e) => handleItemChange(idx, 'icon', e.target.value)}
                        placeholder="🎧"
                        maxLength={6}
                        className="w-full text-center text-lg font-bold bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Phrase Text Input */}
                  <div className="sm:col-span-9">
                    <label className="block text-[11px] font-bold text-[var(--admin-text-muted)] mb-1">
                      نص العبارة:
                    </label>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleItemChange(idx, 'text', e.target.value)}
                      placeholder={`اكتب العبارة رقم ${idx + 1}...`}
                      className="w-full bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* Quick Emoji Picker Shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[var(--admin-text-muted)] font-medium pl-1">
                    إيموجيات سريعة:
                  </span>
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleItemChange(idx, 'icon', emoji)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm border transition-all cursor-pointer ${
                        item.icon === emoji
                          ? 'bg-emerald-500/20 border-emerald-500/50 scale-110 shadow-xs'
                          : 'bg-[var(--admin-card)] border-[var(--admin-border)] hover:bg-[var(--admin-hover)]'
                      }`}
                      title={`اختيار ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Submit Actions */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--admin-border)]">
            <p className="text-xs text-[var(--admin-text-muted)]">
              💡 نصيحة: النصوص الموجزة والجذابة تعطي مظهراً أجمل وانسيابية أفضل في حركة الشريط.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ وتطبيق على المتجر</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
