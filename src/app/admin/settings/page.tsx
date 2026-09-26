'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('لوقستور');
  const [storeSlug, setStoreSlug] = useState('lokstor');
  const [subtitle, setSubtitle] = useState('متجر المنتجات الرقمية الجزائري');
  const [logoLetter, setLogoLetter] = useState('L');
  const [logoImg, setLogoImg] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'store')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setStoreName(d.storeName || 'لوقستور');
        setStoreSlug(d.storeSlug || 'lokstor');
        setSubtitle(d.storeSubtitle || 'متجر المنتجات الرقمية الجزائري');
        setLogoLetter(d.logoLetter || 'L');
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoImageUrl: string | undefined;
      if (logoImg) {
        logoImageUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          const reader = new FileReader();
          reader.onload = e => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 128; canvas.height = 128;
              canvas.getContext('2d')!.drawImage(img, 0, 0, 128, 128);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = e.target!.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(logoImg);
        });
      }
      const payload: any = { storeName, storeSlug, storeSubtitle: subtitle, logoLetter };
      if (logoImageUrl) payload.logoImageUrl = logoImageUrl;
      await setDoc(doc(db, 'settings', 'store'), payload, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-300 block">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="space-y-8 max-w-lg">
      <h1 className="text-2xl font-extrabold text-white">الإعدادات ⚙️</h1>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-5">
        <h2 className="font-bold text-white text-sm border-b border-slate-800 pb-3">بيانات المتجر</h2>
        <Field label="اسم المتجر (عربي)">
          <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" />
        </Field>
        <Field label="الاسم اللاتيني (Slug)">
          <input type="text" value={storeSlug} onChange={e => setStoreSlug(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" dir="ltr" />
        </Field>
        <Field label="الشعار الفرعي">
          <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" />
        </Field>
        <Field label="حرف اللوغو">
          <input type="text" maxLength={2} value={logoLetter} onChange={e => setLogoLetter(e.target.value)}
            className="w-32 p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" dir="ltr" />
        </Field>
        <Field label="صورة اللوغو (اختياري)">
          <input type="file" accept="image/*" onChange={e => setLogoImg(e.target.files?.[0] || null)}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs" />
        </Field>

        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm hover:bg-emerald-400 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'جاري الحفظ...' : saved ? '✓ تم الحفظ!' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
}
