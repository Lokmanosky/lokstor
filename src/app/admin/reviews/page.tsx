'use client';
import { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Review } from '@/types';
import { Check, X, Trash2, Star, Filter } from 'lucide-react';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data: Review[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Review));
      setReviews(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'reviews', id), { status });
    } catch (error) {
      console.error(error);
      alert('حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف النهائي؟')) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
    } catch (error) {
      console.error(error);
      alert('حدث خطأ');
    }
  };

  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-[var(--store-text)]">إدارة التقييمات</h1>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-emerald-500 text-white shadow-md' : 'bg-[var(--store-card)] border border-[var(--store-border)] text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
          >
            الكل
          </button>
          <button 
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filter === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'bg-[var(--store-card)] border border-[var(--store-border)] text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
          >
            قيد المراجعة
          </button>
          <button 
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filter === 'approved' ? 'bg-emerald-500 text-white shadow-md' : 'bg-[var(--store-card)] border border-[var(--store-border)] text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
          >
            التقييمات السابقة (المقبولة)
          </button>
          <button 
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filter === 'rejected' ? 'bg-red-500 text-white shadow-md' : 'bg-[var(--store-card)] border border-[var(--store-border)] text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
          >
            مرفوض
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[var(--store-text-muted)]">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl">
          <p className="text-[var(--store-text-muted)] font-bold">لا يوجد تقييمات بهذا التصنيف</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(review => (
            <div key={review.id} className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-[var(--store-text)]">{review.userName || review.customerName || 'مستخدم'}</h3>
                  <div className="flex text-amber-400 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-4 h-4 ${i <= review.rating ? 'fill-current' : 'text-[var(--store-border)]'}`} />
                    ))}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  review.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  review.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  'bg-red-500/10 text-red-500 border-red-500/20'
                }`}>
                  {review.status === 'pending' ? 'بانتظار الموافقة' : review.status === 'approved' ? 'مقبول' : 'مرفوض'}
                </span>
              </div>
              
              <p className="text-sm text-[var(--store-text-muted)] flex-1 break-words">
                "{review.comment}"
              </p>
              
              <div className="pt-3 border-t border-[var(--store-border)] flex gap-2">
                {review.status !== 'approved' && (
                  <button onClick={() => handleUpdateStatus(review.id, 'approved')} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 text-xs font-bold transition-colors">
                    <Check className="w-3.5 h-3.5" /> قبول
                  </button>
                )}
                {review.status !== 'rejected' && (
                  <button onClick={() => handleUpdateStatus(review.id, 'rejected')} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-xs font-bold transition-colors">
                    <X className="w-3.5 h-3.5" /> رفض
                  </button>
                )}
                <button onClick={() => handleDelete(review.id)} className="w-8 flex items-center justify-center text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}