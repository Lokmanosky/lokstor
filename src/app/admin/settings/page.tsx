'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useStoreSettings, saveStoreSettings } from '@/lib/store-settings';

export default function SettingsPage() {
  const currentSettings = useStoreSettings();
  
  const [storeName, setStoreName] = useState(currentSettings.storeName || 'Lokstor');
  const [logoUrl, setLogoUrl] = useState(currentSettings.logoImageUrl || '');
  const [file, setFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setStoreName(currentSettings.storeName || 'Lokstor');
    setLogoUrl(currentSettings.logoImageUrl || '');
  }, [currentSettings]);

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      let finalLogoUrl = logoUrl;
      
      if (file) {
        // Convert to base64 instead of Firebase Storage
        finalLogoUrl = await fileToBase64(file);
        setLogoUrl(finalLogoUrl);
      }
      
      await saveStoreSettings({
        storeName,
        logoImageUrl: finalLogoUrl
      });
      
      setMessage('تم حفظ الإعدادات بنجاح!');
    } catch (err: any) {
      console.error(err);
      setMessage('حدث خطأ أثناء الحفظ.');
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--admin-text)]">الإعدادات</h1>
        <p className="text-sm text-[var(--admin-text-muted)] mt-1">تخصيص معلومات المتجر الأساسية</p>
      </div>

      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--admin-text)]">اسم المتجر</label>
            <input 
              type="text" 
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md px-3 py-2 text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors"
              placeholder="مثال: Lokstor"
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-[var(--admin-text)] block">شعار المتجر</label>
            
            <div className="flex items-center gap-6">
              {/* Preview */}
              <div className="w-16 h-16 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] flex items-center justify-center overflow-hidden shrink-0">
                {file ? (
                  <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-[var(--admin-text-muted)]" />
                )}
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-[var(--admin-hover)] border border-[var(--admin-border)] text-[var(--admin-text)] rounded-md text-sm font-medium hover:bg-[var(--admin-border)] transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>رفع صورة من الجهاز (Base64)</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {file && (
                    <button type="button" onClick={() => setFile(null)} className="text-xs text-red-400 hover:text-red-500">
                      إلغاء
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-px bg-[var(--admin-border)] flex-1"></div>
                  <span className="text-xs text-[var(--admin-text-muted)]">أو</span>
                  <div className="h-px bg-[var(--admin-border)] flex-1"></div>
                </div>
                <input 
                  type="url" 
                  value={file ? '' : logoUrl}
                  onChange={(e) => { setLogoUrl(e.target.value); setFile(null); }}
                  disabled={file !== null}
                  className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md px-3 py-2 text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors disabled:opacity-50"
                  placeholder="رابط الصورة (URL)"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-md text-sm font-medium ${message.includes('خطأ') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
              {message}
            </div>
          )}

          <div className="pt-4 border-t border-[var(--admin-border)] flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-[var(--admin-primary)] text-[var(--admin-bg)] rounded-md font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[140px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
