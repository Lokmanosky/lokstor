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
  const envUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }
  return 'https://lokstor.vercel.app';
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
        .map(([k, v]) => `<tr><td style="padding:6px 4px;color:#64748b;font-size:12px;border-bottom:1px solid #f1f5f9;width:38%;vertical-align:top;">${k}:</td><td style="padding:6px 4px;font-weight:600;font-size:12px;border-bottom:1px solid #f1f5f9;color:#0f172a;width:62%;word-break:break-word;overflow-wrap:anywhere;text-align:left;" dir="ltr">${v}</td></tr>`)
        .join('')
    : '';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>دفع جديد ناجح عبر شارجيلي</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse: collapse; }
    .email-container { width:100% !important; max-width:540px !important; margin:0 auto !important; }
    @media only screen and (max-width: 480px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-body { padding: 16px 12px !important; }
      .label-col { width: 36% !important; font-size: 12px !important; }
      .val-col { width: 64% !important; font-size: 13px !important; }
    }
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:12px 6px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div class="email-container" style="width:100%;max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.04);box-sizing:border-box;">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:20px 16px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.5px;">متجر Lokstor</h1>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">إشعار استلام دفعة جديدة</p>
    </div>

    <div class="email-body" style="padding:20px 16px;box-sizing:border-box;">
      <!-- Alert Badge -->
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:12px 14px;margin-bottom:18px;">
        <div style="font-weight:700;color:#065f46;font-size:13px;">🎉 تم تأكيد دفع الطلب بنجاح!</div>
        <div style="color:#047857;font-size:11px;margin-top:2px;">تم التحقق من العملية وتأكيدها آلياً عبر Chargily Webhook.</div>
      </div>

      <!-- Order Summary Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;table-layout:fixed;box-sizing:border-box;">
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">رقم الطلب:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">#${shortId}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;">المنتج:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">${order.productName || 'منتج رقمي'}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">المبلغ المدفوع:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:800;color:#059669;font-size:14px;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;" dir="ltr">${formatDzd(paidAmount)} DZD</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">طريقة الدفع:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:600;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">${paymentBadge}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">اسم العميل:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:600;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">${order.customerName || 'عميل'}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">بريد العميل:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:600;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">${order.customerEmail || '-'}</td>
        </tr>
        ${order.customerPhone ? `
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">رقم الهاتف:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:600;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">${order.customerPhone}</td>
        </tr>` : ''}
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;font-size:12px;vertical-align:top;white-space:nowrap;">تاريخ العملية:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;color:#475569;text-align:left;word-break:break-word;font-size:12px;">${formatDateTime(order.paidAt || order.createdAt)}</td>
        </tr>
      </table>

      ${customFieldsRows ? `
      <!-- Additional Customer Info (e.g. Game Account) -->
      <div style="margin-bottom:20px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:12px;">
        <div style="font-weight:700;font-size:12px;color:#334155;margin-bottom:8px;">🎮 بيانات حساب اللعبة / الشحن:</div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          ${customFieldsRows}
        </table>
      </div>
      ` : ''}

      <!-- Action Button -->
      <div style="text-align:center;margin-top:20px;">
        <a href="${adminOrderUrl}" target="_blank" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 20px;border-radius:8px;box-shadow:0 2px 4px rgba(5,150,105,0.2);">
          عرض الطلب في لوحة التحكم ←
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">هذا إشعار تلقائي صادر عن نظام المتجر Lokstor.</p>
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>تأكيد استلام طلبك</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse: collapse; }
    .email-container { width:100% !important; max-width:540px !important; margin:0 auto !important; }
    @media only screen and (max-width: 480px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-body { padding: 16px 12px !important; }
      .label-col { width: 36% !important; font-size: 12px !important; }
      .val-col { width: 64% !important; font-size: 13px !important; }
    }
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:12px 6px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div class="email-container" style="width:100%;max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.04);box-sizing:border-box;">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:24px 16px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">Lokstor</h1>
      <p style="margin:4px 0 0;color:#a7f3d0;font-size:12px;font-weight:600;">شكراً لطلبك وثقتك بنا!</p>
    </div>

    <div class="email-body" style="padding:20px 16px;box-sizing:border-box;">
      
      <!-- Greeting -->
      <h2 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0f172a;">
        مرحباً ${order.customerName || 'عميلنا العزيز'} 👋
      </h2>
      <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.5;">
        يسعدنا إعلامك بأنه تم تأكيد دفع طلبك بنجاح. فيما يلي تفاصيل الفاتورة وتوثيق عملية الشراء:
      </p>

      <!-- Invoice Box -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:18px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed;box-sizing:border-box;">
          <tr>
            <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:12px;vertical-align:top;white-space:nowrap;">رقم الطلب:</td>
            <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #e2e8f0;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">#${shortId}</td>
          </tr>
          <tr>
            <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:12px;vertical-align:top;">المنتج:</td>
            <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #e2e8f0;word-break:break-word;overflow-wrap:anywhere;">${order.productName || 'منتج رقمي'}</td>
          </tr>
          <tr>
            <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:12px;vertical-align:top;white-space:nowrap;">المبلغ الإجمالي:</td>
            <td class="val-col" style="width:64%;padding:8px 4px;font-weight:800;color:#059669;font-size:14px;text-align:left;border-bottom:1px solid #e2e8f0;word-break:break-word;" dir="ltr">${formatDzd(paidAmount)} DZD</td>
          </tr>
          <tr>
            <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:12px;vertical-align:top;white-space:nowrap;">طريقة الدفع:</td>
            <td class="val-col" style="width:64%;padding:8px 4px;font-weight:600;color:#0f172a;text-align:left;border-bottom:1px solid #e2e8f0;word-break:break-word;">بطاقة دفع إلكتروني (Chargily)</td>
          </tr>
          <tr>
            <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;font-size:12px;vertical-align:top;white-space:nowrap;">تاريخ العملية:</td>
            <td class="val-col" style="width:64%;padding:8px 4px;color:#475569;text-align:left;font-size:12px;word-break:break-word;">${formatDateTime(order.paidAt || order.createdAt)}</td>
          </tr>
        </table>
      </div>

      <!-- Informational Delivery Note -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;margin-bottom:18px;">
        <div style="font-weight:700;color:#166534;font-size:12px;margin-bottom:3px;">📦 استلام وتفعيل المنتج:</div>
        <p style="margin:0;font-size:12px;color:#15803d;line-height:1.5;">
          يتم تفعيل واستلام المنتج مباشرة داخل المتجر فور نجاح الدفع. إذا كان طلبك عبارة عن شحن حساب أو لعبة، فإن فريقنا يقوم بمعالجته حالياً حسب البيانات التي زودتنا بها.
        </p>
      </div>

      ${downloadUrl ? `
      <!-- Download File Button -->
      <div style="text-align:center;margin-bottom:18px;">
        <a href="${downloadUrl}" target="_blank" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 24px;border-radius:8px;box-shadow:0 3px 6px rgba(37, 99, 235, 0.2);">
          ⬇️ تحميل نسخة من الملف
        </a>
      </div>
      ` : ''}

      <!-- Action Button -->
      <div style="text-align:center;margin-top:18px;">
        <a href="${storeUrl}/account/orders" target="_blank" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 22px;border-radius:8px;">
          الذهاب إلى حسابي وسجل طلباتي
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">متجر Lokstor للمنتجات الرقمية | إذا كان لديك أي استفسار، تواصل معنا عبر الموقع أو تليغرام.</p>
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
    ? 'Binance UID: 427636242<br><span style="font-size:11px;color:#64748b;">BSC (BEP20):</span><br><code style="font-size:11px;background:#f1f5f9;padding:2px 4px;border-radius:4px;word-break:break-all;">0xf0782cc454c9f0b273a11aba636fac62f18b24dd</code>'
    : 'RedotPay ID: 1622725404 (Lokmanosky)';

  const customFieldsRows = order.customFieldsData && typeof order.customFieldsData === 'object'
    ? Object.entries(order.customFieldsData)
        .map(([k, v]) => `<tr><td style="padding:6px 4px;color:#64748b;font-size:12px;border-bottom:1px solid #f1f5f9;width:38%;vertical-align:top;">${k}:</td><td style="padding:6px 4px;font-weight:600;font-size:12px;border-bottom:1px solid #f1f5f9;color:#0f172a;width:62%;word-break:break-word;overflow-wrap:anywhere;text-align:left;" dir="ltr">${v}</td></tr>`)
        .join('')
    : '';

  const orderAmount = Number(order.productPrice || order.amount || 0);

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>مطلوب التحقق من استلام دفع يدوي</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse: collapse; }
    .email-container { width:100% !important; max-width:540px !important; margin:0 auto !important; }
    @media only screen and (max-width: 480px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-body { padding: 16px 12px !important; }
      .label-col { width: 36% !important; font-size: 12px !important; }
      .val-col { width: 64% !important; font-size: 13px !important; }
    }
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:12px 6px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div class="email-container" style="width:100%;max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.04);box-sizing:border-box;">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:20px 16px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.5px;">متجر Lokstor</h1>
      <p style="margin:4px 0 0;color:#fcd34d;font-size:12px;font-weight:700;">طلب تحقق يدوي من استلام الدفع</p>
    </div>

    <div class="email-body" style="padding:20px 16px;box-sizing:border-box;">
      <!-- Alert Badge -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;margin-bottom:18px;">
        <div style="font-weight:700;color:#92400e;font-size:13px;">⚠️ يتطلب التحقق من محفظتك قبل تسليم الطلب</div>
        <div style="color:#b45309;font-size:11px;margin-top:4px;line-height:1.5;">
          قام العميل بتسجيل طلب شراء عبر <strong>${methodTitle}</strong> ويجب التأكد من وصول الحوالة في حسابك ثم تأكيد الطلب يدوياً من لوحة التحكم.
        </div>
      </div>

      <!-- Order Summary Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;table-layout:fixed;box-sizing:border-box;">
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">رقم الطلب:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">#${shortId}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">طريقة الدفع:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#d97706;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">${methodTitle}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;">المنتج:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">${order.productName || 'منتج رقمي'}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">المبلغ المطلوب:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:800;color:#0f172a;font-size:14px;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;" dir="ltr">${formatDzd(orderAmount)} DZD</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">اسم العميل:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:600;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">${order.customerName || 'عميل'}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">بريد العميل:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:600;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">${order.customerEmail || '-'}</td>
        </tr>
        ${order.customerPhone ? `
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">رقم الهاتف:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:600;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">${order.customerPhone}</td>
        </tr>` : ''}
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;">حسابك للدفع:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-size:11px;font-weight:600;color:#475569;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">${accountInfo}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;font-size:12px;vertical-align:top;white-space:nowrap;">تاريخ الطلب:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;color:#475569;text-align:left;font-size:12px;word-break:break-word;">${formatDateTime(order.createdAt)}</td>
        </tr>
      </table>

      ${customFieldsRows ? `
      <!-- Additional Customer Info (e.g. Game Account) -->
      <div style="margin-bottom:20px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:12px;">
        <div style="font-weight:700;font-size:12px;color:#334155;margin-bottom:8px;">🎮 بيانات حساب اللعبة / الشحن المطلوبة:</div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          ${customFieldsRows}
        </table>
      </div>
      ` : ''}

      <!-- Action Button -->
      <div style="text-align:center;margin-top:20px;">
        <a href="${adminOrderUrl}" target="_blank" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 20px;border-radius:8px;box-shadow:0 2px 4px rgba(217,119,6,0.2);">
          فتح الطلب في لوحة التحكم وتأكيده ←
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">إشعار تحقق يدوي خاص بالأدمن فقط (لم يتم إرسال أي إيميل للعميل).</p>
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
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>تسليم الطلب</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    .email-container { width:100% !important; max-width:540px !important; margin:0 auto !important; }
    @media only screen and (max-width: 480px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-body { padding: 18px 14px !important; }
    }
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:12px 6px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div class="email-container" style="width:100%;max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-sizing:border-box;">
    <div class="email-body" style="padding:22px 18px;box-sizing:border-box;">
      <h1 style="margin:0 0 14px;color:#0f172a;font-size:18px;">✅ تم تسليم طلبك بنجاح</h1>
      ${params.productName ? `<p style="margin:0 0 14px;color:#475569;font-size:13px;">المنتج: <strong>${params.productName}</strong></p>` : ''}
      <p style="margin:0 0 18px;color:#475569;font-size:13px;">فيما يلي بيانات التسليم الخاصة بك:</p>
      <div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;padding:14px;text-align:center;word-break:break-all;margin-bottom:20px;">
        <strong style="color:#0f172a;font-size:15px;" dir="ltr">${params.link}</strong>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">متجر Lokstor للمنتجات الرقمية</p>
    </div>
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

