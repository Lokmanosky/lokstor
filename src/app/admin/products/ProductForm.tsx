'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { Product } from '@/types';
import { Save, ArrowRight, Upload, Loader2, X, Plus } from 'lucide-react';

interface ProductFormProps {
  productId?: string; // undefined = new product
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!productId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    currency: 'dzd',
    imageUrl: '',
    category: '',
    status: 'published',
    stock: 0,
    stockLinks: [],
    fileType: '',
    features: [],
  });

  const [stockLinksText, setStockLinksText] = useState('');
  const [featuresText, setFeaturesText] = useState('');

  useEffect(() => {
    if (!isEdit || !productId) { setLoading(false); return; }
    getDoc(doc(db, 'products', productId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data() as Product;
        setForm({ ...data, id: snap.id });
        setStockLinksText((data.stockLinks || []).join('\n'));
        setFeaturesText((data.features || []).join('\n'));
      }
      setLoading(false);
    });
  }, [productId, isEdit]);

  const set = (field: keyof Product, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) set('imageUrl', data.url);
      else setError('فشل رفع الصورة: ' + (data.error || ''));
    } catch (err: any) {
      setError('خطأ أثناء رفع الصورة');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { setError('اسم المنتج مطلوب'); return; }
    if (!form.price || form.price < 0) { setError('السعر يجب أن يكون قيمة صحيحة'); return; }

    setSaving(true);
    setError('');

    const stockLinks = stockLinksText.split('\n').map(s => s.trim()).filter(Boolean);
    const features = featuresText.split('\n').map(s => s.trim()).filter(Boolean);

    const payload: Partial<Product> = {
      ...form,
      stockLinks,
      features,
      stock: stockLinks.length || Number(form.stock) || 0,
      updatedAt: Date.now(),
    };

    try {
      if (isEdit && productId) {
        await setDoc(doc(db, 'products', productId), { ...payload, createdAt: form.createdAt || Date.now() });
      } else {
        await addDoc(collection(db, 'products'), { ...payload, createdAt: Date.now() });
      }
      router.push('/admin/products');
    } catch (err: any) {
      setError('فشل الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--admin-primary)]" />
      </div>
    );
  }

  const labelCls = "block text-sm font-medium text-[var(--admin-text)] mb-1.5";
  const inputCls = "w-full px-3 py-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)] placeholder:text-[var(--admin-text-muted)]";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin/products')} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">{isEdit ? 'تعديل منتج' : 'إضافة منتج جديد'}</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">{isEdit ? `رقم المنتج: ${productId}` : 'أدخل تفاصيل المنتج الجديد'}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <X className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Main Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2">المعلومات الأساسية</h2>

            <div>
              <label className={labelCls}>اسم المنتج *</label>
              <input className={inputCls} value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="مثال: قالب سيرة ذاتية احترافي" />
            </div>

            <div>
              <label className={labelCls}>الوصف</label>
              <textarea className={inputCls + ' h-28 resize-none'} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="وصف تفصيلي للمنتج..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>السعر (د.ج) *</label>
                <input className={inputCls} type="number" min={0} value={form.price || 0} onChange={e => set('price', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>التصنيف</label>
                <select className={inputCls} value={form.category || ''} onChange={e => set('category', e.target.value)}>
                  <option value="">— بدون تصنيف —</option>
                  <option value="منتجات رقمية">منتجات رقمية</option>
                  <option value="اشتراكات">اشتراكات</option>
                  <option value="كتب">كتب</option>
                  <option value="قوالب">قوالب</option>
                  <option value="دورات">دورات</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>الحالة</label>
                <select className={inputCls} value={form.status || 'published'} onChange={e => set('status', e.target.value)}>
                  <option value="published">منشور</option>
                  <option value="draft">مسودة</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>نوع الملف</label>
                <input className={inputCls} value={form.fileType || ''} onChange={e => set('fileType', e.target.value)} placeholder="PDF, ZIP, MP4..." />
              </div>
            </div>
          </div>

          {/* Stock Links */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2">محتوى المخزون (stockLinks)</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">كل سطر = وحدة واحدة يُسلَّم للعميل بعد الدفع. يمكن أن يكون رابطاً، ايميل + كلمة مرور، كود تفعيل، أي نص.</p>
            <textarea
              className={inputCls + ' h-36 resize-none font-mono text-xs'}
              value={stockLinksText}
              onChange={e => setStockLinksText(e.target.value)}
              placeholder={"مثال:\nhttps://example.com/file.pdf\n\nأو:\nEmail: user@gmail.com\nPassword: abc123!\n\nأو:\nكود التفعيل: ABCD-1234-EFGH"}
            />
            <p className="text-xs text-[var(--admin-text-muted)]">المخزون الحالي: {stockLinksText.split('\n').filter(s => s.trim()).length} وحدة</p>
          </div>

          {/* Features */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2">مميزات المنتج</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">كل سطر = ميزة تظهر في صفحة المنتج</p>
            <textarea className={inputCls + ' h-28 resize-none text-xs'} value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder={"مثال:\nتصميم احترافي قابل للتخصيص\nصيغة PDF و Word\nضمان استرداد المال"} />
          </div>
        </div>

        {/* RIGHT — Image & File */}
        <div className="space-y-4">
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2">صورة المنتج</h2>

            {/* Image Preview */}
            <div className="aspect-square w-full rounded-lg border-2 border-dashed border-[var(--admin-border)] overflow-hidden flex items-center justify-center bg-[var(--admin-bg)]">
              {form.imageUrl ? (
                <img src={form.imageUrl.replace(/^"+|"+$/g, '').trim()} alt="صورة المنتج" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-[var(--admin-text-muted)] text-xs p-4">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>لا توجد صورة</p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <label className="block w-full">
              <span className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md border border-[var(--admin-border)] text-sm text-[var(--admin-text)] cursor-pointer hover:bg-[var(--admin-hover)] transition-colors">
                {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{imageUploading ? 'جاري الرفع...' : 'رفع صورة'}</span>
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
            </label>

            {/* Manual URL */}
            <div>
              <label className={labelCls}>أو أدخل رابط الصورة</label>
              <input className={inputCls} value={form.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
            </div>
          </div>

          {/* File URL */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2">رابط الملف (fileUrl)</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">رابط الملف الرقمي — يُستخدم إذا كان المنتج ملفاً واحداً (ليس من نوع stockLinks)</p>
            <input className={inputCls} value={form.fileUrl || ''} onChange={e => set('fileUrl', e.target.value)} placeholder="https://storage.googleapis.com/..." />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-[var(--admin-primary)] text-[var(--admin-bg)] font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
