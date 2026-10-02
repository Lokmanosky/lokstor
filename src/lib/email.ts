/**
 * ============================================================================
 * ⚠️ مؤقت: نظام إرسال الإيميلات الحالي (Gmail SMTP)
 * ============================================================================
 * يتم حالياً استخدام بريد Gmail العادي عبر مكتبة Nodemailer كحل مؤقت بدلاً من Resend.
 * هذا الحل لتفادي مشكلة "الفشل الصامت" في Resend لعدم وجود دومين خاص بالمتجر.
 *
 * 🛑 تحذير هام للمستقبل:
 * Gmail يسمح بإرسال 500 إيميل يومياً كحد أقصى.
 * عندما يكبر المتجر وتزيد الطلبات، يجب شراء دومين خاص (Domain)
 * والعودة لاستخدام خدمات الإرسال الاحترافية مثل Resend لضمان عدم توقف الإرسال.
 */
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebase-admin';

export interface OrderEmailData {
  id: string;
  productId?: string;
  productName: string;
  productPrice?: number;
  amount?: number | string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  paymentMethod?: string;
  paymentMethodDetails?: string;
  customFieldsData?: Record<string, string>;
  selectedVariant?: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
  paidAt?: number | string;
  createdAt?: number | string;
  chargilyEmailsSent?: boolean;
  downloadUrl?: string;
}

// Nodemailer transporter initialization
function getTransporter() {
  const user = (process.env.GMAIL_USER || '').trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || '').trim();

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
}

export async function getAdminNotificationEmail(): Promise<string> {
  const envEmail = (process.env.ADMIN_NOTIFICATION_EMAIL || '').trim();
  if (envEmail && envEmail.includes('@')) {
    return envEmail;
  }

  // Fallback to Firestore settings if configured in Admin Dashboard
  if (adminDb) {
    try {
      const snap = await adminDb.collection('settings').doc('private').get();
      if (snap.exists) {
        const data = snap.data();
        if (data?.adminNotificationEmail && typeof data.adminNotificationEmail === 'string' && data.adminNotificationEmail.includes('@')) {
          return data.adminNotificationEmail.trim();
        }
      }
    } catch {
      // Ignore fallback read errors
    }
  }

  return 'admin@lokstor.dz';
}

function getSenderEmail(): string {
  return (process.env.EMAIL_FROM || `Lokstor <${process.env.GMAIL_USER}>`).trim();
}

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://lokstor.vercel.app').replace(/\/$/, '');
}

function formatDzd(amount: number): string {
  return Number(amount || 0).toLocaleString('en-US');
}

