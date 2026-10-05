'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, getDocs
} from 'firebase/firestore';
import {
  Tag, Plus, Trash2, Edit3, Check, X, Copy, ToggleLeft, ToggleRight,
  Percent, Hash, Globe, Package, AlertTriangle, CheckCircle, Search, Loader2
} from 'lucide-react';
import type { DiscountCode } from '@/types/discount';

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    scope: 'all' as 'all' | 'product',
    productId: '',
    isActive: true,
    maxUsage: '',
    minOrderAmount: '',
    expiresAt: '',
  });

  // Generic confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Load discount codes
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'discountCodes'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list: DiscountCode[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as DiscountCode));
        setCodes(list);
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // Load products for product-specific discount
  useEffect(() => {
    getDocs(collection(db, 'products')).then(snap => {
      const list: { id: string; name: string }[] = [];
      snap.forEach(d => list.push({ id: d.id, name: (d.data() as any).name || d.id }));
      setProducts(list);
    });
  }, []);

  const resetForm = () => {
    setForm({
      code: '', type: 'percentage', value: '', scope: 'all',
      productId: '', isActive: true, maxUsage: '', minOrderAmount: '', expiresAt: ''
    });
    setEditingId(null);
    setFormMsg(null);
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (c: DiscountCode) => {
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      scope: c.scope,
      productId: c.productId || '',
      isActive: c.isActive,
      maxUsage: c.maxUsage ? String(c.maxUsage) : '',
      minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : '',
      expiresAt: c.expiresAt
        ? new Date(c.expiresAt).toISOString().slice(0, 10)
        : '',
    });
    setEditingId(c.id);
    setIsFormOpen(true);
    setFormMsg(null);
  };

  const handleSave = async () => {
    if (!form.code.trim()) return setFormMsg({ type: 'error', text: 'أدخل كود الخصم' });
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)
      return setFormMsg({ type: 'error', text: 'أدخل قيمة الخصم بشكل صحيح' });
    if (form.type === 'percentage' && Number(form.value) > 100)
      return setFormMsg({ type: 'error', text: 'النسبة يجب أن تكون أقل من 100%' });
    if (form.scope === 'product' && !form.productId)
      return setFormMsg({ type: 'error', text: 'اختر المنتج المخصص له الكود' });

    setIsSaving(true);
    try {
      const selectedProduct = products.find(p => p.id === form.productId);
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        scope: form.scope,
        productId: form.scope === 'product' ? form.productId : undefined,
        productName: form.scope === 'product' ? selectedProduct?.name : undefined,
        isActive: form.isActive,
        usageCount: editingId ? (codes.find(c => c.id === editingId)?.usageCount || 0) : 0,
        maxUsage: form.maxUsage ? Number(form.maxUsage) : undefined,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
        createdAt: editingId
          ? (codes.find(c => c.id === editingId)?.createdAt || Date.now())
          : Date.now(),
      };

      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      if (editingId) {
        await updateDoc(doc(db, 'discountCodes', editingId), payload as any);
        setFormMsg({ type: 'success', text: 'تم تحديث الكود بنجاح!' });
      } else {
        await addDoc(collection(db, 'discountCodes'), payload);
        setFormMsg({ type: 'success', text: 'تم إنشاء كود الخصم بنجاح!' });
        resetForm();
      }
    } catch (e: any) {
      setFormMsg({ type: 'error', text: 'حدث خطأ: ' + e.message });
    }
    setIsSaving(false);
  };

  const handleToggleActive = async (c: DiscountCode) => {
    await updateDoc(doc(db, 'discountCodes', c.id), { isActive: !c.isActive });
  };

  const handleDelete = (c: DiscountCode) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف كود الخصم',
      message: `هل أنت متأكد من حذف كود "${c.code}" نهائياً؟`,
      onConfirm: async () => {
        await deleteDoc(doc(db, 'discountCodes', c.id));
      }
    });
  };

  const filtered = codes.filter(c =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.productName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isExpired = (c: DiscountCode) =>
    c.expiresAt ? c.expiresAt < Date.now() : false;

  const isMaxedOut = (c: DiscountCode) =>
    c.maxUsage ? c.usageCount >= c.maxUsage : false;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[var(--admin-text)]">أكواد الخصم</h1>
            <p className="text-xs text-[var(--admin-text-muted)]">{codes.length} كود إجمالاً</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>كود جديد</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-text-muted)]" />
        <input
          type="text"
          placeholder="ابحث عن كود..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Form Panel */}
      {isFormOpen && (
        <div className="bg-[var(--admin-card)] border-2 border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
            <h2 className="font-black text-[var(--admin-text)] flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-500" />
              {editingId ? 'تعديل كود الخصم' : 'إنشاء كود خصم جديد'}
            </h2>
            <button
              onClick={() => { setIsFormOpen(false); resetForm(); }}
              className="p-1 rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--admin-text)]">كود الخصم *</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="مثال: SAVE20"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm font-mono font-bold text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--admin-text)]">نوع الخصم *</label>
              <div className="flex rounded-xl border border-[var(--admin-border)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, type: 'percentage' }))}
                  className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    form.type === 'percentage'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  نسبة مئوية
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, type: 'fixed' }))}
                  className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    form.type === 'fixed'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  مبلغ ثابت
                </button>
              </div>
            </div>

            {/* Value */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--admin-text)]">
                قيمة الخصم * {form.type === 'percentage' ? '(%)' : '(د.ج)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.value}
                  onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                  placeholder={form.type === 'percentage' ? '20' : '500'}
                  min="0"
                  max={form.type === 'percentage' ? '100' : undefined}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm font-bold text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--admin-text-muted)]">
                  {form.type === 'percentage' ? '%' : 'د.ج'}
                </span>
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--admin-text)]">نطاق الخصم *</label>
              <div className="flex rounded-xl border border-[var(--admin-border)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, scope: 'all', productId: '' }))}
                  className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    form.scope === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  كل الموقع
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, scope: 'product' }))}
                  className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    form.scope === 'product'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  منتج محدد
                </button>
              </div>
            </div>

            {/* Product selector */}
            {form.scope === 'product' && (
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-[var(--admin-text)]">اختر المنتج *</label>
                <select
                  value={form.productId}
                  onChange={e => setForm(p => ({ ...p, productId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">— اختر منتجاً —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Min Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--admin-text)]">
                الحد الأدنى للطلب (اختياري، د.ج)
              </label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={e => setForm(p => ({ ...p, minOrderAmount: e.target.value }))}
                placeholder="مثال: 1000"
                min="0"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Max Usage */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--admin-text)]">
                الحد الأقصى للاستخدام (اختياري)
              </label>
              <input
                type="number"
                value={form.maxUsage}
                onChange={e => setForm(p => ({ ...p, maxUsage: e.target.value }))}
                placeholder="مثال: 100 (اتركه فارغاً = بلا حد)"
                min="1"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Expiry */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--admin-text)]">
                تاريخ الانتهاء (اختياري)
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Active toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--admin-text)]">حالة الكود</label>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                className={`w-full py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  form.isActive
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-muted)]'
                }`}
              >
                {form.isActive
                  ? <><ToggleRight className="w-5 h-5" /> مفعّل</>
                  : <><ToggleLeft className="w-5 h-5" /> معطّل</>
                }
              </button>
            </div>
          </div>

          {/* Feedback */}
          {formMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              formMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}>
              {formMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {formMsg.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1 border-t border-[var(--admin-border)]">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId ? 'حفظ التعديلات' : 'إنشاء الكود'}
            </button>
            <button
              onClick={() => { setIsFormOpen(false); resetForm(); }}
              className="py-2.5 px-4 rounded-xl border border-[var(--admin-border)] text-[var(--admin-text)] font-bold text-sm hover:bg-[var(--admin-hover)] transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Codes Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--admin-text-muted)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--admin-text-muted)]">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">{searchQuery ? 'لا توجد نتائج' : 'لا توجد أكواد خصم بعد'}</p>
          {!searchQuery && (
            <p className="text-xs mt-1">أنشئ أول كود خصم بالضغط على "كود جديد"</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const expired = isExpired(c);
            const maxed = isMaxedOut(c);
            const inactive = !c.isActive || expired || maxed;

            return (
              <div
                key={c.id}
                className={`bg-[var(--admin-card)] border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${
                  inactive ? 'border-[var(--admin-border)] opacity-70' : 'border-indigo-500/30'
                }`}
              >
                {/* Code + badges */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-base text-[var(--admin-text)] tracking-wider">
                      {c.code}
                    </span>
                    {/* Status badge */}
                    {expired ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30">
                        منتهي الصلاحية
                      </span>
                    ) : maxed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        تجاوز الحد
                      </span>
                    ) : c.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                        مفعّل
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--admin-hover)] text-[var(--admin-text-muted)] border border-[var(--admin-border)]">
                        معطّل
                      </span>
                    )}
                    {/* Type badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                      c.type === 'percentage'
                        ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
                        : 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                    }`}>
                      {c.type === 'percentage'
                        ? <><Percent className="w-2.5 h-2.5" /> {c.value}%</>
                        : <><Hash className="w-2.5 h-2.5" /> {c.value.toLocaleString()} د.ج</>
                      }
                    </span>
                    {/* Scope badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                      c.scope === 'all'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    }`}>
                      {c.scope === 'all'
                        ? <><Globe className="w-2.5 h-2.5" /> كل الموقع</>
                        : <><Package className="w-2.5 h-2.5" /> {c.productName || 'منتج محدد'}</>
                      }
                    </span>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 flex-wrap text-[10px] text-[var(--admin-text-muted)] font-medium">
                    <span>استُخدم {c.usageCount} مرة{c.maxUsage ? ` / ${c.maxUsage}` : ''}</span>
                    {c.minOrderAmount && <span>حد أدنى: {c.minOrderAmount.toLocaleString()} د.ج</span>}
                    {c.expiresAt && (
                      <span className={expired ? 'text-rose-500 font-bold' : ''}>
                        ينتهي: {new Date(c.expiresAt).toLocaleDateString('ar-DZ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleActive(c)}
                    title={c.isActive ? 'تعطيل الكود' : 'تفعيل الكود'}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      c.isActive
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                        : 'border-[var(--admin-border)] bg-[var(--admin-hover)] text-[var(--admin-text-muted)] hover:border-emerald-500/30'
                    }`}
                  >
                    {c.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(c)}
                    title="تعديل الكود"
                    className="p-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover)] text-[var(--admin-text-muted)] hover:text-indigo-500 hover:border-indigo-500/30 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(c)}
                    title="حذف الكود"
                    className="p-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover)] text-[var(--admin-text-muted)] hover:text-rose-500 hover:border-rose-500/30 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
        >
          <div
            className="bg-[var(--admin-card)] border-2 border-rose-500/80 ring-4 ring-rose-500/20 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-right animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-rose-500/30 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border-2 border-rose-500/30 flex items-center justify-center text-rose-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-black text-rose-600 dark:text-rose-400">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-[var(--admin-text)] leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-2 pt-1 border-t border-[var(--admin-border)]">
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(p => ({ ...p, isOpen: false }));
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95"
              >
                <Check className="w-4 h-4" />
                تأكيد الحذف
              </button>
              <button
                onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
                className="py-2.5 px-4 rounded-xl border border-[var(--admin-border)] text-[var(--admin-text)] font-bold text-sm hover:bg-[var(--admin-hover)] transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
