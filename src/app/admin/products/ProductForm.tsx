'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { Product } from '@/types';
import { Save, ArrowRight, Upload, Loader2, X, Plus, Trash2 } from 'lucide-react';

interface ProductFormProps {
  productId?: string;
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
    image: '',
    category: '',
    priceUnspecified: false,
    status: 'published',
    stock: 0,
    stockLinks: [],
    fileUrl: '',
    fileType: '',
    features: [],
  });

  // Each stockLink item is its own string — completely isolated
  const [stockItems, setStockItems] = useState<string[]>(['']);
  const [featuresText, setFeaturesText] = useState('');

  useEffect(() => {
    if (!isEdit || !productId) { setLoading(false); return; }
    getDoc(doc(db, 'products', productId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data() as Product;
        const cleanImage = ((data.imageUrl || data.image || '') as string).replace(/^"+|"+$/g, '').trim();
        setForm({
          ...data,
          id: snap.id,
          imageUrl: cleanImage,
          image: cleanImage,
        });
        const links = data.stockLinks || [];
        setStockItems(links.length > 0 ? links : ['']);
        setFeaturesText((data.features || []).join('\n'));
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('فشل جلب بيانات المنتج');
      setLoading(false);
    });
  }, [productId, isEdit]);

  const set = (field: keyof Product, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // ── stockItems helpers ──────────────────────────────────────────────────────
  const addStockItem = () => setStockItems(prev => [...prev, '']);

  const removeStockItem = (idx: number) =>
    setStockItems(prev => prev.filter((_, i) => i !== idx));

  const updateStockItem = (idx: number, value: string) =>
    setStockItems(prev => prev.map((item, i) => i === idx ? value : item));

  // ── Image upload: compress with canvas, store directly in Firestore ─────────
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1000;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/jpeg', 0.82);
            set('imageUrl', base64);
            set('image', base64);
          } else {
            const rawBase64 = event.target?.result as string;
            set('imageUrl', rawBase64);
            set('image', rawBase64);
          }
        } catch {
          const rawBase64 = event.target?.result as string;
          set('imageUrl', rawBase64);
          set('image', rawBase64);
        } finally {
          setImageUploading(false);
        }
      };
      img.onerror = () => {
        setError('فشل معالجة ملف الصورة');
        setImageUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError('فشل قراءة ملف الصورة');
      setImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Save directly to Cloud Firestore Database ───────────────────────────────
  const handleSave = async () => {
    if (!form.name?.trim()) { setError('اسم المنتج مطلوب'); return; }
    if (!form.priceUnspecified && (form.price === undefined || form.price < 0)) { setError('السعر يجب أن يكون قيمة صحيحة'); return; }

    setSaving(true);
    setError('');

    // Only non-empty items
    const stockLinks = stockItems.map(s => s.trim()).filter(Boolean);
    const features = featuresText.split('\n').map(s => s.trim()).filter(Boolean);
    const cleanImg = ((form.imageUrl || form.image || '') as string).replace(/^"+|"+$/g, '').trim();

    const payload: Partial<Product> = {
      ...form,
      name: form.name.trim(),
      description: form.description || '',
      price: Number(form.price || 0),
      priceUnspecified: Boolean(form.priceUnspecified),
      currency: 'dzd',
      imageUrl: cleanImg,
      image: cleanImg,
      stockLinks,
      features,
      stock: stockLinks.length,   // stock = actual count of isolated items
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
      setError('فشل الحفظ في قاعدة البيانات: ' + err.message);
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

  const filledCount = stockItems.filter(s => s.trim()).length;

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

          {/* Basic Info */}
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
                  <option value="شحن ألعاب">🎮 شحن ألعاب</option>
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

          {/* ── Stock Items — Each item is isolated ──────────────────────────── */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--admin-text)]">وحدات المخزون</h2>
                <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                  كل وحدة = حقل مستقل معزول — يُسلَّم للعميل واحدة فقط بعد الدفع
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--admin-primary)]/10 text-[var(--admin-primary)]">
                {filledCount} وحدة
              </span>
            </div>

            {/* Individual items */}
            <div className="space-y-2">
              {stockItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-9 flex items-center justify-center text-xs text-[var(--admin-text-muted)] font-mono mt-0.5">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    className={inputCls + ' resize-none font-mono text-xs flex-1'}
                    value={item}
                    onChange={e => updateStockItem(idx, e.target.value)}
                    placeholder={
                      idx === 0
                        ? 'مثال: Email: user@gmail.com\nPassword: abc123!'
                        : `الوحدة ${idx + 1}...`
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeStockItem(idx)}
                    disabled={stockItems.length === 1}
                    className="flex-shrink-0 mt-1 p-1.5 rounded text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="حذف هذه الوحدة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new item */}
            <button
              type="button"
              onClick={addStockItem}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-dashed border-[var(--admin-border)] text-sm text-[var(--admin-text-muted)] hover:border-[var(--admin-primary)] hover:text-[var(--admin-primary)] transition-colors w-full justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة وحدة جديدة</span>
            </button>

            <p className="text-[11px] text-[var(--admin-text-muted)] bg-amber-500/5 border border-amber-500/20 rounded-md p-2.5">
              ⚠️ كل وحدة معزولة — الكود يأخذ الوحدة <strong>الأولى</strong> فقط عند كل عملية شراء ثم يحذفها من القائمة.
            </p>
          </div>

          {/* Features */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2">مميزات المنتج</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">كل سطر = ميزة تظهر في صفحة المنتج</p>
            <textarea
              className={inputCls + ' h-24 resize-none text-xs'}
              value={featuresText}
              onChange={e => setFeaturesText(e.target.value)}
              placeholder={"تصميم احترافي قابل للتخصيص\nصيغة PDF و Word\nضمان استرداد المال"}
            />
          </div>
        </div>

        {/* RIGHT — Image & File */}
        <div className="space-y-4">
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2">صورة المنتج</h2>

            <div className="aspect-square w-full rounded-lg border-2 border-dashed border-[var(--admin-border)] overflow-hidden flex items-center justify-center bg-[var(--admin-bg)] relative group">
              {form.imageUrl ? (
                <>
                  <img src={form.imageUrl.replace(/^"+|"+$/g, '').trim()} alt="صورة المنتج" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { set('imageUrl', ''); set('image', ''); }}
                    className="absolute top-2 left-2 px-2 py-1 rounded bg-red-600/90 hover:bg-red-600 text-white text-xs flex items-center gap-1 shadow transition"
                    title="حذف الصورة"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>إزالة</span>
                  </button>
                </>
              ) : (
                <div className="text-center text-[var(--admin-text-muted)] text-xs p-4">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>لا توجد صورة</p>
                </div>
              )}
            </div>

            <label className="block w-full cursor-pointer">
              <span className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md border border-[var(--admin-border)] text-sm text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors">
                {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{imageUploading ? 'جاري المعالجة...' : 'رفع صورة من الحاسوب'}</span>
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
            </label>

            <div>
              <label className={labelCls}>أو رابط الصورة (URL)</label>
              <input
                className={inputCls}
                value={form.imageUrl || ''}
                onChange={e => {
                  set('imageUrl', e.target.value);
                  set('image', e.target.value);
                }}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2">رابط الملف (fileUrl)</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">رابط التحميل المباشر للمنتج الرقمي</p>
            <input className={inputCls} value={form.fileUrl || ''} onChange={e => set('fileUrl', e.target.value)} placeholder="https://..." />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-[var(--admin-primary)] text-[var(--admin-bg)] font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جاري الحفظ في Firestore...' : isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