function formatDateTime(timestamp?: number | string): string {
  const date = timestamp ? new Date(Number(timestamp)) : new Date();
  return date.toLocaleString('ar-DZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Algiers',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Template: Admin Notification for Paid Chargily Order
// ─────────────────────────────────────────────────────────────────────────────
function renderAdminChargilyPaidHtml(params: {
  order: OrderEmailData;
  paidAmount: number;
  paymentMethodDetail?: string;
  adminOrderUrl: string;
}): string {
  const { order, paidAmount, paymentMethodDetail, adminOrderUrl } = params;
  const shortId = (order.id || '').replace('ord_', '').slice(0, 8).toUpperCase();
  const paymentBadge = paymentMethodDetail?.toLowerCase().includes('edahabia')
    ? 'البطاقة الذهبية (Edahabia)'
    : paymentMethodDetail?.toLowerCase().includes('cib')
    ? 'بطاقة بنكية (CIB)'
    : 'شارجيلي (Chargily Pay)';

  const customFieldsRows = order.customFieldsData && typeof order.customFieldsData === 'object'
    ? Object.entries(order.customFieldsData)
        .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">${k}</td><td style="padding:6px 12px;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9;color:#0f172a;" dir="ltr">${v}</td></tr>`)
        .join('')
    : '';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>دفع جديد ناجح عبر شارجيلي</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">متجر Lokstor</h1>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">إشعار استلام دفعة جديدة</p>
    </div>

    <div style="padding:28px 24px;">
      <!-- Alert Badge -->
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 16px;margin-bottom:24px;display:flex;align-items:center;">
        <span style="font-size:18px;margin-left:10px;">🎉</span>
        <div>
          <div style="font-weight:700;color:#065f46;font-size:14px;">تم تأكيد دفع الطلب بنجاح!</div>
          <div style="color:#047857;font-size:12px;margin-top:2px;">تم التحقق من العملية وتأكيدها آلياً عبر Chargily Webhook.</div>
        </div>
      </div>

      <!-- Order Summary Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">رقم الطلب:</td>
          <td style="padding:10px 0;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;" dir="ltr">#${shortId}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">المنتج:</td>
          <td style="padding:10px 0;font-weight:700;color:#0f172a;text-align:left;">${order.productName || 'منتج رقمي'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">المبلغ المدفوع:</td>
          <td style="padding:10px 0;font-weight:800;color:#059669;font-size:16px;text-align:left;" dir="ltr">${formatDzd(paidAmount)} DZD</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">بوابة / طريقة الدفع:</td>
          <td style="padding:10px 0;font-weight:600;color:#0f172a;text-align:left;">${paymentBadge}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">اسم العميل:</td>
          <td style="padding:10px 0;font-weight:600;color:#0f172a;text-align:left;">${order.customerName || 'عميل'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">بريد العميل:</td>
          <td style="padding:10px 0;font-weight:600;color:#0f172a;text-align:left;" dir="ltr">${order.customerEmail || '-'}</td>
        </tr>
        ${order.customerPhone ? `
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">رقم الهاتف:</td>
          <td style="padding:10px 0;font-weight:600;color:#0f172a;text-align:left;" dir="ltr">${order.customerPhone}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 0;color:#64748b;">تاريخ العملية:</td>
          <td style="padding:10px 0;color:#475569;text-align:left;">${formatDateTime(order.paidAt || order.createdAt)}</td>
        </tr>
      </table>

      ${customFieldsRows ? `
      <!-- Additional Customer Info (e.g. Game Account) -->
      <div style="margin-bottom:24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;padding:14px;">
        <div style="font-weight:700;font-size:13px;color:#334155;margin-bottom:8px;">🎮 بيانات حساب اللعبة / الشحن:</div>
        <table style="width:100%;border-collapse:collapse;">
          ${customFieldsRows}
        </table>
      </div>
      ` : ''}

      <!-- Action Button -->
      <div style="text-align:center;margin-top:28px;">
        <a href="${adminOrderUrl}" target="_blank" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;box-shadow:0 2px 4px rgba(5,150,105,0.2);">
          عرض الطلب في لوحة التحكم ←
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">هذا إشعار تلقائي صادر عن نظام المتجر Lokstor.</p>
    </div>

  </div>
</body>
</html>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Template: Customer Confirmation for Paid Chargily Order (Invoice/Receipt)
// ─────────────────────────────────────────────────────────────────────────────
function renderCustomerChargilyPaidHtml(params: {
  order: OrderEmailData;
  paidAmount: number;
  storeUrl: string;
  downloadUrl?: string;
}): string {
  const { order, paidAmount, storeUrl, downloadUrl } = params;
  const shortId = (order.id || '').replace('ord_', '').slice(0, 8).toUpperCase();

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تأكيد استلام طلبك</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:28px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Lokstor</h1>
      <p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;font-weight:600;">شكراً لطلبك وثقتك بنا!</p>
    </div>

    <div style="padding:28px 24px;">
      
      <!-- Greeting -->
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0f172a;">
        مرحباً ${order.customerName || 'عميلنا العزيز'} 👋
      </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        يسعدنا إعلامك بأنه تم تأكيد دفع طلبك بنجاح. فيما يلي تفاصيل الفاتورة وتوثيق عملية الشراء:
      </p>

      <!-- Invoice Box -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">رقم الطلب:</td>
            <td style="padding:8px 0;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #e2e8f0;" dir="ltr">#${shortId}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">المنتج:</td>
            <td style="padding:8px 0;font-weight:700;color:#0f172a;text-align:left;">${order.productName || 'منتج رقمي'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">المبلغ الإجمالي:</td>
            <td style="padding:8px 0;font-weight:800;color:#059669;font-size:16px;text-align:left;" dir="ltr">${formatDzd(paidAmount)} DZD</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">طريقة الدفع:</td>
            <td style="padding:8px 0;font-weight:600;color:#0f172a;text-align:left;">بطاقة دفع إلكتروني (Chargily)</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;">تاريخ العملية:</td>
            <td style="padding:8px 0;color:#475569;text-align:left;">${formatDateTime(order.paidAt || order.createdAt)}</td>
          </tr>
        </table>
      </div>

      <!-- Informational Delivery Note -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;margin-bottom:24px;">
        <div style="font-weight:700;color:#166534;font-size:13px;margin-bottom:4px;">📦 استلام وتفعيل المنتج:</div>
        <p style="margin:0;font-size:13px;color:#15803d;line-height:1.5;">
          يتم تفعيل واستلام المنتج مباشرة داخل المتجر فور نجاح الدفع. إذا كان طلبك عبارة عن شحن حساب أو لعبة، فإن فريقنا يقوم بمعالجته حالياً حسب البيانات التي زودتنا بها.
        </p>
      </div>

      ${downloadUrl ? `
      <!-- Download File Button -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${downloadUrl}" target="_blank" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;box-shadow:0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          ⬇️ تحميل نسخة من الملف
        </a>
      </div>
      ` : ''}

      <!-- Action Button -->
      <div style="text-align:center;margin-top:24px;">
        <a href="${storeUrl}/account/orders" target="_blank" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;">
          الذهاب إلى حسابي وسجل طلباتي
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:18px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">متجر Lokstor للمنتجات الرقمية | إذا كان لديك أي استفسار، تواصل معنا عبر الموقع أو تليغرام.</p>
    </div>

  </div>
</body>
</html>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Template: Admin Notification for Manual Payment Review (Binance / RedotPay)
// ─────────────────────────────────────────────────────────────────────────────
function renderAdminManualPaymentReviewHtml(params: {
  order: OrderEmailData;
  paymentMethod: 'binance' | 'redotpay';
  adminOrderUrl: string;
}): string {
  const { order, paymentMethod, adminOrderUrl } = params;
  const shortId = (order.id || '').replace('ord_', '').slice(0, 8).toUpperCase();
  const isBinance = paymentMethod === 'binance';
  const methodTitle = isBinance ? 'بايننس (Binance Pay / USDT)' : 'RedotPay';
  const accountInfo = isBinance
    ? 'Binance UID: 427636242 | BSC (BEP20): 0xf0782cc454c9f0b273a11aba636fac62f18b24dd'
    : 'RedotPay ID: 1622725404 (Lokmanosky)';

  const customFieldsRows = order.customFieldsData && typeof order.customFieldsData === 'object'
    ? Object.entries(order.customFieldsData)
        .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">${k}</td><td style="padding:6px 12px;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9;color:#0f172a;" dir="ltr">${v}</td></tr>`)
        .join('')
    : '';

  const orderAmount = Number(order.productPrice || order.amount || 0);

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>مطلوب التحقق من استلام دفع يدوي</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">متجر Lokstor</h1>
      <p style="margin:6px 0 0;color:#fcd34d;font-size:13px;font-weight:700;">طلب تحقق يدوي من استلام الدفع</p>
    </div>

    <div style="padding:28px 24px;">
      <!-- Alert Badge -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;margin-bottom:24px;">
        <div style="font-weight:700;color:#92400e;font-size:14px;">⚠️ يتطلب التحقق من محفظتك قبل تسليم الطلب</div>
        <div style="color:#b45309;font-size:12px;margin-top:4px;line-height:1.5;">
          قام العميل بتسجيل طلب شراء عبر <strong>${methodTitle}</strong> ويجب التأكد من وصول الحوالة في حسابك ثم تأكيد الطلب يدوياً من لوحة التحكم.
        </div>
      </div>

      <!-- Order Summary Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">رقم الطلب:</td>
          <td style="padding:10px 0;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;" dir="ltr">#${shortId}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">طريقة الدفع:</td>
          <td style="padding:10px 0;font-weight:700;color:#d97706;text-align:left;">${methodTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">المنتج:</td>
          <td style="padding:10px 0;font-weight:700;color:#0f172a;text-align:left;">${order.productName || 'منتج رقمي'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">المبلغ المطلوب:</td>
          <td style="padding:10px 0;font-weight:800;color:#0f172a;font-size:16px;text-align:left;" dir="ltr">${formatDzd(orderAmount)} DZD</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">اسم العميل:</td>
          <td style="padding:10px 0;font-weight:600;color:#0f172a;text-align:left;">${order.customerName || 'عميل'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">بريد العميل:</td>
          <td style="padding:10px 0;font-weight:600;color:#0f172a;text-align:left;" dir="ltr">${order.customerEmail || '-'}</td>
        </tr>
        ${order.customerPhone ? `
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">رقم الهاتف:</td>
          <td style="padding:10px 0;font-weight:600;color:#0f172a;text-align:left;" dir="ltr">${order.customerPhone}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">حساب الدفع الخاص بك:</td>
          <td style="padding:10px 0;font-size:12px;font-weight:600;color:#475569;text-align:left;" dir="ltr">${accountInfo}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;">تاريخ تسجيل الطلب:</td>
          <td style="padding:10px 0;color:#475569;text-align:left;">${formatDateTime(order.createdAt)}</td>
        </tr>
      </table>

      ${customFieldsRows ? `
      <!-- Additional Customer Info (e.g. Game Account) -->
      <div style="margin-bottom:24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;padding:14px;">
        <div style="font-weight:700;font-size:13px;color:#334155;margin-bottom:8px;">🎮 بيانات حساب اللعبة / الشحن المطلوبة:</div>
        <table style="width:100%;border-collapse:collapse;">
          ${customFieldsRows}
        </table>
      </div>
      ` : ''}

      <!-- Action Button -->
      <div style="text-align:center;margin-top:28px;">
        <a href="${adminOrderUrl}" target="_blank" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;box-shadow:0 2px 4px rgba(217,119,6,0.2);">
          فتح الطلب في لوحة التحكم وتأكيده ←
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">إشعار تحقق يدوي خاص بالأدمن فقط (لم يتم إرسال أي إيميل للعميل).</p>
    </div>

  </div>
</body>
</html>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Dispatcher Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send 2 emails simultaneously when a Chargily payment succeeds:
 * 1. Admin notification email
 * 2. Customer confirmation / receipt email
 */
export async function sendChargilyPaidEmails(params: {
  order: OrderEmailData;
  paidAmount: number;
  paymentMethodDetail?: string;
  downloadUrl?: string;
}): Promise<{ adminSent: boolean; customerSent: boolean; error?: string }> {
  const { order, paidAmount, paymentMethodDetail, downloadUrl } = params;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[Nodemailer] GMAIL_USER or GMAIL_APP_PASSWORD not configured. Email sending skipped.');
    return { adminSent: false, customerSent: false, error: 'Gmail credentials missing' };
  }

  const sender = getSenderEmail();
  const baseUrl = getBaseUrl();
  const adminEmail = await getAdminNotificationEmail();
  const shortId = (order.id || '').replace('ord_', '').slice(0, 8).toUpperCase();
  const adminOrderUrl = `${baseUrl}/admin/orders?search=${encodeURIComponent(order.id || '')}`;

  let adminSent = false;
  let customerSent = false;

  // 1. Admin Email
  const sendToAdminPromise = transporter.sendMail({
    from: sender,
    to: adminEmail,
    subject: `[Lokstor] 💰 دفع جديد ناجح: طلب #${shortId} (${formatDzd(paidAmount)} د.ج)`,
    html: renderAdminChargilyPaidHtml({
      order,
      paidAmount,
      paymentMethodDetail,
      adminOrderUrl,
    }),
  });

  // 2. Customer Email
  const customerEmail = (order.customerEmail || '').trim();
  const sendToCustomerPromise = (customerEmail && customerEmail.includes('@'))
    ? transporter.sendMail({
        from: sender,
        to: customerEmail,
        subject: `[Lokstor] تم تأكيد طلبك بنجاح - #${shortId}`,
        html: renderCustomerChargilyPaidHtml({
          order,
          paidAmount,
          storeUrl: baseUrl,
          downloadUrl,
        }),
      })
    : Promise.resolve(null);

  // Send both in parallel
  const [adminResult, customerResult] = await Promise.allSettled([
    sendToAdminPromise,
    sendToCustomerPromise,
  ]);

  if (adminResult.status === 'fulfilled' && adminResult.value) {
    adminSent = true;
    console.log(`[Nodemailer] Admin notification sent successfully to ${adminEmail} for order #${shortId}`);
  } else {
    console.error(`[Nodemailer] Failed to send admin notification for order #${shortId}:`, adminResult.status === 'rejected' ? adminResult.reason : 'Unknown error');
  }

  if (customerResult.status === 'fulfilled' && customerResult.value) {
    customerSent = true;
    console.log(`[Nodemailer] Customer confirmation sent successfully to ${customerEmail} for order #${shortId}`);
  } else if (customerResult.status === 'rejected') {
    console.error(`[Nodemailer] Failed to send customer receipt for order #${shortId}:`, customerResult.reason);
  }

  return { adminSent, customerSent };
}

/**
 * Send 1 email ONLY to Admin requesting manual review when Binance / RedotPay order is submitted.
 * Absolutely NO email is sent to the customer in this case.
 */
export async function sendManualPaymentAdminEmail(params: {
  order: OrderEmailData;
  paymentMethod: 'binance' | 'redotpay';
}): Promise<{ adminSent: boolean; error?: string }> {
  const { order, paymentMethod } = params;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[Nodemailer] GMAIL_USER or GMAIL_APP_PASSWORD is not configured. Email sending skipped.');
    return { adminSent: false, error: 'Gmail credentials missing' };
  }

  const sender = getSenderEmail();
  const baseUrl = getBaseUrl();
  const adminEmail = await getAdminNotificationEmail();
  const shortId = (order.id || '').replace('ord_', '').slice(0, 8).toUpperCase();
  const methodTitle = paymentMethod === 'binance' ? 'بايننس (Binance)' : 'RedotPay';
  const adminOrderUrl = `${baseUrl}/admin/orders?search=${encodeURIComponent(order.id || '')}`;

  try {
    await transporter.sendMail({
      from: sender,
      to: adminEmail,
      subject: `[Lokstor] 🔍 مراجعة دفع يدوي مطلوبة: ${methodTitle} - طلب #${shortId}`,
      html: renderAdminManualPaymentReviewHtml({
        order,
        paymentMethod,
        adminOrderUrl,
      }),
    });

    console.log(`[Nodemailer] Manual payment review email sent successfully to admin (${adminEmail}) for order #${shortId}`);
    return { adminSent: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Nodemailer] Exception sending manual review email for order #${shortId}:`, err);
    return { adminSent: false, error: errorMsg };
  }
}

export async function sendDeliveryEmail(params: { to: string; link: string; productName?: string; orderId?: string }) {
  const transporter = getTransporter();
  if (!transporter) return false;
  const sender = getSenderEmail();
  const shortId = params.orderId ? params.orderId.replace('ord_', '').slice(0, 8).toUpperCase() : '';
  const subject = params.orderId ? `[Lokstor] تم تسليم طلبك رقم #${shortId}` : `[Lokstor] تسليم طلبك`;
  
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>تسليم الطلب</title></head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:28px 24px;">
    <h1 style="margin:0 0 16px;color:#0f172a;font-size:20px;">✅ تم تسليم طلبك بنجاح</h1>
    ${params.productName ? `<p style="margin:0 0 16px;color:#475569;">المنتج: <strong>${params.productName}</strong></p>` : ''}
    <p style="margin:0 0 24px;color:#475569;">فيما يلي بيانات التسليم الخاصة بك:</p>
    <div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;padding:16px;text-align:center;word-break:break-all;margin-bottom:24px;">
      <strong style="color:#0f172a;font-size:16px;">${params.link}</strong>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">متجر Lokstor للمنتجات الرقمية</p>
  </div>
</body>
</html>
  `;
  
  try {
    await transporter.sendMail({ from: sender, to: params.to, subject, html });
    return true;
  } catch (err) {
    console.error('[Nodemailer] Delivery email error:', err);
    return false;
  }
}
