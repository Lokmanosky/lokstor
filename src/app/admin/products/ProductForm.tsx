'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { Product, ProductVariant, GameFieldRequirement } from '@/types';
import { Save, ArrowRight, Upload, Loader2, X, Plus, Trash2, Sparkles, Gamepad2, Layers, ImageIcon, KeyRound } from 'lucide-react';

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
    originalPrice: undefined,
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
    telegramLink: '',
    features: [],
  });

  // Each stockLink item is its own string — completely isolated
  const [stockMode, setStockMode] = useState<'numeric' | 'units'>('numeric');
  const [numericStock, setNumericStock] = useState<number>(50);
  const [isUnlimitedStock, setIsUnlimitedStock] = useState<boolean>(true);
  const [stockItems, setStockItems] = useState<string[]>(['']);
  const [featuresText, setFeaturesText] = useState('');

  // ── Product Variants / Bundles (باقات الشحن والأنواع) ───────────────────
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [requiresCustomerInfo, setRequiresCustomerInfo] = useState<boolean>(false);
  const [requiredFields, setRequiredFields] = useState<GameFieldRequirement[]>([]);

  useEffect(() => {
    if (!isEdit || !productId) { setLoading(false); return; }
    getDoc(doc(db, 'products', productId)).then(async snap => {
      if (snap.exists()) {
        const data = snap.data() as Product;
        const cleanImage = ((data.imageUrl || data.image || '') as string).replace(/^"+|"+$/g, '').trim();
        
        let links: string[] = [];
        try {
          const unitsSnap = await getDoc(doc(db, 'productUnits', productId));
          if (unitsSnap.exists()) {
            const uData = unitsSnap.data();
            links = uData.stockLinks || [];
            data.fileUrl = uData.fileUrl || data.fileUrl; // Fallback to data.fileUrl just in case
          }
        } catch (e) {
          console.error("Failed to fetch productUnits", e);
        }

        setForm({
          ...data,
          id: snap.id,
          imageUrl: cleanImage,
          image: cleanImage,
        });
        
        setStockItems(links.length > 0 ? links : ['']);
        setFeaturesText((data.features || []).join('\n'));
        if (data.hasVariants || (data.variants && data.variants.length > 0)) {
          setHasVariants(true);
          setVariants(data.variants || []);
        }
        if (data.requiresCustomerInfo !== undefined) {
          setRequiresCustomerInfo(Boolean(data.requiresCustomerInfo));
        } else if (data.requiredFields && data.requiredFields.length > 0) {
          setRequiresCustomerInfo(true);
        } else {
          setRequiresCustomerInfo(false);
        }

        if (data.requiredFields && data.requiredFields.length > 0) {
          setRequiredFields(data.requiredFields || []);
        } else {
          setRequiredFields([]);
        }

        // Initialize stock mode & unlimitedStock correctly
        if (data.stockType === 'units') {
          setStockMode('units');
          setIsUnlimitedStock(false);
          setStockItems(links && links.length > 0 ? links : ['']);
        } else if (data.stockType === 'numeric' || Boolean(data.unlimitedStock)) {
          setStockMode('numeric');
          setIsUnlimitedStock(Boolean(data.unlimitedStock || (typeof data.stock === 'number' && data.stock >= 99999)));
          setNumericStock(typeof data.stock === 'number' && data.stock < 99999 ? data.stock : 50);
        } else {
          // Legacy products fallback
          if (links && links.length > 0) {
            setStockMode('units');
            setIsUnlimitedStock(false);
            setStockItems(links);
          } else {
            setStockMode('numeric');
            setIsUnlimitedStock(false);
            setNumericStock(typeof data.stock === 'number' ? data.stock : 0);
          }
        }
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


  // ── Variant & Game Requirement Helpers ─────────────────────────────────────
  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      {
        id: 'var_' + Date.now() + Math.random().toString(36).substr(2, 4),
        name: '',
        price: 0,
        image: '/images/game-coin.jpg',
      }
    ]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  // Upload and compress variant icon from local PC
  const handleVariantIconUpload = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 140; // Crisp icon size
          let { width, height } = img;
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
            const base64 = canvas.toDataURL('image/png');
            updateVariant(index, 'image', base64);
          } else {
            updateVariant(index, 'image', event.target?.result as string);
          }
        } catch {
          updateVariant(index, 'image', event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Quick Preset Templates
  const applyPresetTemplate = (type: 'cod' | 'pubg' | 'freefire' | 'chatgpt') => {
    if (type === 'chatgpt') {
      setRequiresCustomerInfo(true);
      setHasVariants(true);
      set('name', form.name || 'تفعيل اشتراك رسمي على حسابك (Email & Password)');
      set('category', 'اشتراكات وخدمات رقمية');
      setStockMode('numeric');
      setIsUnlimitedStock(true);
      setVariants([
        { id: 'sub_1m', name: 'اشتراك شهر واحد (1 Month)', price: 3500 },
        { id: 'sub_3m', name: 'اشتراك 3 أشهر (3 Months)', price: 9900 },
        { id: 'sub_1y', name: 'اشتراك سنة كاملة (1 Year)', price: 29000 },
      ]);
      setRequiredFields([
        { id: 'game_email', label: 'البريد الإلكتروني للحساب (Email)', placeholder: 'أدخل بريد حسابك المراد تفعيله', required: true, type: 'text' },
        { id: 'game_password', label: 'كلمة مرور الحساب (Password)', placeholder: 'أدخل كلمة مرور الحساب للتفعيل', required: true, type: 'password' },
      ]);
      return;
    }
    setHasVariants(true);
    if (type === 'cod') {
      setRequiresCustomerInfo(true);
      set('name', form.name || 'شحن نقاط Call of Duty عبر الحساب - COD Mobile CP');
      set('category', 'شحن ألعاب');
      setVariants([
        { id: 'cod_80', name: '80 CP', price: 290, image: '/images/game-coin.jpg' },
        { id: 'cod_420', name: '420 CP', price: 1390, image: '/images/game-coin.jpg' },
        { id: 'cod_880', name: '880 CP', price: 2690, image: '/images/game-coin.jpg' },
        { id: 'cod_2400', name: '2400 CP', price: 6790, image: '/images/game-coin.jpg' },
        { id: 'cod_5000', name: '5000 CP', price: 13990, image: '/images/game-coin.jpg' },
        { id: 'cod_10800', name: '10800 CP', price: 29500, image: '/images/game-coin.jpg' },
        { id: 'cod_pass_w', name: 'تذكرة الإمداد الأسبوعية', price: 290, image: '/images/game-coin.jpg' },
        { id: 'cod_pass_m', name: 'تذكرة الإمداد الشهرية', price: 990, image: '/images/game-coin.jpg' },
      ]);
      setRequiredFields([
        { id: 'game_email', label: 'البريد الإلكتروني للعبة (Call Of Duty / Activision)', placeholder: 'أدخل بريد الحساب', required: true, type: 'text' },
        { id: 'game_password', label: 'كلمة المرور (Password)', placeholder: 'أدخل كلمة مرور الحساب', required: true, type: 'password' },
      ]);
    } else if (type === 'pubg') {
      setRequiresCustomerInfo(true);
      set('name', form.name || 'شحن شدات ببجي موبايل - PUBG Mobile UC');
      set('category', 'شحن ألعاب');
      setVariants([
        { id: 'pubg_60', name: '60 UC', price: 250, image: '/images/game-coin.jpg' },
        { id: 'pubg_325', name: '325 UC', price: 1190, image: '/images/game-coin.jpg' },
        { id: 'pubg_660', name: '660 UC', price: 2350, image: '/images/game-coin.jpg' },
        { id: 'pubg_1800', name: '1800 UC', price: 6100, image: '/images/game-coin.jpg' },
        { id: 'pubg_3850', name: '3850 UC', price: 12500, image: '/images/game-coin.jpg' },
        { id: 'pubg_8100', name: '8100 UC', price: 25900, image: '/images/game-coin.jpg' },
      ]);
      setRequiredFields([
        { id: 'player_id', label: 'معرف اللاعب (Player ID)', placeholder: 'مثال: 5123456789', required: true, type: 'text' },
      ]);
    } else if (type === 'freefire') {
      setRequiresCustomerInfo(true);
      set('name', form.name || 'شحن جواهر فري فاير - Free Fire Diamonds');
      set('category', 'شحن ألعاب');
      setVariants([
        { id: 'ff_100', name: '100 جوهرة 💎', price: 220, image: '/images/game-gem.jpg' },
        { id: 'ff_310', name: '310 جوهرة 💎', price: 650, image: '/images/game-gem.jpg' },
        { id: 'ff_520', name: '520 جوهرة 💎', price: 1080, image: '/images/game-gem.jpg' },
        { id: 'ff_1060', name: '1060 جوهرة 💎', price: 2150, image: '/images/game-gem.jpg' },
        { id: 'ff_2180', name: '2180 جوهرة 💎', price: 4290, image: '/images/game-gem.jpg' },
      ]);
      setRequiredFields([
        { id: 'player_id', label: 'معرف اللاعب (Player ID)', placeholder: 'مثال: 1234567890', required: true, type: 'text' },
      ]);
    }
  };

  const toggleReqField = (fieldId: string, label: string, placeholder: string, type: 'text' | 'password' = 'text') => {
    setRequiredFields(prev => {
      const exists = prev.some(f => f.id === fieldId);
      if (exists) {
        return prev.filter(f => f.id !== fieldId);
      } else {
        return [...prev, { id: fieldId, label, placeholder, required: true, type }];
      }
    });
  };

  const updateReqField = (index: number, updates: Partial<GameFieldRequirement>) => {
    setRequiredFields(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const removeReqField = (index: number) => {
    setRequiredFields(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomReqField = () => {
    const newId = 'custom_' + Date.now();
    setRequiredFields(prev => [
      ...prev,
      { id: newId, label: 'بيانات إضافية مطلوبة', placeholder: 'أدخل القيمة المطلوبة...', required: true, type: 'text' }
    ]);
  };

  // ── Save directly to Cloud Firestore Database ───────────────────────────────
  const handleSave = async () => {
    if (!form.name?.trim()) { setError('اسم المنتج مطلوب'); return; }
    if (!form.priceUnspecified && (form.price === undefined || form.price < 0)) { setError('السعر يجب أن يكون قيمة صحيحة'); return; }

    setSaving(true);
    setError('');

    const features = featuresText.split('\n').map(s => s.trim()).filter(Boolean);
    const cleanImg = ((form.imageUrl || form.image || '') as string).replace(/^"+|"+$/g, '').trim();

    const isNum = stockMode === 'numeric';
    const computedStock = isNum 
      ? (isUnlimitedStock ? 999999 : Number(numericStock !== undefined ? numericStock : 0))
      : stockItems.map(s => s.trim()).filter(Boolean).length;
    const finalStockLinks = isNum 
      ? [] 
      : stockItems.map(s => s.trim()).filter(Boolean);

    const payload: Record<string, any> = {
      ...form,
      name: form.name.trim(),
      description: form.description || '',
      price: hasVariants && variants.length > 0 ? Number(variants[0].price || 0) : Number(form.price || 0),
      priceUnspecified: Boolean(form.priceUnspecified),
      hasVariants: Boolean(hasVariants && variants.length > 0),
      variants: hasVariants ? variants.filter(v => v.name.trim()) : [],
      requiresCustomerInfo: Boolean(requiresCustomerInfo),
      requiredFields: requiresCustomerInfo ? requiredFields.filter(f => f.label.trim()) : [],
      currency: 'dzd',
      imageUrl: cleanImg,
      image: cleanImg,
      stockType: stockMode,
      unlimitedStock: isNum ? Boolean(isUnlimitedStock) : false,
      stock: computedStock,
      features,
      updatedAt: Date.now(),
    };

    if (form.originalPrice) {
      payload.originalPrice = Number(form.originalPrice);
    } else {
      delete payload.originalPrice;
    }

    // Recursively remove any undefined values so Firestore never throws 'Unsupported field value: undefined'
    const sanitizeForFirestore = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeForFirestore).filter(v => v !== undefined);
      }
      if (obj !== null && typeof obj === 'object') {
        const cleaned: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v !== undefined) {
            cleaned[k] = sanitizeForFirestore(v);
          }
        }
        return cleaned;
      }
      return obj;
    };

    const cleanPayload = sanitizeForFirestore(payload);

    const unitsPayload = {
      stockLinks: finalStockLinks,
      fileUrl: cleanPayload.fileUrl || null,
      updatedAt: Date.now(),
    };
    
    delete cleanPayload.fileUrl;
    delete cleanPayload.stockLinks;

    try {
      if (isEdit && productId) {
        await setDoc(doc(db, 'products', productId), { ...cleanPayload, createdAt: form.createdAt || Date.now() });
        await setDoc(doc(db, 'productUnits', productId), unitsPayload, { merge: true });
      } else {
        const newDocRef = await addDoc(collection(db, 'products'), { ...cleanPayload, createdAt: Date.now() });
        await setDoc(doc(db, 'productUnits', newDocRef.id), unitsPayload);
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls + ' mb-0'}>السعر (د.ج) *</label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(form.priceUnspecified)}
                      onChange={e => set('priceUnspecified', e.target.checked)}
                      className="rounded border-[var(--admin-border)] text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-bold text-[11px] text-amber-500">سعر غير محدد</span>
                  </label>
                </div>
                <input
                  className={inputCls + (form.priceUnspecified ? ' opacity-60 bg-amber-500/5 border-amber-500/30' : '')}
                  type="number"
                  min={0}
                  disabled={Boolean(form.priceUnspecified)}
                  value={form.priceUnspecified ? 0 : (form.price || 0)}
                  onChange={e => set('price', Number(e.target.value))}
                  placeholder={form.priceUnspecified ? 'السعر غير محدد (حسب الطلب)' : '0'}
                />
              </div>
              <div>
                <label className={labelCls}>السعر الأصلي (اختياري)</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  disabled={Boolean(form.priceUnspecified)}
                  value={form.priceUnspecified ? '' : (form.originalPrice || '')}
                  onChange={e => set('originalPrice', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="سيظهر مشطوباً"
                />
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

          
          {/* ── Product Variants / Bundles (باقات وأنواع المنتج - شحن ألعاب) ── */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-[var(--admin-text)]">أنواع وباقات المنتج (باقات الشحن)</h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={e => {
                    const checked = e.target.checked;
                    setHasVariants(checked);
                    if (checked && variants.length === 0) {
                      addVariant();
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {hasVariants ? (
              <div className="space-y-4 pt-1">
                {/* Quick Preset Buttons */}
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>قوالب جاهزة سريعة التجهيز بضغطة زر:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate('chatgpt')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      🤖 تفعيل حسابات واشتراكات (إيميل وباسورد)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate('cod')}
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--admin-bg)] border border-indigo-300 dark:border-indigo-800 text-xs font-bold text-[var(--admin-text)] hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                    >
                      🎮 باقات Call of Duty Mobile (8 باقات CP)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate('pubg')}
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--admin-bg)] border border-amber-300 dark:border-amber-800 text-xs font-bold text-[var(--admin-text)] hover:bg-amber-500 hover:text-black transition-all shadow-sm"
                    >
                      🪖 باقات ببجي موبايل (6 باقات UC)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate('freefire')}
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--admin-bg)] border border-sky-300 dark:border-sky-800 text-xs font-bold text-[var(--admin-text)] hover:bg-sky-500 hover:text-white transition-all shadow-sm"
                    >
                      💎 باقات فري فاير (5 باقات جواهر)
                    </button>
                  </div>
                </div>

                {/* Variants List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--admin-text-muted)] font-medium px-1">
                    <span>قائمة الباقات المتاحة للمشتري: ({variants.length} باقة)</span>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة باقة جديدة</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {variants.map((v, idx) => (
                      <div key={v.id || idx} className="p-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        {/* Number Index */}
                        <span className="w-6 h-6 rounded-md bg-[var(--admin-card)] border border-[var(--admin-border)] text-xs font-bold text-[var(--admin-text-muted)] flex items-center justify-center shrink-0 self-center sm:self-auto">
                          {idx + 1}
                        </span>

                        {/* Click to Upload Icon from Computer */}
                        <div className="relative shrink-0 self-center sm:self-auto">
                          <label
                            className="w-12 h-12 rounded-xl border-2 border-dashed border-[var(--admin-border)] hover:border-indigo-500 bg-[var(--admin-card)] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group shadow-xs"
                            title="اضغط هنا لرفع صورة أو أيقونة من حاسوبك (سيتم ضغطها تلقائياً)"
                          >
                            {v.image ? (
                              <img
                                src={v.image}
                                alt=""
                                className="w-full h-full object-contain p-1"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-1 text-[var(--admin-text-muted)] group-hover:text-indigo-500 transition-colors">
                                <Upload className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-bold mt-0.5">أيقونة</span>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleVariantIconUpload(idx, e)}
                            />
                          </label>
                          {v.image && (
                            <button
                              type="button"
                              onClick={() => updateVariant(idx, 'image', '')}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] font-bold shadow cursor-pointer transition-all"
                              title="حذف الأيقونة"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {/* Variant Name */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={v.name}
                            onChange={e => updateVariant(idx, 'name', e.target.value)}
                            placeholder="اسم الباقة أو مدة الاشتراك (مثال: اشتراك شهر، أو 80 CP)"
                            className={inputCls + ' text-xs font-bold'}
                          />
                        </div>

                        {/* Variant Price */}
                        <div className="w-full sm:w-64 flex flex-col sm:flex-row items-center gap-1.5 shrink-0">
                          <div className="flex w-full items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={v.price}
                              onChange={e => updateVariant(idx, 'price', Number(e.target.value))}
                              placeholder="السعر"
                              className={inputCls + ' text-xs font-mono font-bold w-full'}
                            />
                            <span className="text-xs text-[var(--admin-text-muted)] font-bold shrink-0">د.ج</span>
                          </div>
                          <div className="flex w-full items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={v.originalPrice || ''}
                              onChange={e => updateVariant(idx, 'originalPrice', e.target.value ? Number(e.target.value) : undefined)}
                              placeholder="أصلي مشطوب"
                              className={inputCls + ' text-xs font-mono font-bold w-full border-amber-500/30'}
                            />
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeVariant(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 self-end sm:self-auto"
                          title="حذف هذه الباقة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addVariant}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-[var(--admin-border)] hover:border-indigo-500 text-xs font-bold text-[var(--admin-text-muted)] hover:text-indigo-500 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة باقة أخرى للمنتج</span>
                  </button>
                </div>


              </div>
            ) : (
              <p className="text-xs text-[var(--admin-text-muted)]">
                خيار الباقات غير مفعّل. قم بتفعيله لإضافة خيارات وباقات أسعار متعددة لنفس المنتج (مثل 80 CP، 420 CP، إلخ).
              </p>
            )}
          </div>

          {/* ── طلب بيانات الحساب / التفعيل من المشتري (Customer Account Credentials Request) ── */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--admin-border)] pb-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-sm font-bold text-[var(--admin-text)]">
                    طلب بيانات الحساب من المشتري (للتفعيل والشحن)
                  </h2>
                  {requiresCustomerInfo ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      مفعّل ✓
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">
                      مقفل / معطّل ✕
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  زر تفعيل أو قفل طلب بيانات العميل (مثل البريد وكلمة المرور لتفعيل الاشتراكات كـ ChatGPT/Claude أو Player ID لشحن الألعاب).
                </p>
              </div>

              {/* Master Toggle Switch */}
              <div className="flex items-center gap-3 self-start sm:self-center">
                <span className="text-xs font-bold text-[var(--admin-text)]">
                  {requiresCustomerInfo ? 'مفعّل' : 'معطّل'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={requiresCustomerInfo}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setRequiresCustomerInfo(enabled);
                      if (enabled && requiredFields.length === 0) {
                        setRequiredFields([
                          { id: 'game_email', label: 'البريد الإلكتروني للحساب (Email)', placeholder: 'أدخل بريد حسابك المراد تفعيله', required: true, type: 'text' },
                          { id: 'game_password', label: 'كلمة مرور الحساب (Password)', placeholder: 'أدخل كلمة مرور الحساب للتفعيل', required: true, type: 'password' },
                        ]);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {requiresCustomerInfo ? (
              <div className="space-y-4 pt-1">
                {/* Quick Presets / Selection */}
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>اختيار سريع للحقول الشائعة:</span>
                    </span>
                    <span className="text-[11px] font-normal text-[var(--admin-text-muted)]">
                      يمكنك تحديد الحقول أو تعديل نصوصها أدناه
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleReqField('game_email', 'البريد الإلكتروني للحساب (Email)', 'أدخل بريد حسابك المراد تفعيله')}
                      className={`p-2.5 rounded-lg border text-right transition-all flex items-center gap-2 ${
                        requiredFields.some(f => f.id === 'game_email')
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={requiredFields.some(f => f.id === 'game_email')}
                        className="rounded text-indigo-600 pointer-events-none"
                      />
                      <span>البريد الإلكتروني (Email)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleReqField('game_password', 'كلمة مرور الحساب (Password)', 'أدخل كلمة مرور الحساب للتفعيل', 'password')}
                      className={`p-2.5 rounded-lg border text-right transition-all flex items-center gap-2 ${
                        requiredFields.some(f => f.id === 'game_password')
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={requiredFields.some(f => f.id === 'game_password')}
                        className="rounded text-indigo-600 pointer-events-none"
                      />
                      <span>كلمة مرور الحساب (Password)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleReqField('player_id', 'معرف اللاعب (Player ID)', 'مثال: 5123456789')}
                      className={`p-2.5 rounded-lg border text-right transition-all flex items-center gap-2 ${
                        requiredFields.some(f => f.id === 'player_id')
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={requiredFields.some(f => f.id === 'player_id')}
                        className="rounded text-indigo-600 pointer-events-none"
                      />
                      <span>معرف اللاعب (Player ID)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleReqField('game_server', 'السيرفر / المنطقة (Server / Region)', 'مثال: الشرق الأوسط / Europe')}
                      className={`p-2.5 rounded-lg border text-right transition-all flex items-center gap-2 ${
                        requiredFields.some(f => f.id === 'game_server')
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={requiredFields.some(f => f.id === 'game_server')}
                        className="rounded text-indigo-600 pointer-events-none"
                      />
                      <span>السيرفر أو المنطقة (Server)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleReqField('customer_phone', 'رقم الهاتف (للتواصل أو الشحن)', 'مثال: 0555123456')}
                      className={`p-2.5 rounded-lg border text-right transition-all flex items-center gap-2 ${
                        requiredFields.some(f => f.id === 'customer_phone')
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={requiredFields.some(f => f.id === 'customer_phone')}
                        className="rounded text-indigo-600 pointer-events-none"
                      />
                      <span>رقم الهاتف (Phone)</span>
                    </button>

                  </div>
                </div>

                {/* Detailed Fields List & Customization */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--admin-text-muted)] font-medium px-1">
                    <span>قائمة الحقول المطلوبة من العميل: ({requiredFields.length} حقل)</span>
                    <button
                      type="button"
                      onClick={addCustomReqField}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة حقل مخصص آخر</span>
                    </button>
                  </div>

                  {requiredFields.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-[var(--admin-border)] text-center text-xs text-[var(--admin-text-muted)]">
                      لم يتم تفعيل أي حقل بعد. انقر على أحد الخيارات السريعة أعلاه أو اضغط "إضافة حقل مخصص آخر".
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {requiredFields.map((field, idx) => (
                        <div
                          key={field.id || idx}
                          className="p-3.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] space-y-2.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[var(--admin-text)] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[11px] font-mono">
                                {idx + 1}
                              </span>
                              <span>الحقل المطلوب #{idx + 1}</span>
                            </span>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--admin-text)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required !== false}
                                  onChange={(e) => updateReqField(idx, { required: e.target.checked })}
                                  className="rounded text-indigo-600"
                                />
                                <span>حقل إجباري</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => removeReqField(idx)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="حذف هذا الحقل"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-bold text-[var(--admin-text-muted)] mb-1">اسم الحقل (Label المعروض للمشتري)</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateReqField(idx, { label: e.target.value })}
                                placeholder="مثال: البريد الإلكتروني للحساب"
                                className="w-full px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] text-xs text-[var(--admin-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[var(--admin-text-muted)] mb-1">النص التوضيحي داخل الخانة (Placeholder)</label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => updateReqField(idx, { placeholder: e.target.value })}
                                placeholder="مثال: أدخل بريد حسابك المراد تفعيله..."
                                className="w-full px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] text-xs text-[var(--admin-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="leading-relaxed">
                  🔒 <strong className="text-[var(--admin-text)]">طلب البيانات مقفل وموقوف لهذا المنتج.</strong> لن يظهر للمشتري أي خانات لطلب البريد أو كلمة المرور أو الآيدي في صفحة المنتج أو الدفع.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRequiresCustomerInfo(true);
                    if (requiredFields.length === 0) {
                      setRequiredFields([
                        { id: 'game_email', label: 'البريد الإلكتروني للحساب (Email)', placeholder: 'أدخل بريد حسابك المراد تفعيله', required: true, type: 'text' },
                        { id: 'game_password', label: 'كلمة مرور الحساب (Password)', placeholder: 'أدخل كلمة مرور الحساب للتفعيل', required: true, type: 'password' },
                      ]);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shrink-0 self-start sm:self-center shadow-sm"
                >
                  ⚡ تفعيل طلب البيانات
                </button>
              </div>
            )}
          </div>

          {/* ── نظام إدارة المخزون (Stock Management) ──────────────────────────── */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--admin-border)] pb-3 gap-2">
              <div>
                <h2 className="text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>طريقة تحديد المخزون والتوفر</span>
                </h2>
                <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                  اختر بين التحديد بالعدد (للشحن وتفعيل الحسابات كـ ChatGPT) أو بالوحدات المعزولة المجهزة مسبقاً
                </p>
              </div>

              {/* Status Badge */}
              <span className={`text-xs font-bold px-3 py-1 rounded-full self-start sm:self-center transition-colors ${
                stockMode === 'numeric'
                  ? (isUnlimitedStock
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : numericStock === 0
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : numericStock < 20
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20')
                  : (filledCount === 0
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : filledCount < 20
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20')
              }`}>
                {stockMode === 'numeric' 
                  ? (isUnlimitedStock ? (
                      'مخزون غير محدود ♾️'
                    ) : numericStock === 0 ? (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                        <span>نفذ المخزون (0)</span>
                        <span>🔴</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className={numericStock < 20 ? 'text-amber-600 dark:text-amber-400 font-black' : ''}>
                          {numericStock}
                        </span>
                        <span>متوفر بالعدد</span>
                        {numericStock < 20 && <span>⚠️</span>}
                      </span>
                    ))
                  : (
                    filledCount === 0 ? (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                        <span>نفذ المخزون (0)</span>
                        <span>🔴</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className={filledCount < 20 ? 'text-amber-600 dark:text-amber-400 font-black' : ''}>
                          {filledCount}
                        </span>
                        <span>حساب معزول</span>
                        {filledCount < 20 && <span>⚠️</span>}
                      </span>
                    )
                  )}
              </span>
            </div>

            {/* Mode Selector Tabs (2 Big Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Numeric Stock (Priority) */}
              <button
                type="button"
                onClick={() => setStockMode('numeric')}
                className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer ${
                  stockMode === 'numeric'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-[var(--admin-border)] bg-[var(--admin-bg)] hover:border-emerald-500/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-xs sm:text-sm text-[var(--admin-text)] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">#</span>
                    <span>1. تحديد المخزون بالعدد (الأولوية)</span>
                  </span>
                  {stockMode === 'numeric' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--admin-text-muted)] leading-relaxed">
                  يُقفل خيار الحسابات المعزولة. مناسب لتفعيل حسابات <strong>ChatGPT</strong>، وشحن <strong>الألعاب</strong> (تطلب إيميل العميل وكوده وتفعّل له).
                </p>
              </button>

              {/* Option 2: Isolated Units */}
              <button
                type="button"
                onClick={() => setStockMode('units')}
                className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer ${
                  stockMode === 'units'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/30'
                    : 'border-[var(--admin-border)] bg-[var(--admin-bg)] hover:border-indigo-500/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-xs sm:text-sm text-[var(--admin-text)] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">📋</span>
                    <span>2. وحدات تسليم آلي معزولة</span>
                  </span>
                  {stockMode === 'units' && (
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--admin-text-muted)] leading-relaxed">
                  تسليم تلقائي فوري بعد الدفع. تضع قائمة حسابات جاهزة أو أكواد، والكود يسلم العميل واحدة ويحذفها تلقائياً.
                </p>
              </button>
            </div>

            {/* Mode 1 UI: Numeric Stock */}
            {stockMode === 'numeric' ? (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[var(--admin-text)]">
                    الكمية المتوفرة للبيع بالعدد:
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <input
                      type="checkbox"
                      checked={isUnlimitedStock}
                      onChange={(e) => setIsUnlimitedStock(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>مخزون غير محدود (متوفر دائماً ♾️)</span>
                  </label>
                </div>

                {!isUnlimitedStock && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={0}
                          value={numericStock}
                          onChange={(e) => setNumericStock(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="أدخل عدد الوحدات المتاحة (مثال: 50)"
                          className={`${inputCls} font-mono text-base font-bold transition-all ${
                            numericStock < 20
                              ? '!text-red-600 dark:!text-red-400 border-red-500/70 bg-red-500/5 focus:!ring-red-500 focus:!border-red-500'
                              : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40 focus:ring-emerald-500'
                          }`}
                        />
                        {numericStock < 20 && (
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 pointer-events-none">
                            <span>مخزون قليل (&lt; 20) ⚠️</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${numericStock < 20 ? 'text-red-600 dark:text-red-400' : 'text-[var(--admin-text-muted)]'}`}>
                        وحدة متاحة
                      </span>
                    </div>

                    {numericStock < 20 && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                        <span>⚠️ تنبيه: الكمية المتبقية أقل من 20 وحدة (متبقي </span>
                        <strong className="font-black underline">{numericStock}</strong>
                        <span> فقط). سيظهر الرقم باللون الأحمر للفت الانتباه.</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="p-3 rounded-lg bg-[var(--admin-card)] border border-emerald-500/20 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>🔒 تم إغلاق وحجب خيار الحسابات المعزولة (stockLinks) تلقائياً.</span>
                  </div>
                  <p className="text-[11px] text-[var(--admin-text-muted)] leading-relaxed">
                    لا يتطلب هذا الوضع أي حسابات مجهزة مسبقاً. عند قيام العميل بالشراء، سيصلك إيميل العميل وبياناته المطلوبة في لوحة التحكم وتفعل له حسابه يدوياً.
                  </p>
                </div>
              </div>
            ) : (
              /* Mode 2 UI: Isolated units */
              <div className="space-y-3 animate-in fade-in duration-150">
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
            )}
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
                  <img src={form.imageUrl.replace(/^"+|"+$/g, '').trim()} alt="صورة المنتج" className="w-full h-full object-contain" />
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

          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#0088cc]">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
              <span>زر التليجرام (Telegram Link)</span>
            </h2>
            <p className="text-xs text-[var(--admin-text-muted)]">أدخل رابط التليجرام أو المعرف (مثال: https://t.me/username) ليظهر كزر تواصل في هذا المنتج</p>
            <input className={inputCls} value={form.telegramLink || ''} onChange={e => set('telegramLink', e.target.value)} placeholder="https://t.me/..." />
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