// ─────────────────────────────────────────────────────────────────────────────
// 4. Template: Customer Order Cancellation Notification
// ─────────────────────────────────────────────────────────────────────────────
function renderCustomerOrderCancelledHtml(params: {
  order: OrderEmailData;
  reason?: string;
  storeUrl: string;
}): string {
  const { order, reason, storeUrl } = params;
  const shortId = (order.id || '').replace('ord_', '').slice(0, 8).toUpperCase();
  const orderAmount = Number(order.productPrice || order.amount || 0);

  const paymentLabel = order.paymentMethodDetails?.toLowerCase().includes('edahabia')
    ? 'البطاقة الذهبية (Edahabia)'
    : order.paymentMethodDetails?.toLowerCase().includes('cib')
    ? 'بطاقة بنكية (CIB)'
    : order.paymentMethod === 'chargily'
    ? 'شارجيلي (Chargily Pay)'
    : order.paymentMethod === 'binance'
    ? 'بايننس (Binance Pay)'
    : order.paymentMethod === 'redotpay'
    ? 'ريدوت باي (RedotPay)'
    : 'دفع إلكتروني';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>إشعار بإلغاء الطلب</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse: collapse; }
    .email-container { width:100% !important; max-width:540px !important; margin:0 auto !important; }
    @media only screen and (max-width: 480px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-body { padding: 16px 12px !important; }
      .label-col { width: 36% !important; font-size: 12px !important; }
      .val-col { width: 64% !important; font-size: 13px !important; }
    }
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:12px 6px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div class="email-container" style="width:100%;max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.04);box-sizing:border-box;">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:22px 16px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">متجر Lokstor</h1>
      <p style="margin:4px 0 0;color:#f87171;font-size:12px;font-weight:600;">إشعار بإلغاء الطلب</p>
    </div>

    <div class="email-body" style="padding:20px 16px;box-sizing:border-box;">
      
      <!-- Greeting -->
      <h2 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0f172a;">
        مرحباً ${order.customerName || 'عميلنا العزيز'} 👋
      </h2>
      <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.5;">
        نود إعلامك بأنه تم إلغاء طلبك رقم <strong dir="ltr">#${shortId}</strong> في متجر Lokstor.
      </p>

      <!-- Alert Box -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:13px 14px;margin-bottom:18px;">
        <div style="font-weight:700;color:#991b1b;font-size:13px;">❌ حالة الطلب: ملغي (Cancelled)</div>
        <div style="color:#b91c1c;font-size:11px;margin-top:3px;line-height:1.5;">
          ${reason ? `سبب الإلغاء: <strong>${reason}</strong>` : 'تم إلغاء هذا الطلب من قبل إدارة المتجر.'}
        </div>
      </div>

      <!-- Order Details Summary Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:13px;table-layout:fixed;box-sizing:border-box;">
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">رقم الطلب:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">#${shortId}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;">المنتج:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">${order.productName || 'منتج رقمي'}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">المبلغ:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:800;color:#0f172a;font-size:14px;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;" dir="ltr">${formatDzd(orderAmount)} DZD</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">وسيلة الدفع:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:600;color:#475569;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;">${paymentLabel}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;font-size:12px;vertical-align:top;white-space:nowrap;">تاريخ الطلب:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;color:#475569;text-align:left;font-size:12px;word-break:break-word;">${formatDateTime(order.createdAt)}</td>
        </tr>
      </table>

      <!-- Assistance / Help Note -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:18px;">
        <div style="font-weight:700;color:#334155;font-size:12px;margin-bottom:4px;">💬 هل قمت بالدفع مسبقاً أو تعتقد أن هذا خطأ؟</div>
        <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
          إذا كنت قد أتممت عملية التحويل أو واجهتك أي صعوبة، يُرجى عدم القلق والتواصل معنا مباشرة وتزويدنا برقم الطلب لنقوم بمساعدتك وحل المسألة فوراً.
        </p>
      </div>

      <!-- Action Buttons -->
      <div style="text-align:center;margin-top:20px;">
        <a href="https://t.me/Loktech" target="_blank" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;box-shadow:0 2px 4px rgba(2,132,199,0.2);margin-bottom:8px;">
          تواصل مع الدعم الفني عبر تليغرام ←
        </a>
        <br>
        <a href="${storeUrl}" target="_blank" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;padding:9px 18px;border-radius:8px;margin-top:4px;">
          تصفح المتجر الرئيسي
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">متجر Lokstor للمنتجات الرقمية في الجزائر | نسعد دائماً بخدمتكم.</p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Send an email notification to the customer when their order is cancelled.
 */
