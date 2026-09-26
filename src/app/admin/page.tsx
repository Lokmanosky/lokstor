'use client';

import { useEffect, useState } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Product, Order } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { Lock, LogOut, Plus, Trash2, Edit, Package, ShoppingCart, Upload, FileText, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Auth Form State
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Admin Dashboard State
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  // Add Product Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdDesc, setNewProdDesc] = useState<string>('');
  const [newProdPrice, setNewProdPrice] = useState<number>(1000);
  const [newProdCategory, setNewProdCategory] = useState<string>('منتجات رقمية');
  const [newProdFileType, setNewProdFileType] = useState<string>('PDF');
  const [newProdFileUrl, setNewProdFileUrl] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [newProdFeatures, setNewProdFeatures] = useState<string>('');
  
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        loadAdminData();
      }
    });
    return () => unsubscribe();
  }, []);

  const loadAdminData = async () => {
    setDataLoading(true);
    try {
      // 1. Fetch Products
      const prodSnap = await getDocs(collection(db, 'products'));
      const prodList: Product[] = [];
      if (!prodSnap.empty) {
        prodSnap.forEach((d) => prodList.push({ id: d.id, ...d.data() } as Product));
        setProducts(prodList);
      } else {
        setProducts(INITIAL_PRODUCTS);
      }

      // 2. Fetch Orders
      const orderSnap = await getDocs(collection(db, 'orders'));
      const orderList: Order[] = [];
      if (!orderSnap.empty) {
        orderSnap.forEach((d) => orderList.push({ id: d.id, ...d.data() } as Order));
        orderList.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        setOrders(orderList);
      }
    } catch (err) {
      console.warn('Admin load data error:', err);
      setProducts(INITIAL_PRODUCTS);
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Firebase Auth Login Error:', err);
      setAuthError('فشل تسجيل الدخول. يرجى التثبت من البريد الإلكتروني وكلمة المرور.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const openEditModal = (p: Product) => {
    setEditingProductId(p.id);
    setNewProdName(p.name);
    setNewProdDesc(p.description);
    setNewProdPrice(p.price);
    setNewProdCategory(p.category || 'منتجات رقمية');
    setNewProdFileType(p.fileType || 'PDF');
    setNewProdFileUrl(p.fileUrl || '');
    setNewProdFeatures(p.features ? p.features.join('\n') : '');
    setSelectedImage(null);
    setShowAddModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;

    setIsUploading(true);
    try {
      let finalImageUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
      if (editingProductId) {
        const existingProd = products.find(p => p.id === editingProductId);
        if (existingProd) finalImageUrl = existingProd.imageUrl;
      }

      // Upload file to Firebase Storage if selected
      if (selectedImage) {
        const imageRef = ref(storage, `images/products/${Date.now()}_${selectedImage.name}`);
        const uploadResult = await uploadBytes(imageRef, selectedImage);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      

      const featuresArr = newProdFeatures
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const productPayload = {
        name: newProdName,
        description: newProdDesc,
        price: Number(newProdPrice),
        currency: 'dzd',
        category: newProdCategory,
        fileType: newProdFileType,
        fileUrl: newProdFileUrl,
        imageUrl: finalImageUrl,
        features: featuresArr.length > 0 ? featuresArr : ['ملف ممتاز عالي الجودة'],
        createdAt: Date.now(),
      };

      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), productPayload);
        setProducts(products.map(p => p.id === editingProductId ? { id: editingProductId, ...productPayload } as Product : p));
      } else {
        const docRef = await addDoc(collection(db, 'products'), productPayload);
        setProducts([{ id: docRef.id, ...productPayload } as Product, ...products]);
      }

      // Reset Form
      setNewProdName('');
      setNewProdDesc('');
      setNewProdPrice(1000);
      setNewProdFileUrl('');
      setNewProdFeatures('');
      setSelectedImage(null);
      setEditingProductId(null);
      setShowAddModal(false);
    } catch (err: any) {
      console.error('Add product error:', err);
      alert('حدث خطأ أثناء حفظ المنتج: ' + err?.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذا المنتج؟')) return;
    try {
      await deleteDoc(doc(db, 'products', prodId));
      setProducts(products.filter((p) => p.id !== prodId));
    } catch (err: any) {
      console.error('Delete product error:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">جاري التحقق من صلاحيات الدخول...</p>
      </div>
    );
  }

  // Not logged in -> Show Login Card
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="glass-card p-8 rounded-3xl space-y-6 border border-slate-800 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white">لوحة التحكم المشرفة</h1>
            <p className="text-slate-400 text-xs">سجّل دخولك لإدارة المنتجات الرقمية والطلبات</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">البريد الإلكتروني للأدمن</label>
              <input
                type="email"
                required
                placeholder="admin@lokstor.dz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">كلمة المرور</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="chargily-btn w-full py-3.5 rounded-xl text-slate-950 font-black text-xs"
            >
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard Content
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">لوحة تحكم lokstor</h1>
            <p className="text-xs text-slate-400">مرحباً {currentUser.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingProductId(null);
              setNewProdName('');
              setNewProdDesc('');
              setNewProdPrice(1000);
              setNewProdCategory('منتجات رقمية');
              setNewProdFileType('PDF');
              setNewProdFileUrl('');
              setNewProdFeatures('');
              setSelectedImage(null);
              setShowAddModal(true);
            }}
            className="chargily-btn px-4 py-2.5 rounded-xl text-slate-950 font-bold text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'products'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>إدارة المنتجات ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>سجل المبيعات والطلبات ({orders.length})</span>
        </button>
      </div>

      {/* Tab: Products */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div key={p.id} className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4 relative">
              <div className="flex gap-4">
                <img src={p.imageUrl} alt={p.name} className="w-20 h-20 rounded-xl object-cover bg-slate-900" />
                <div className="space-y-1 flex-grow">
                  <h3 className="font-bold text-sm text-white leading-snug">{p.name}</h3>
                  <span className="text-[11px] text-emerald-400 font-semibold block">{p.price} د.ج</span>
                  <span className="text-[11px] text-slate-400 block">{p.category || 'عام'} • {p.fileType}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px] truncate max-w-[180px]">مسار: {p.fileUrl}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    title="تعديل المنتج"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="حذف المنتج"
                >
                  <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="glass-card rounded-3xl overflow-hidden border border-slate-800">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">لا توجد طلبات مسجلة حتى الآن</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4 font-bold">مُعرّف الطلب</th>
                    <th className="p-4 font-bold">المنتج</th>
                    <th className="p-4 font-bold">اسم العميل</th>
                    <th className="p-4 font-bold">البريد الإلكتروني</th>
                    <th className="p-4 font-bold">المبلغ</th>
                    <th className="p-4 font-bold">حالة الدفع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-900/40">
                      <td className="p-4 font-mono font-bold text-white">{o.id}</td>
                      <td className="p-4 font-semibold text-white">{o.productName}</td>
                      <td className="p-4">{o.customerName}</td>
                      <td className="p-4 text-emerald-400">{o.customerEmail}</td>
                      <td className="p-4 font-bold text-white">{o.productPrice} د.ج</td>
                      <td className="p-4">
                        {o.status === 'paid' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                            مكتمل ومدفوع
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                            قيد الانتظار
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg p-6 rounded-3xl border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-bold text-lg text-white">{editingProductId ? "تعديل المنتج" : "إضافة منتج رقمي جديد"}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingProductId(null); }} className="text-slate-400 hover:text-white text-xs">
                إغلاق ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-300 block">اسم المنتج الرقمي</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كتاب البرمجة بلغة Python"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">السعر (د.ج)</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">التصنيف</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="منتجات رقمية">منتجات رقمية</option>
                    <option value="كتب ومستندات PDF">كتب ومستندات PDF</option>
                    <option value="قوالب برمجية وسكربتات">قوالب برمجية وسكربتات</option>
                    <option value="كورسات ودروس فيديو">كورسات ودروس فيديو</option>
                    <option value="تصاميم وملفات گرافيك">تصاميم وملفات گرافيك</option>
                    <option value="حسابات واشتراكات رقمية">حسابات واشتراكات رقمية</option>
                    <option value="أدوات وتطبيقات">أدوات وتطبيقات</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-300 block">الوصف التفصيلي</label>
                <textarea
                  rows={3}
                  placeholder="اكتب وصفاً جذاباً يشرح محتوى الملف..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-300 block">صورة المنتج (من الحاسوب)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-xs"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-300 block">رابط الملف الرقمي (Drive أو غيره)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={newProdFileUrl}
                  onChange={(e) => setNewProdFileUrl(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-300 block">مميزات المنتج (سطر لكل ميزة)</label>
                <textarea
                  rows={2}
                  placeholder="مثال:&#10;شامل لـ 100 صفحة&#10;تحديثات مجانية"
                  value={newProdFeatures}
                  onChange={(e) => setNewProdFeatures(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="chargily-btn w-full py-3.5 rounded-xl text-slate-950 font-extrabold text-xs"
              >
                {isUploading ? 'جاري الحفظ...' : (editingProductId ? 'حفظ التعديلات' : 'حفظ ونشر المنتج الان')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

