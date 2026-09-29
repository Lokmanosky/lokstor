'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, writeBatch, doc, addDoc, deleteDoc, updateDoc
} from 'firebase/firestore';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, rectSortingStrategy, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Trash2, GripVertical, Package, FolderOpen, Upload,
  Pencil, X, Check, Loader2, ImageOff, ChevronDown, ChevronUp, Zap
} from 'lucide-react';

interface StoreCategory {
  id: string; name: string; slug: string; emoji?: string; sortOrder: number; createdAt: number;
}
interface Prod {
  id: string; name: string; imageUrl?: string; image?: string;
  category?: string; type?: string; sortOrder?: number;
  price?: number; status?: string;
}

// ── Draggable product card ───────────────────────────────────────────────────
function ProdCard({ prod, isOverlay }: { prod: Prod; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: 'prod:' + prod.id,
    data: { type: 'product', prod },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const img = (prod.imageUrl || prod.image || '').replace(/^"+|"+$/g, '').trim();
  return (
    <div ref={setNodeRef} style={style}
      className={'relative bg-[var(--admin-card)] border rounded-lg overflow-hidden group select-none transition-all duration-200 ' + (
        isOverlay ? 'shadow-2xl border-emerald-500 rotate-2 scale-105 z-50' :
        isDragging ? 'opacity-25 border-dashed border-[var(--admin-primary)] scale-95' :
        'border-[var(--admin-border)] hover:border-[var(--admin-primary)]/60 hover:shadow-md'
      )}
    >
      <div {...attributes} {...listeners}
        className="absolute top-1 right-1 z-10 cursor-grab active:cursor-grabbing p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        title="اسحب لتغيير مكان المنتج"
      >
        <GripVertical className="w-3 h-3" />
      </div>
      <div className="aspect-square bg-[var(--admin-bg)] flex items-center justify-center overflow-hidden">
        {img
          ? <img src={img} alt={prod.name} className="w-full h-full object-contain" />
          : <ImageOff className="w-5 h-5 text-[var(--admin-text-muted)] opacity-30" />
        }
      </div>
      <div className="p-1.5">
        <p className="text-[10px] font-semibold text-[var(--admin-text)] line-clamp-2 leading-tight">{prod.name}</p>
        {prod.price !== undefined && (
          <p className="text-[9px] text-[var(--admin-primary)] font-bold mt-0.5">{prod.price} د.ج</p>
        )}
      </div>
    </div>
  );
}

// ── Category section (sortable) ──────────────────────────────────────────────
function CategorySection({
  cat, prods, onDelete, onRename, isOverlay,
}: {
  cat: StoreCategory; prods: Prod[]; onDelete: () => void;
  onRename: (name: string, emoji: string) => void; isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: 'cat:' + cat.id,
    data: { type: 'category', cat },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState(cat.name);
  const [eEmoji, setEEmoji] = useState(cat.emoji || '📦');
  const prodIds = prods.map(p => 'prod:' + p.id);

  return (
    <div ref={setNodeRef} style={style}
      className={'rounded-xl border overflow-hidden transition-all duration-200 ' + (
        isOverlay ? 'shadow-2xl border-[var(--admin-primary)] opacity-95' :
        isDragging ? 'opacity-40 border-dashed border-[var(--admin-primary)]' :
        'border-[var(--admin-border)] bg-[var(--admin-card)]'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--admin-bg)] border-b border-[var(--admin-border)]">
        {/* Cat drag handle */}
        <div {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing text-[var(--admin-text-muted)] hover:text-[var(--admin-primary)] transition-colors flex-shrink-0"
          title="اسحب لإعادة ترتيب القسم"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input value={eEmoji} onChange={e => setEEmoji(e.target.value)} maxLength={4}
              className="w-10 text-center px-1 py-1 bg-[var(--admin-card)] border border-[var(--admin-border)] rounded text-sm focus:outline-none" />
            <input value={eName} onChange={e => setEName(e.target.value)} placeholder="اسم القسم"
              className="flex-1 min-w-0 px-2 py-1 bg-[var(--admin-card)] border border-[var(--admin-border)] rounded text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)]" />
            <button onClick={() => { onRename(eName, eEmoji); setEditing(false); }}
              className="p-1.5 rounded bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 flex-shrink-0"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditing(false)}
              className="p-1.5 rounded text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <>
            <span className="text-xl leading-none flex-shrink-0">{cat.emoji}</span>
            <span className="font-semibold text-[var(--admin-text)] flex-1 min-w-0 truncate">{cat.name}</span>
            <code className="text-[10px] font-mono text-[var(--admin-text-muted)] hidden sm:block flex-shrink-0">{cat.slug}</code>
            <span className="text-xs text-[var(--admin-text-muted)] bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-full px-2 py-0.5 flex-shrink-0">
              {prods.length}
            </span>
            <button onClick={() => setEditing(true)} title="تعديل اسم القسم"
              className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-[var(--admin-primary)] hover:bg-[var(--admin-hover)] transition-colors flex-shrink-0">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} title="حذف القسم"
              className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCollapsed(v => !v)} title={collapsed ? 'توسيع' : 'طي'}
              className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors flex-shrink-0">
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>

      {/* Products droppable area */}
      {!collapsed && (
        <div className="p-3 min-h-[100px]" id={'drop-zone-' + cat.id}>
          {prods.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--admin-border)] rounded-lg py-8 text-center text-[var(--admin-text-muted)] text-xs transition-colors">
              <Package className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p className="font-medium">القسم فارغ</p>
              <p className="mt-0.5 opacity-70">اسحب منتجاً وأفلته هنا</p>
            </div>
          ) : (
            <SortableContext items={prodIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                {prods.map(p => <ProdCard key={p.id} prod={p} />)}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}


// ── Store Banners Manager ──────────────────────────────────────────────────────
function StoreBannersManager() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'storeBanners'), snap => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setBanners(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const [uploading, setUploading] = useState(false);

  const handleAdd = async (e: any) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      alert('يرجى وضع رابط الصورة أولاً!');
      return;
    }
    try {
      await addDoc(collection(db, 'storeBanners'), {
        imageUrl: newUrl,
        link: '/',
        sortOrder: banners.length,
        createdAt: Date.now()
      });
      setNewUrl('');
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الإضافة');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1200;

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
            const base64 = canvas.toDataURL('image/jpeg', 0.85);

            await addDoc(collection(db, 'storeBanners'), {
              imageUrl: base64,
              link: '/',
              sortOrder: banners.length,
              createdAt: Date.now()
            });
          }
        } catch (err) {
          console.error(err);
          alert('حدث خطأ أثناء رفع الصورة');
        } finally {
          setUploading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الغلاف؟')) {
      await deleteDoc(doc(db, 'storeBanners', id));
    }
  };

  return (
    <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl p-6 space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--admin-text)]">صور غلاف المتجر المتحركة (Banners)</h2>
        <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[var(--admin-primary)] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{uploading ? 'جاري الرفع...' : 'رفع صورة من الحاسوب'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
        </label>
      </div>
      <p className="text-xs text-[var(--admin-text-muted)] leading-relaxed">
        ارفع الصورة من حاسوبك، أو ضع الرابط المباشر للصورة هنا (إذا كانت مرفوعة مسبقاً). ستظهر في الصفحة الرئيسية بشكل متحرك.
      </p>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input 
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          placeholder="رابط الصورة المباشر (اختياري)"
          className="flex-1 px-3 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg text-sm focus:border-[var(--admin-primary)] focus:outline-none text-[var(--admin-text)]"
        />
        <button type="submit" className="px-4 py-2 bg-[var(--admin-border)] text-[var(--admin-text)] font-semibold text-sm rounded-lg hover:bg-[var(--admin-hover)] transition shrink-0 whitespace-nowrap">إضافة من رابط</button>
      </form>
      {loading ? (
        <p className="text-sm text-[var(--admin-text-muted)]">جاري التحميل...</p>
      ) : banners.length === 0 ? (
        <div className="p-4 border-2 border-dashed border-[var(--admin-border)] rounded-xl text-center">
          <p className="text-sm text-[var(--admin-text-muted)]">لا يوجد صور غلاف، المتجر سيعرض التصميم الافتراضي (بدون سلايدر).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map(b => (
            <div key={b.id} className="relative group border border-[var(--admin-border)] rounded-xl overflow-hidden bg-[var(--admin-bg)] aspect-[21/9]">
              <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover" />
              <button 
                onClick={() => handleDelete(b.id)}
                className="absolute top-2 left-2 p-1.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [cats, setCats] = useState<StoreCategory[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<any>(null);

  // Add category modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newEmoji, setNewEmoji] = useState('📦');
  const [adding, setAdding] = useState(false);

  const EMOJI_PRESETS = ['📦','🎮','🔑','📱','💻','🎵','📺','🎓','📚','🎁','⭐','🛡️','⚡','🔥','🎨','🏆','🌐','🎯'];

  // Realtime subscriptions
  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'storeCategories'), snap => {
      const list: StoreCategory[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as StoreCategory));
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      setCats(list);
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, 'products'), snap => {
      const list: Prod[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Prod));
      list.sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999));
      setProds(list);
    });
    return () => { u1(); u2(); };
  }, []);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3000);
  };

  const slugify = (t: string) => t.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w\u0600-\u06FF]/g, '');

  // Group products by category slug
  const prodsByCat = useMemo(() => {
    const grouped: Record<string, Prod[]> = {};
    const assigned = new Set<string>();
    for (const cat of cats) {
      grouped[cat.id] = prods.filter(p => {
        const match = p.type === cat.slug
          || (p.category || '').toLowerCase() === cat.name.toLowerCase()
          || (p.category || '') === cat.slug
          || (p.category || '').toLowerCase().includes(cat.slug.toLowerCase());
        if (match) assigned.add(p.id);
        return match;
      });
    }
    grouped['__uncategorized__'] = prods.filter(p => !assigned.has(p.id));
    return grouped;
  }, [cats, prods]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const catIds = cats.map(c => 'cat:' + c.id);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
    setActiveData(event.active.data.current);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveData(null);
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;
    const activeRaw = (active.id as string).replace(/^(cat:|prod:)/, '');
    const overRaw = (over.id as string).replace(/^(cat:|prod:)/, '');

    // ── Reorder categories ────────────────────────────────────────────────
    if (activeType === 'category') {
      const oldIdx = cats.findIndex(c => c.id === activeRaw);
      const newIdx = cats.findIndex(c => c.id === overRaw);
      if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
      const reordered = arrayMove([...cats], oldIdx, newIdx).map((c, i) => ({ ...c, sortOrder: i }));
      setCats(reordered);
      setSaving(true);
      try {
        const batch = writeBatch(db);
        reordered.forEach(c => batch.update(doc(db, 'storeCategories', c.id), { sortOrder: c.sortOrder }));
        await batch.commit();
        notify('تم حفظ ترتيب الأقسام');
      } catch (e: any) { notify('فشل حفظ الترتيب: ' + e?.message, 'error'); }
      finally { setSaving(false); }
      return;
    }

    // ── Move / reorder product ────────────────────────────────────────────
    if (activeType === 'product') {
      const activeProd = active.data.current?.prod as Prod;

      // Find which category the active product is in
      let fromCatId: string | null = null;
      let toCatId: string | null = null;

      for (const cat of cats) {
        if (prodsByCat[cat.id]?.some(p => p.id === activeProd.id)) fromCatId = cat.id;
      }
      if (!fromCatId) fromCatId = '__uncategorized__';

      // Find target container
      if (overType === 'category') {
        // Dropped on a category header
        toCatId = overRaw;
      } else if (overType === 'product') {
        // Dropped on another product - find which container it's in
        const overProd = over.data.current?.prod as Prod;
        for (const cat of cats) {
          if (prodsByCat[cat.id]?.some(p => p.id === overProd.id)) { toCatId = cat.id; break; }
        }
        if (!toCatId) toCatId = '__uncategorized__';
      } else {
        toCatId = fromCatId; // same container
      }

      const targetCat = cats.find(c => c.id === toCatId);
      setSaving(true);
      try {
        const updates: Record<string, any> = { sortOrder: prodsByCat[toCatId || '__uncategorized__']?.length ?? 0 };
        if (targetCat && toCatId !== fromCatId) {
          // Moving to a different category - update type + category fields
          updates.type = targetCat.slug;
          updates.category = targetCat.name;
          notify('تم نقل "' + activeProd.name + '" إلى قسم ' + targetCat.name);
        } else {
          // Reorder within same category - get new position
          const sameCatProds = [...(prodsByCat[fromCatId] || [])];
          const fromIdx = sameCatProds.findIndex(p => p.id === activeProd.id);
          const overProd = over.data.current?.prod as Prod | undefined;
          const toIdx = overProd ? sameCatProds.findIndex(p => p.id === overProd.id) : sameCatProds.length - 1;
          if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
            const reordered = arrayMove(sameCatProds, fromIdx, toIdx);
            const batch = writeBatch(db);
            reordered.forEach((p, i) => { if (p.id) batch.update(doc(db, 'products', p.id), { sortOrder: i }); });
            await batch.commit();
            notify('تم حفظ ترتيب المنتجات');
            return;
          }
          return;
        }
        if (activeProd.id) await updateDoc(doc(db, 'products', activeProd.id), updates);
      } catch (e: any) { notify('فشل: ' + e?.message, 'error'); }
      finally { setSaving(false); }
    }
  };

  // Add category
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const slug = newSlug.trim() || slugify(newName);
      await addDoc(collection(db, 'storeCategories'), {
        name: newName.trim(), slug, emoji: newEmoji.trim() || '📦',
        sortOrder: cats.length, createdAt: Date.now(),
      });
      setNewName(''); setNewSlug(''); setNewEmoji('📦');
      setShowAdd(false);
      notify('تم إضافة القسم "' + newName.trim() + '"');
    } catch (e: any) { notify('فشل الإضافة: ' + e?.message, 'error'); }
    finally { setAdding(false); }
  };

  // Delete category
  const handleDeleteCat = async (cat: StoreCategory) => {
    if (!confirm('حذف قسم "' + cat.name + '"? المنتجات لن تُحذف لكنها ستصبح بدون قسم.')) return;
    try {
      await deleteDoc(doc(db, 'storeCategories', cat.id));
      notify('تم حذف القسم');
    } catch (e: any) { notify('فشل الحذف: ' + e?.message, 'error'); }
  };

  // Rename category
  const handleRename = async (cat: StoreCategory, name: string, emoji: string) => {
    try {
      await updateDoc(doc(db, 'storeCategories', cat.id), { name: name.trim(), emoji: emoji.trim() || '📦' });
      notify('تم حفظ التعديلات');
    } catch (e: any) { notify('فشل: ' + e?.message, 'error'); }
  };

  // Seed defaults
  const seedDefaults = async () => {
    const defaults = [
      { name: 'منتجات رقمية', slug: 'digital', emoji: '💻', sortOrder: 0 },
      { name: 'اشتراكات', slug: 'subscription', emoji: '🔑', sortOrder: 1 },
      { name: 'شحن ألعاب', slug: 'games', emoji: '🎮', sortOrder: 2 },
    ];
    setSaving(true);
    try {
      const batch = writeBatch(db);
      defaults.forEach(d => {
        const ref = doc(collection(db, 'storeCategories'));
        batch.set(ref, { ...d, createdAt: Date.now() });
      });
      await batch.commit();
      notify('تم إضافة الأقسام الافتراضية بنجاح');
    } catch (e: any) { notify('فشل: ' + e?.message, 'error'); }
    finally { setSaving(false); }
  };

  // Active item for overlay
  const activeCat = activeData?.type === 'category' ? cats.find(c => c.id === (activeId || '').replace('cat:', '')) : null;
  const activeProd = activeData?.type === 'product' ? activeData.prod as Prod : null;

  return (
    <div className="space-y-5" dir="rtl">
      <StoreBannersManager />
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--admin-text)] flex items-center gap-2">
            أقسام المتجر & ترتيب المنتجات
            {saving && <span className="flex items-center gap-1 text-xs text-[var(--admin-text-muted)] font-normal"><Loader2 className="w-3 h-3 animate-spin" />يحفظ...</span>}
          </h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">
            اسحب الأقسام لإعادة ترتيبها • اسحب المنتجات لتغيير موضعها أو قسمها
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {cats.length === 0 && (
            <button onClick={seedDefaults} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 font-medium text-sm hover:bg-amber-500/25 transition-colors disabled:opacity-50">
              <Zap className="w-4 h-4" />
              <span>إضافة الأقسام الافتراضية</span>
            </button>
          )}
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--admin-primary)] text-[var(--admin-bg)] font-semibold text-sm hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            <span>قسم جديد</span>
          </button>
        </div>
      </div>

      {/* Notification */}
      {feedback && (
        <div className={'flex items-center gap-2 p-3 rounded-md text-sm font-medium border ' +
          (feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30')}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ── Add Category Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--admin-text)]">إضافة قسم جديد</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-2">الأيقونة</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {EMOJI_PRESETS.map(e => (
                    <button key={e} type="button" onClick={() => setNewEmoji(e)}
                      className={'w-8 h-8 text-base rounded-lg flex items-center justify-center border transition-all ' +
                        (newEmoji === e ? 'border-[var(--admin-primary)] bg-[var(--admin-primary)]/15 scale-110' : 'border-[var(--admin-border)] bg-[var(--admin-bg)] hover:border-[var(--admin-primary)]/50')}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">اسم القسم *</label>
                <input required value={newName} onChange={e => { setNewName(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)); }}
                  placeholder="مثال: اشتراكات، برامج، بطاقات هدايا..."
                  className="w-full px-3 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">
                  مفتاح الفلتر <span className="font-normal opacity-70">(يُولَّد تلقائياً)</span>
                </label>
                <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="مثال: subscription, games" dir="ltr"
                  className="w-full px-3 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg text-sm font-mono text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors" />
                <p className="text-[10px] text-[var(--admin-text-muted)] mt-1">يجب أن يطابق قيمة type في المنتج (مثال: digital, subscription, games)</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[var(--admin-border)] text-sm font-medium text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] transition-colors">إلغاء</button>
                <button type="submit" disabled={adding || !newName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--admin-primary)] text-[var(--admin-bg)] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>إضافة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DnD Layout ── */}
      {loading ? (
        <div className="py-16 text-center text-[var(--admin-text-muted)]">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" />
          <p>جاري التحميل...</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          
          {/* Categories sortable list */}
          <SortableContext items={catIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {cats.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-[var(--admin-border)] rounded-xl text-[var(--admin-text-muted)]">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-[var(--admin-text)]">لا توجد أقسام بعد</p>
                  <p className="text-sm mt-1 mb-4">أضف أقسامك أو استخدم الأقسام الافتراضية</p>
                  <button onClick={seedDefaults} disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 font-semibold text-sm hover:bg-amber-500/25 transition-colors">
                    <Zap className="w-4 h-4" />
                    <span>إضافة الأقسام الافتراضية (رقمية + اشتراكات + ألعاب)</span>
                  </button>
                </div>
              ) : (
                cats.map(cat => (
                  <CategorySection key={cat.id} cat={cat} prods={prodsByCat[cat.id] || []}
                    onDelete={() => handleDeleteCat(cat)}
                    onRename={(name, emoji) => handleRename(cat, name, emoji)}
                  />
                ))
              )}
            </div>
          </SortableContext>

          {/* Uncategorized section (not draggable as a section, but products inside are) */}
          {cats.length > 0 && (prodsByCat['__uncategorized__'] || []).length > 0 && (
            <div className="rounded-xl border border-dashed border-[var(--admin-border)] overflow-hidden mt-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-[var(--admin-hover)]">
                <span className="text-xl">📁</span>
                <span className="font-semibold text-[var(--admin-text-muted)]">بدون قسم</span>
                <span className="text-xs text-[var(--admin-text-muted)] bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-full px-2 py-0.5">
                  {(prodsByCat['__uncategorized__'] || []).length}
                </span>
                <span className="text-xs text-[var(--admin-text-muted)] mr-auto">اسحب منتجاً لأي قسم لتصنيفه</span>
              </div>
              <div className="p-3">
                <SortableContext items={(prodsByCat['__uncategorized__'] || []).map(p => 'prod:' + p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                    {(prodsByCat['__uncategorized__'] || []).map(p => <ProdCard key={p.id} prod={p} />)}
                  </div>
                </SortableContext>
              </div>
            </div>
          )}

          {/* Drag Overlay (visual ghost while dragging) */}
          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeCat && (
              <CategorySection cat={activeCat} prods={prodsByCat[activeCat.id] || []}
                onDelete={() => {}} onRename={() => {}} isOverlay />
            )}
            {activeProd && <ProdCard prod={activeProd} isOverlay />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Info bar */}
      <div className="flex items-center gap-4 text-xs text-[var(--admin-text-muted)] pt-2 border-t border-[var(--admin-border)]">
        <span>🔷 إجمالي الأقسام: <strong className="text-[var(--admin-text)]">{cats.length}</strong></span>
        <span>📦 إجمالي المنتجات: <strong className="text-[var(--admin-text)]">{prods.length}</strong></span>
        <span>📁 بدون قسم: <strong className="text-[var(--admin-text)]">{(prodsByCat['__uncategorized__'] || []).length}</strong></span>
      </div>
    </div>
  );
}