export async function sendOrderCancelledCustomerEmail(params: {
  order: OrderEmailData;
  reason?: string;
}): Promise<{ customerSent: boolean; error?: string }> {
  const { order, reason } = params;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[Nodemailer] GMAIL_USER or GMAIL_APP_PASSWORD is not configured. Cancellation email skipped.');
    return { customerSent: false, error: 'Gmail credentials missing' };
  }

  const customerEmail = (order.customerEmail || '').trim();
  if (!customerEmail || !customerEmail.includes('@')) {
    console.warn(`[Nodemailer] Order #${order.id} has no valid customer email: "${customerEmail}". Skipping cancellation email.`);
    return { customerSent: false, error: 'Invalid customer email' };
  }

  const sender = getSenderEmail();
  const baseUrl = getBaseUrl();
  const shortId = (order.id || '').replace('ord_', '').slice(0, 8).toUpperCase();

  try {
    await transporter.sendMail({
      from: sender,
      to: customerEmail,
      subject: `[Lokstor] إشعار بإلغاء طلبك #${shortId}`,
      html: renderCustomerOrderCancelledHtml({
        order,
        reason,
        storeUrl: baseUrl,
      }),
    });

    console.log(`[Nodemailer] Cancellation email sent successfully to ${customerEmail} for order #${shortId}`);
    return { customerSent: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Nodemailer] Failed to send cancellation email for order #${shortId}:`, err);
    return { customerSent: false, error: errorMsg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Template: 24-Hour Payment Reminder for Pending Orders
// ─────────────────────────────────────────────────────────────────────────────
function renderCustomerPaymentReminderHtml(params: {
  order: OrderEmailData;
  checkoutUrl: string;
  storeUrl: string;
}): string {
  const { order, checkoutUrl, storeUrl } = params;
  const shortId = (order.id || '').replace('ord_', '').slice(0, 8).toUpperCase();
  const orderAmount = Number(order.productPrice || order.amount || 0);

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>تذكير: طلبك بانتظار استكمال الدفع</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse: collapse; }
    .email-container { width:100% !important; max-width:540px !important; margin:0 auto !important; }
    @media only screen and (max-width: 480px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-body { padding: 16px 12px !important; }
      .label-col { width: 36% !important; font-size: 12px !important; }
      .val-col { width: 64% !important; font-size: 13px !important; }
    }
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:12px 6px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div class="email-container" style="width:100%;max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.04);box-sizing:border-box;">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:22px 16px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">متجر Lokstor</h1>
      <p style="margin:4px 0 0;color:#fcd34d;font-size:12px;font-weight:600;">⏳ تذكير بإتمام عملية الدفع</p>
    </div>

    <div class="email-body" style="padding:20px 16px;box-sizing:border-box;">
      
      <!-- Greeting -->
      <h2 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0f172a;">
        مرحباً ${order.customerName || 'عميلنا العزيز'} 👋
      </h2>
      <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.6;">
        لاحظنا أنك بدأت طلباً لشراء <strong>${order.productName || 'منتج رقمي'}</strong> في متجر Lokstor ولكن لم تستكمل عملية الدفع بعد.
      </p>

      <!-- Alert Box -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:13px 14px;margin-bottom:18px;">
        <div style="font-weight:700;color:#92400e;font-size:13px;">⏳ طلبك ما زال محفوظاً وبانتظارك!</div>
        <div style="color:#b45309;font-size:11px;margin-top:4px;line-height:1.5;">
          يمكنك إكمال الدفع بسهولة وأمان عبر <strong>البطاقة الذهبية، بايننس (Binance)، أو ريدوت باي (RedotPay)</strong> واستلام طلبك فوراً.
        </div>
      </div>

      <!-- Order Details Summary Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:13px;table-layout:fixed;box-sizing:border-box;">
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">رقم الطلب:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;" dir="ltr">#${shortId}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;">المنتج:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:700;color:#0f172a;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;overflow-wrap:anywhere;">${order.productName || 'منتج رقمي'}</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:top;white-space:nowrap;">المبلغ المطلوب:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;font-weight:800;color:#059669;font-size:14px;text-align:left;border-bottom:1px solid #f1f5f9;word-break:break-word;" dir="ltr">${formatDzd(orderAmount)} DZD</td>
        </tr>
        <tr>
          <td class="label-col" style="width:36%;padding:8px 4px;color:#64748b;font-size:12px;vertical-align:top;white-space:nowrap;">تاريخ بدء الطلب:</td>
          <td class="val-col" style="width:64%;padding:8px 4px;color:#475569;text-align:left;font-size:12px;word-break:break-word;">${formatDateTime(order.createdAt)}</td>
        </tr>
      </table>

      <!-- Main Action: Complete Payment Button -->
      <div style="text-align:center;margin:24px 0 12px;">
        <a href="${checkoutUrl}" target="_blank" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:12px 30px;border-radius:10px;box-shadow:0 3px 6px rgba(5,150,105,0.25);">
          إتمام عملية الدفع واستلام الطلب الآن ←
        </a>
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${storeUrl}/account" target="_blank" style="display:inline-block;color:#475569;text-decoration:underline;font-size:12px;font-weight:600;">
          أو استعراض سجل طلباتي في حسابي
        </a>
      </div>

      <!-- Assistance / Help Note -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:18px;">
        <div style="font-weight:700;color:#334155;font-size:12px;margin-bottom:4px;">💬 هل واجهتك أي مشكلة أثناء الدفع؟</div>
        <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
          إذا واجهت أي صعوبة أو كان لديك استفسار عن طرق الدفع المتاحة، لا تتردد بالتواصل مع فريق الدعم الفني لمساعدتك فوراً.
        </p>
      </div>

      <!-- Support Link -->
      <div style="text-align:center;margin-top:14px;">
        <a href="https://t.me/Loktech" target="_blank" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:9px 18px;border-radius:8px;">
          تواصل مع الدعم الفني عبر تليغرام
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;">متجر Lokstor للمنتجات الرقمية في الجزائر</p>
      <p style="margin:0;color:#cbd5e1;font-size:10px;">إذا كنت قد أتممت الدفع بالفعل أو لا ترغب في إكمال هذا الطلب، يمكنك تجاهل هذه الرسالة بأمان.</p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Send a 24-hour payment reminder email to the customer for a pending order.
 */
export async function sendPaymentReminderCustomerEmail(params: {
  order: OrderEmailData;
  checkoutUrl: string;
}): Promise<{ customerSent: boolean; error?: string }> {
  const { order, checkoutUrl } = params;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[Nodemailer] GMAIL_USER or GMAIL_APP_PASSWORD is not configured. Reminder email skipped.');
    return { customerSent: false, error: 'Gmail credentials missing' };
  }

  const customerEmail = (order.customerEmail || '').trim();
  if (!customerEmail || !customerEmail.includes('@')) {
    console.warn(`[Nodemailer] Order #${order.id} has no valid customer email: "${customerEmail}". Skipping reminder email.`);
    return { customerSent: false, error: 'Invalid customer email' };
  }

  const sender = getSenderEmail();
  const baseUrl = getBaseUrl();
  const shortId = (order.id || '').replace('ord_', '').slice(0, 8).toUpperCase();

  try {
    await transporter.sendMail({
      from: sender,
      to: customerEmail,
      subject: `[Lokstor] ⏳ تذكير: طلبك #${shortId} بانتظار استكمال الدفع`,
      html: renderCustomerPaymentReminderHtml({
        order,
        checkoutUrl: checkoutUrl || `${baseUrl}/checkout/${order.id}`,
        storeUrl: baseUrl,
      }),
    });

    console.log(`[Nodemailer] Payment reminder email sent successfully to ${customerEmail} for order #${shortId}`);
    return { customerSent: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Nodemailer] Failed to send payment reminder email for order #${shortId}:`, err);
    return { customerSent: false, error: errorMsg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Template: Smart Consolidated Reminder for Multiple Pending Orders
// ─────────────────────────────────────────────────────────────────────────────
function renderCustomerMultipleOrdersReminderHtml(params: {
  customerName: string;
  customerEmail: string;
  orders: OrderEmailData[];
  accountUrl: string;
  storeUrl: string;
}): string {
  const { customerName, orders, accountUrl } = params;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.productPrice || o.amount || 0), 0);

  const ordersRows = orders
    .map((o) => {
      const shortId = (o.id || '').replace('ord_', '').slice(0, 8).toUpperCase();
      const price = Number(o.productPrice || o.amount || 0);
      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 6px;font-weight:700;color:#0f172a;font-size:12px;vertical-align:middle;" dir="ltr">#${shortId}</td>
          <td style="padding:10px 6px;color:#334155;font-weight:600;font-size:12px;vertical-align:middle;">${o.productName || 'منتج رقمي'}</td>
          <td style="padding:10px 6px;color:#059669;font-weight:800;font-size:12px;text-align:left;vertical-align:middle;" dir="ltr">${formatDzd(price)} DZD</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>تذكير: لديك طلبات بانتظار استكمال الدفع</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse: collapse; }
    .email-container { width:100% !important; max-width:560px !important; margin:0 auto !important; }
    @media only screen and (max-width: 480px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-body { padding: 16px 12px !important; }
    }
  </style>
</head>
<body class="email-wrapper" style="margin:0;padding:12px 6px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;direction:rtl;text-align:right;">
  <div class="email-container" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.04);box-sizing:border-box;">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:22px 16px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">متجر Lokstor</h1>
      <p style="margin:4px 0 0;color:#fcd34d;font-size:12px;font-weight:600;">⏳ تذكير بإتمام طلباتك المعلقة</p>
    </div>

    <div class="email-body" style="padding:20px 16px;box-sizing:border-box;">
      
      <!-- Greeting -->
      <h2 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0f172a;">
        مرحباً ${customerName || 'عميلنا العزيز'} 👋
      </h2>
      <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.6;">
        لاحظنا أن لديك <strong>(${orders.length}) طلبات</strong> ما زالت بانتظار استكمال الدفع في متجر Lokstor. جميع طلباتك محفوظة لدينا ويمكنك إكمال دفعها واستلامها في أي وقت عبر البطاقة الذهبية، بايننس أو ريدوت باي.
      </p>

      <!-- Alert Box -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:13px 14px;margin-bottom:18px;">
        <div style="font-weight:700;color:#92400e;font-size:13px;">📋 قائمة طلباتك بانتظار الدفع:</div>
        <div style="color:#b45309;font-size:11px;margin-top:3px;line-height:1.5;">
          يمكنك مراجعة كل طلب وإتمام الدفع له مباشرة عبر حسابك في المتجر.
        </div>
      </div>

      <!-- Orders Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px;box-sizing:border-box;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
            <th style="padding:8px 6px;text-align:right;color:#64748b;font-size:11px;">الطلب</th>
            <th style="padding:8px 6px;text-align:right;color:#64748b;font-size:11px;">المنتج</th>
            <th style="padding:8px 6px;text-align:left;color:#64748b;font-size:11px;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${ordersRows}
        </tbody>
        <tfoot>
          <tr style="background:#f1f5f9;font-weight:800;border-top:2px solid #cbd5e1;">
            <td colspan="2" style="padding:10px 8px;color:#0f172a;font-size:12px;">المجموع الإجمالي:</td>
            <td style="padding:10px 8px;color:#059669;font-size:13px;text-align:left;" dir="ltr">${formatDzd(totalAmount)} DZD</td>
          </tr>
        </tfoot>
      </table>

      <!-- Main Action: Go to Account Button -->
      <div style="text-align:center;margin:24px 0 14px;">
        <a href="${accountUrl}" target="_blank" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:12px 32px;border-radius:10px;box-shadow:0 3px 6px rgba(5,150,105,0.25);">
          عرض طلباتي في حسابي وإتمام الدفع ←
        </a>
      </div>

      <!-- Assistance / Help Note -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:18px;">
        <div style="font-weight:700;color:#334155;font-size:12px;margin-bottom:4px;">💬 هل قمت بإنشاء بعض هذه الطلبات بالخطأ؟</div>
        <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
          إذا كررت الطلب بالخطأ، لا داعي للقلق، يمكنك فقط دفع الطلب الذي تريده وتجاهل البقية، أو التواصل معنا وسنكون سعداء بمساعدتك فوراً.
        </p>
      </div>

      <!-- Support Link -->
      <div style="text-align:center;margin-top:14px;">
        <a href="https://t.me/Loktech" target="_blank" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:9px 18px;border-radius:8px;">
          تواصل مع الدعم الفني عبر تليغرام
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;">متجر Lokstor للمنتجات الرقمية في الجزائر</p>
      <p style="margin:0;color:#cbd5e1;font-size:10px;">رسالة تذكير مجمعة لطلباتك المعلقة | شكراً لتسوقك معنا.</p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Send a smart consolidated reminder email to a customer who has multiple pending orders.
 */
export async function sendMultipleOrdersReminderCustomerEmail(params: {
  customerName: string;
  customerEmail: string;
  orders: OrderEmailData[];
  accountUrl: string;
}): Promise<{ customerSent: boolean; error?: string }> {
  const { customerName, customerEmail, orders, accountUrl } = params;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[Nodemailer] GMAIL credentials missing. Multiple orders reminder skipped.');
    return { customerSent: false, error: 'Gmail credentials missing' };
  }

  const cleanEmail = (customerEmail || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { customerSent: false, error: 'Invalid customer email' };
  }

  const sender = getSenderEmail();
  const baseUrl = getBaseUrl();

  try {
    await transporter.sendMail({
      from: sender,
      to: cleanEmail,
      subject: `[Lokstor] ⏳ تذكير: لديك ${orders.length} طلبات بانتظار استكمال الدفع`,
      html: renderCustomerMultipleOrdersReminderHtml({
        customerName,
        customerEmail: cleanEmail,
        orders,
        accountUrl: accountUrl || `${baseUrl}/account`,
        storeUrl: baseUrl,
      }),
    });

    console.log(`[Nodemailer] Smart multiple orders reminder sent successfully to ${cleanEmail} for ${orders.length} orders`);
    return { customerSent: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Nodemailer] Failed to send multiple orders reminder to ${cleanEmail}:`, err);
    return { customerSent: false, error: errorMsg };
  }
}

