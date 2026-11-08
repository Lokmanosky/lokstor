'use client';

import { useState, useEffect } from 'react';
import { useStoreSettings, saveStoreSettings, DEFAULT_HERO_PHRASES, HeroPhrasesConfig } from '@/lib/store-settings';
import { logAdminActivity } from '@/lib/admin-logger';
import { 
  Sparkles, Type, AlignLeft, ShieldCheck, Headphones, 
  Save, RotateCcw, Check, AlertCircle, Loader2, Eye
} from 'lucide-react';

interface Props {
  compact?: boolean;
}

export default function HeroPhrasesEditor({ compact = false }: Props) {
  const currentSettings = useStoreSettings();
  
  const [phrases, setPhrases] = useState<HeroPhrasesConfig>(() => ({
    badge: currentSettings.heroPhrases?.badge || DEFAULT_HERO_PHRASES.badge,
    titleLine1: currentSettings.heroPhrases?.titleLine1 || DEFAULT_HERO_PHRASES.titleLine1,
    titleLine2: currentSettings.heroPhrases?.titleLine2 || DEFAULT_HERO_PHRASES.titleLine2,
    description: currentSettings.heroPhrases?.description || DEFAULT_HERO_PHRASES.description,
    feature1: currentSettings.heroPhrases?.feature1 || DEFAULT_HERO_PHRASES.feature1,
    feature2: currentSettings.heroPhrases?.feature2 || DEFAULT_HERO_PHRASES.feature2,
  }));

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentSettings.heroPhrases) {
      setPhrases({
        badge: currentSettings.heroPhrases.badge || DEFAULT_HERO_PHRASES.badge,
        titleLine1: currentSettings.heroPhrases.titleLine1 || DEFAULT_HERO_PHRASES.titleLine1,
        titleLine2: currentSettings.heroPhrases.titleLine2 || DEFAULT_HERO_PHRASES.titleLine2,
        description: currentSettings.heroPhrases.description || DEFAULT_HERO_PHRASES.description,
        feature1: currentSettings.heroPhrases.feature1 || DEFAULT_HERO_PHRASES.feature1,
        feature2: currentSettings.heroPhrases.feature2 || DEFAULT_HERO_PHRASES.feature2,
      });
    }
  }, [currentSettings.heroPhrases]);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await saveStoreSettings({
        heroPhrases: {
          badge: (phrases.badge || '').trim(),
          titleLine1: (phrases.titleLine1 || '').trim(),
          titleLine2: (phrases.titleLine2 || '').trim(),
          description: (phrases.description || '').trim(),
          feature1: (phrases.feature1 || '').trim(),
          feature2: (phrases.feature2 || '').trim(),
        }
      });

      await logAdminActivity({
        category: 'settings',
        actionType: 'update',
        title: 'تحديث نصوص وعبارات الواجهة الترحيبية (الهيرو)',
        description: 'تم تحديث عبارات الهيرو والعناوين والشارات من لوحة التحكم',
      });

      notify('تم حفظ عبارات الواجهة بنجاح وتحديثها فورياً على المتجر!');
    } catch (err: any) {
      notify('فشل الحفظ: ' + (err?.message || 'خطأ غير معروف'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm('هل أنت متأكد من استعادة العبارات والنصوص الافتراضية؟')) return;
    setPhrases({ ...DEFAULT_HERO_PHRASES });
  };

  // Helper for title preview formatting
  const renderPreviewTitle1 = (val?: string) => {
    const text = val || DEFAULT_HERO_PHRASES.titleLine1 || '';
    const parts = text.split(' ');
    if (parts.length > 1) {
      return (
        <span>
          {parts[0]} <span className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{parts.slice(1).join(' ')}</span>
        </span>
      );
    }
    return <span className="text-emerald-400">{text}</span>;
  };

  const inputCls = "w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-all placeholder:text-[var(--admin-text-muted)]/50";

  return (
    <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xs" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text)] flex items-center gap-2">
              <span>نصوص وعبارات الواجهة الترحيبية (الهيرو)</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                مباشر للزوار
              </span>
            </h2>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
              تحكّم بكل عبارة وعنوان وشارة تظهر في واجهة المتجر الرئيسية مع الحفاظ على التنسيق والجمالية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-xs font-semibold text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-all"
            title="استعادة النصوص الأصلية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--admin-primary)] text-[var(--admin-bg)] text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 border animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
            : 'bg-red-500/10 text-red-500 border-red-500/20'
        }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Input Fields Grid */}
      <form onSubmit={handleSave} className="space-y-5">
        
        {/* 1. Badge (الشارة العلوية) */}
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>1. الشارة الترويجية العلوية (Badge)</span>
            <span className="text-[11px] font-normal text-[var(--admin-text-muted)]">(الإطار البيضاوي أعلى العنوان)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={phrases.badge || ''}
              onChange={(e) => setPhrases(p => ({ ...p, badge: e.target.value }))}
              placeholder="مثال: متجر المنتجات الرقمية الأول في الجزائر"
              className={inputCls}
            />
          </div>
        </div>

        {/* 2 & 3. Title Lines (سطرا العنوان) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
              <Type className="w-4 h-4 text-emerald-500" />
              <span>2. العنوان الرئيسي - السطر الأول</span>
            </label>
            <input
              type="text"
              value={phrases.titleLine1 || ''}
              onChange={(e) => setPhrases(p => ({ ...p, titleLine1: e.target.value }))}
              placeholder="مثال: أفضل المنتجات الرقمية"
              className={inputCls}
            />
            <p className="text-[11px] text-[var(--admin-text-muted)]">
              💡 الكلمة الأولى تظهر بلون أبيض، وبقية الكلمات تتلون بالأخضر المميز للمتجر.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
              <Type className="w-4 h-4 text-emerald-500" />
              <span>3. العنوان الرئيسي - السطر الثاني</span>
            </label>
            <input
              type="text"
              value={phrases.titleLine2 || ''}
              onChange={(e) => setPhrases(p => ({ ...p, titleLine2: e.target.value }))}
              placeholder="مثال: بدفع إلكتروني آمن"
              className={inputCls}
            />
            <p className="text-[11px] text-[var(--admin-text-muted)]">
              💡 يظهر في سطر مستقل وثابت على الهاتف لراحة القراءة.
            </p>
          </div>
        </div>

        {/* 4. Description (الوصف التوضيحي) */}
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-emerald-500" />
            <span>4. الوصف والفقرة التوضيحية (Description)</span>
          </label>
          <textarea
            rows={2}
            value={phrases.description || ''}
            onChange={(e) => setPhrases(p => ({ ...p, description: e.target.value }))}
            placeholder="مثال: كتب، قوالب جاهزة، واشتراكات مدفوعة مع تسليم فوري وتلقائي مباشرة بعد الدفع."
            className={`${inputCls} resize-none leading-relaxed`}
          />
        </div>

        {/* 5 & 6. Features (شارات الميزات) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>5. شارة الميزة الأولى (مع أيقونة الدرع)</span>
            </label>
            <input
              type="text"
              value={phrases.feature1 || ''}
              onChange={(e) => setPhrases(p => ({ ...p, feature1: e.target.value }))}
              placeholder="مثال: بوابات دفع رسمية جزائرية"
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
              <Headphones className="w-4 h-4 text-indigo-400" />
              <span>6. شارة الميزة الثانية (مع أيقونة الدعم)</span>
            </label>
            <input
              type="text"
              value={phrases.feature2 || ''}
              onChange={(e) => setPhrases(p => ({ ...p, feature2: e.target.value }))}
              placeholder="مثال: دعم فني متواصل 24/7"
              className={inputCls}
            />
          </div>
        </div>
      </form>

      {/* ── Live Preview Card ── */}
      <div className="space-y-2 pt-2 border-t border-[var(--admin-border)]">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--admin-text-muted)]">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-500" />
            <span>معاينة حية فورية كما ستظهر للزوار في واجهة المتجر:</span>
          </span>
          <span className="text-[10px] bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded font-mono">LIVE PREVIEW</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden p-6 sm:p-8 bg-gradient-to-b from-slate-900 via-black to-slate-950 text-white text-center border border-white/10 shadow-xl space-y-3 sm:space-y-4">
          {/* Badge */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/20 text-xs font-medium text-white/90 bg-black/40 backdrop-blur-md shadow-xs">
              <span>{phrases.badge || 'متجر المنتجات الرقمية الأول في الجزائر'}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
            <span className="block">
              {renderPreviewTitle1(phrases.titleLine1)}
            </span>
            <span className="block mt-0.5 sm:mt-1 text-white">
              {phrases.titleLine2 || 'بدفع إلكتروني آمن'}
            </span>
          </h3>

          {/* Desc */}
          <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto font-medium leading-relaxed">
            {phrases.description || 'كتب، قوالب جاهزة، واشتراكات مدفوعة مع تسليم فوري وتلقائي مباشرة بعد الدفع.'}
          </p>

          {/* Features */}
          <div className="pt-1 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{phrases.feature1 || 'بوابات دفع رسمية جزائرية'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Headphones className="w-4 h-4" />
              <span>{phrases.feature2 || 'دعم فني متواصل 24/7'}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

