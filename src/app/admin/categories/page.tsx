'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch
} from 'firebase/firestore';
import {
  Plus, Trash2, Check, X, Loader2, GripVertical, FolderOpen, Pencil, Save
} from 'lucide-react';

interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  emoji?: string;
  sortOrder: number;
  createdAt: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newEmoji, setNewEmoji] = useState('\u{1F4E6}');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'storeCategories'), snap => {
      const list: StoreCategory[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as StoreCategory));
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      setCategories(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  const slugify = (text: string) =>
    text.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w\u0600-\u06FF]/g, '');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const slug = newSlug.trim() || slugify(newName);
      await addDoc(collection(db, 'storeCategories'), {
        name: newName.trim(), slug, emoji: newEmoji.trim() || '\u{1F4E6}',
        sortOrder: categories.length, createdAt: Date.now(),
      });
      setNewName(''); setNewSlug(''); setNewEmoji('\u{1F4E6}');
      showNotification('تم إضافة القسم بنجاح');
    } catch (err: any) {
      showNotification('فشل إضافة القسم: ' + err?.message, 'error');
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('هل أنت متأكد من حذف القسم "' + name + '"?')) return;
    try {
      await deleteDoc(doc(db, 'storeCategories', id));
      showNotification('تم حذف القسم');
    } catch (err: any) { showNotification('فشل الحذف: ' + err?.message, 'error'); }
  };

  const startEdit = (cat: StoreCategory) => {
    setEditingId(cat.id); setEditName(cat.name); setEditSlug(cat.slug); setEditEmoji(cat.emoji || '\u{1F4E6}');
  };
  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditSlug(''); setEditEmoji(''); };
  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateDoc(doc(db, 'storeCategories', id), {
        name: editName.trim(), slug: editSlug.trim() || slugify(editName), emoji: editEmoji.trim() || '\u{1F4E6}',
      });
      showNotification('تم حفظ التعديلات'); cancelEdit();
    } catch (err: any) { showNotification('فشل الحفظ: ' + err?.message, 'error'); }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id); e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(id);
  };
  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const oldList = [...categories];
    const fromIdx = oldList.findIndex(c => c.id === dragId);
    const toIdx = oldList.findIndex(c => c.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...oldList];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((c, i) => ({ ...c, sortOrder: i }));
    setCategories(updated); setDragId(null); setDragOverId(null);
    setSaving(true);
    try {
      const batch = writeBatch(db);
      updated.forEach(c => batch.update(doc(db, 'storeCategories', c.id), { sortOrder: c.sortOrder }));
      await batch.commit();
    } catch (err: any) { showNotification('فشل حفظ الترتيب: ' + err?.message, 'error'); }
    finally { setSaving(false); }
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const EMOJI_PRESETS = ['\u{1F4E6}', '\u{1F3AE}', '\u{1F511}', '\u{1F4F1}', '\u{1F4BB}', '\u{1F3B5}', '\u{1F4FA}', '\u{1F393}', '\u{1F4DA}', '\u{1F381}', '\u{2B50}', '\u{1F6E1}', '\u26A1', '\u{1F525}', '\u{1F3A8}', '\u{1F3C6}'];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">أقسام المتجر</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-1">أضف وعدّل وعيّن ترتيب الأقسام — تظهر فوراً في فلاتر صفحة المتجر الرئيسية</p>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>يحفظ الترتيب...</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 p-3 rounded-md text-sm font-medium border transition-all ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-2">+ إضافة قسم جديد</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">الأيقونة</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {EMOJI_PRESETS.map(e => (
                    <button key={e} type="button" onClick={() => setNewEmoji(e)}
                      className={`w-8 h-8 text-base rounded flex items-center justify-center border transition-all ${newEmoji === e ? 'border-[var(--admin-primary)] bg-[var(--admin-primary)]/10 scale-110' : 'border-[var(--admin-border)] bg-[var(--admin-bg)] hover:border-[var(--admin-primary)]/50'}`}
                    >{e}</button>
                  ))}
                </div>
                <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} placeholder="أو اكتب إيموجي" maxLength={4}
                  className="w-full px-3 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">اسم القسم *</label>
                <input required value={newName} onChange={e => { setNewName(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)); }}
                  placeholder="مثال: اشتراكات، برامج، كتب..."
                  className="w-full px-3 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">مفتاح الفلتر <span className="font-normal">(يُولَّد تلقائياً)</span></label>
                <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="مثال: subscription" dir="ltr"
                  className="w-full px-3 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-sm font-mono text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors" />
                <p className="text-[10px] text-[var(--admin-text-muted)] mt-1">يجب أن يطابق قيمة type في المنتج (مثال: digital, subscription, games)</p>
              </div>
              <button type="submit" disabled={adding || !newName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-[var(--admin-primary)] text-[var(--admin-bg)] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>إضافة القسم</span>
              </button>
            </form>
          </div>
          <div className="mt-4 bg-blue-500/8 border border-blue-500/20 rounded-md p-4 text-xs space-y-2">
            <p className="font-semibold text-[var(--admin-text)]">💡 كيف تعمل الأقسام؟</p>
            <ul className="space-y-1 list-disc list-inside text-[var(--admin-text-muted)]">
              <li>تظهر كتبويبات فلتر في الصفحة الرئيسية والقائمة الجانبية</li>
              <li>الـ slug يطابق حقل type في المنتج</li>
              <li>مثال: قسم subscription يعرض المنتجات ذات type=subscription</li>
              <li>اسحب الأقسام من أيقونة ≡ لإعادة ترتيبها</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--admin-border)] bg-[var(--admin-bg)] flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--admin-text)]">الأقسام المتاحة ({categories.length})</span>
              <span className="text-xs text-[var(--admin-text-muted)]">اسحب ≡ لإعادة الترتيب</span>
            </div>
            {loading ? (
              <div className="py-12 text-center text-[var(--admin-text-muted)]"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /><p className="text-sm">جاري التحميل...</p></div>
            ) : categories.length === 0 ? (
              <div className="py-12 text-center text-[var(--admin-text-muted)]"><FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm font-medium">لا توجد أقسام بعد</p><p className="text-xs mt-1">أضف أول قسم من النموذج</p></div>
            ) : (
              <ul className="divide-y divide-[var(--admin-border)]">
                {categories.map(cat => (
                  <li key={cat.id} draggable onDragStart={e => handleDragStart(e, cat.id)} onDragOver={e => handleDragOver(e, cat.id)}
                    onDrop={e => handleDrop(e, cat.id)} onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-4 py-3 transition-all group ${dragOverId === cat.id && dragId !== cat.id ? 'bg-[var(--admin-primary)]/8 border-r-2 border-[var(--admin-primary)]' : dragId === cat.id ? 'opacity-40 bg-[var(--admin-hover)]' : 'hover:bg-[var(--admin-hover)]'}`}
                  >
                    <div className="cursor-grab active:cursor-grabbing text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors flex-shrink-0" title="اسحب لإعادة الترتيب">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <span className="w-5 h-5 rounded-full bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[10px] font-bold text-[var(--admin-text-muted)] flex items-center justify-center flex-shrink-0">{cat.sortOrder + 1}</span>
                    {editingId === cat.id ? (
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <input value={editEmoji} onChange={e => setEditEmoji(e.target.value)} maxLength={4}
                          className="w-12 px-2 py-1 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded text-sm text-center" />
                        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="اسم القسم"
                          className="flex-1 min-w-[100px] px-2 py-1 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)]" />
                        <input value={editSlug} onChange={e => setEditSlug(e.target.value)} placeholder="slug" dir="ltr"
                          className="w-32 px-2 py-1 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded text-sm font-mono text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)]" />
                        <button onClick={() => saveEdit(cat.id)} className="p-1.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors" title="حفظ"><Save className="w-3.5 h-3.5" /></button>
                        <button onClick={cancelEdit} className="p-1.5 rounded bg-[var(--admin-bg)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors" title="إلغاء"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg leading-none flex-shrink-0">{cat.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--admin-text)] truncate">{cat.name}</p>
                            <p className="text-[11px] text-[var(--admin-text-muted)] font-mono">{cat.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => startEdit(cat)} className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-[var(--admin-primary)] hover:bg-[var(--admin-bg)] transition-colors" title="تعديل"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
