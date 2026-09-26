'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Product } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { Plus, Trash2, Edit, Package } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState(1000);
  const [newProdCategory, setNewProdCategory] = useState('منتجات');
  const [newProdFileType, setNewProdFileType] = useState('PDF');
  const [newProdFileUrl, setNewProdFileUrl] = useState('');
  const [newProdStockLinks, setNewProdStockLinks] = useState<string[]>(['']);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [newProdFeatures, setNewProdFeatures] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setDataLoading(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        const list: Product[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Product));
        setProducts(list);
      } else {
        setProducts(INITIAL_PRODUCTS);
      }
    } catch {
      setProducts(INITIAL_PRODUCTS);
    } finally {
      setDataLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProductId(null);
    setNewProdName(''); setNewProdDesc(''); setNewProdPrice(1000);
    setNewProdCategory('منتجات'); setNewProdFileType('PDF');
    setNewProdFileUrl(''); setNewProdStockLinks(['']); setNewProdFeatures('');
    setSelectedImage(null); setSaveError('');
    setShowAddModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProductId(p.id);
    setNewProdName(p.name); setNewProdDesc(p.description);
    setNewProdPrice(p.price); setNewProdCategory(p.category || 'منتجات');
    setNewProdFileType(p.fileType || 'PDF'); setNewProdFileUrl(p.fileUrl || '');
    setNewProdStockLinks(p.stockLinks && p.stockLinks.length > 0 ? p.stockLinks : ['']);
    setNewProdFeatures(p.features ? p.features.join('\n') : '');
    setSelectedImage(null); setSaveError('');
    setShowAddModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    if (!newProdName || !newProdPrice) return;
    setIsUploading(true);
    try {
      setSaveError('جاري تحضير البيانات...');
      let finalImageUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
      if (editingProductId) {
        const ex = products.find(p => p.id === editingProductId);
        if (ex) finalImageUrl = ex.imageUrl;
      }

      if (selectedImage) {
        setSaveError('جاري ضغط الصورة...');
        finalImageUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          const reader = new FileReader();
          reader.onload = e => {
            img.onload = () => {
              const MAX = 800;
              let w = img.width, h = img.height;
              if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else { w = Math.round(w * MAX / h); h = MAX; }
              }
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.onerror = reject;
            img.src = e.target!.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedImage);
        });
      }

      const featuresArr = newProdFeatures.split('\n').map(f => f.trim()).filter(Boolean);
      const stockLinksArr = newProdStockLinks.map(l => l.trim()).filter(Boolean);
      const payload: any = {
        name: newProdName, description: newProdDesc, price: Number(newProdPrice),
        currency: 'dzd', category: newProdCategory, fileType: newProdFileType,
        imageUrl: finalImageUrl,
        features: featuresArr.length > 0 ? featuresArr : ['ملف ممتاز عالي الجودة'],
        createdAt: Date.now(),
      };
      if (newProdCategory === 'منتجات رقمية') {
        payload.stockLinks = stockLinksArr; payload.fileUrl = '';
      } else {
        payload.fileUrl = newProdFileUrl; payload.stockLinks = stockLinksArr;
      }

      setSaveError('جاري الحفظ...');
      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), payload);
        setProducts(products.map(p => p.id === editingProductId ? { id: editingProductId, ...payload } as Product : p));
      } else {
        const ref = await addDoc(collection(db, 'products'), payload);
        setProducts([{ id: ref.id, ...payload } as Product, ...products]);
      }
      setSaveError('');
      setShowAddModal(false);
      setEditingProductId(null);
    } catch (err: any) {
      setSaveError('خطأ: ' + err?.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    await deleteDoc(doc(db, 'products', id));
    setProducts(products.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white">المنتجات 📦</h1>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-slate-950 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-colors">
          <Plus className="w-4 h-4" /> إضافة منتج
        </button>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div className="flex gap-3">
                <img src={p.imageUrl} alt={p.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-slate-800" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm truncate">{p.name}</h3>
                  <p className="text-emerald-400 text-xs font-bold">{p.price.toLocaleString()} د.ج</p>
                  <p className="text-slate-400 text-xs">{p.category} • {p.fileType}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-500">
                  {p.stockLinks ? `${p.stockLinks.length} رابط` : p.fileUrl ? 'رابط موحد' : 'بلا رابط'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(p)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteProduct(p.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg p-6 rounded-3xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-bold text-lg text-white">{editingProductId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingProductId(null); }} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">اسم المنتج</label>
                <input type="text" required value={newProdName} onChange={e => setNewProdName(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" placeholder="مثال: اشتراك Gemini Pro" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">السعر (د.ج)</label>
                  <input type="number" required min={100} value={newProdPrice} onChange={e => setNewProdPrice(Number(e.target.value))}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">التصنيف</label>
                  <select value={newProdCategory} onChange={e => setNewProdCategory(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
                    <option value="خدمات">خدمات</option>
                    <option value="اشتراكات">اشتراكات</option>
                    <option value="منتجات">منتجات</option>
                    <option value="منتجات رقمية">منتجات رقمية (مخزون روابط)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">صيغة الملف</label>
                <input type="text" value={newProdFileType} onChange={e => setNewProdFileType(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" dir="ltr" placeholder="PDF" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">الوصف</label>
                <textarea rows={3} value={newProdDesc} onChange={e => setNewProdDesc(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">صورة المنتج</label>
                <div className="flex gap-2">
                  <input type="file" accept="image/*" onChange={e => setSelectedImage(e.target.files?.[0] || null)}
                    className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs" />
                  {selectedImage && (
                    <button type="button" onClick={() => setSelectedImage(null)} className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {newProdCategory === 'منتجات رقمية' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">روابط المخزون (رابط لكل مشتري)</label>
                  {newProdStockLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="url" value={link} onChange={e => {
                        const l = [...newProdStockLinks]; l[idx] = e.target.value; setNewProdStockLinks(l);
                      }} className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs" dir="ltr" placeholder="https://..." />
                      <button type="button" onClick={() => setNewProdStockLinks(newProdStockLinks.filter((_,i) => i !== idx))}
                        className="p-2.5 bg-red-500/10 text-red-400 rounded-xl"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewProdStockLinks([...newProdStockLinks, ''])}
                    className="w-full p-2 border border-dashed border-slate-700 text-slate-400 rounded-xl text-xs hover:bg-slate-800 flex items-center justify-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> إضافة رابط
                  </button>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">روابط الملف / المخزون</label>
                  {newProdStockLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input type="url" value={link} onChange={e => {
                        const l = [...newProdStockLinks]; l[idx] = e.target.value; setNewProdStockLinks(l);
                      }} className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs" dir="ltr" placeholder="https://..." />
                      <button type="button" onClick={() => setNewProdStockLinks(newProdStockLinks.filter((_,i) => i !== idx))}
                        className="p-2.5 bg-red-500/10 text-red-400 rounded-xl"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewProdStockLinks([...newProdStockLinks, ''])}
                    className="w-full p-2 border border-dashed border-slate-700 text-slate-400 rounded-xl text-xs hover:bg-slate-800 flex items-center justify-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> إضافة رابط
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">المميزات (سطر لكل ميزة)</label>
                <textarea rows={2} value={newProdFeatures} onChange={e => setNewProdFeatures(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" />
              </div>

              {saveError && <p className="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl">{saveError}</p>}

              <div className="flex gap-2">
                <button type="submit" disabled={isUploading}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm disabled:opacity-50">
                  {isUploading ? 'جاري الحفظ...' : editingProductId ? 'حفظ التعديلات' : 'نشر المنتج'}
                </button>
                {isUploading && (
                  <button type="button" onClick={() => setIsUploading(false)}
                    className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-bold">
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
