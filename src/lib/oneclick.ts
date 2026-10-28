/**
 * OneClickDz (Navio OCPay) Payment Gateway Integration
 * Supports Edahabia & CIB cards via Satim
 */

export const getOneClickApiKey = (customKey?: string): string => {
  const key = (customKey || process.env.ONECLICK_API_KEY || '').trim();
  return key;
};

export const isOneClickConfigured = (customKey?: string): boolean => {
  return Boolean(getOneClickApiKey(customKey));
};

export const ONECLICK_BASE_URL = (process.env.ONECLICK_BASE_URL || 'https://api.oneclickdz.com').replace(/\/$/, '');

export interface CreateOneClickLinkParams {
  amount: number;
  productName: string;
  orderId: string;
  guestAccessToken: string;
  baseUrl: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customKey?: string;
}

export interface CreateOneClickLinkResult {
  success: boolean;
  paymentUrl?: string;
  paymentRef?: string;
  error?: string;
}

/**
 * Robust fetch with automatic retries and timeout
 * Solves transient TCP SYN handshake drops on Cloudflare Anycast IPs
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  timeoutMs = 6000
): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        // Wait 350ms before retrying on alternative IP
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  }
  throw lastError;
}

/**
 * Creates a single-use payment link via OneClickDz Navio OCPay
 */
export async function createOneClickPaymentLink({
  amount,
  productName,
  orderId,
  guestAccessToken,
  baseUrl,
  customerEmail,
  customKey,
}: CreateOneClickLinkParams): Promise<CreateOneClickLinkResult> {
  const apiKey = getOneClickApiKey(customKey);
  if (!apiKey) {
    return { success: false, error: 'مفتاح OneClickDz API غير مضبوط' };
  }

  // Clean baseUrl
  const siteUrl = baseUrl.replace(/\/$/, '');
  const returnUrl = `${siteUrl}/success?order_id=${encodeURIComponent(orderId)}&token=${encodeURIComponent(guestAccessToken)}&gateway=oneclick`;

  const payload = {
    productInfo: {
      title: (productName || 'طلب متجر Lokstor').substring(0, 100),
      description: `رقم الطلب: ${orderId}${customerEmail ? ` - ${customerEmail}` : ''}`.substring(0, 255),
      amount: Math.round(Number(amount)),
    },
    feeMode: 'NO_FEE',
    successMessage: 'شكراً لطلبك من متجر Lokstor! جاري تحويلك لاستلام الطلب...',
    redirectUrl: returnUrl,
  };

  try {
    const res = await fetchWithRetry(
      `${ONECLICK_BASE_URL}/v3/ocpay/createLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': apiKey,
        },
        body: JSON.stringify(payload),
      },
      3,
      6000
    );

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      const errDetail =
        data?.message ||
        data?.error?.message ||
        (typeof data?.error === 'string' ? data?.error : null) ||
        res.statusText ||
        'خطأ من خادم OneClickDz';
      console.error('OneClickDz createLink failed:', { status: res.status, data });
      return { success: false, error: errDetail };
    }

    const paymentUrl = data.data?.paymentUrl || data.data?.url || data.paymentUrl;
    const paymentRef = data.data?.paymentRef || data.data?.ref || data.paymentRef;

    if (!paymentUrl) {
      return { success: false, error: 'لم يُرجع خادم OneClickDz رابط الدفع' };
    }

    return {
      success: true,
      paymentUrl,
      paymentRef,
    };
  } catch (error: any) {
    console.error('OneClickDz network error:', error);
    const friendlyMsg =
      error?.name === 'AbortError' || error?.message?.includes('timeout')
        ? 'استغرق الاتصال ببوابة OneClickDz وقتاً طويلاً. يرجى المحاولة مجدداً.'
        : 'تعذر الاتصال بخادم بوابة OneClickDz، يرجى إعادة المحاولة.';
    return { success: false, error: friendlyMsg };
  }
}

/**
 * Checks the status of an existing OneClickDz payment
 */
export async function checkOneClickPayment(
  paymentRef: string,
  customKey?: string
): Promise<{ success: boolean; isPaid: boolean; status?: string; error?: string }> {
  const apiKey = getOneClickApiKey(customKey);
  if (!apiKey || !paymentRef) {
    return { success: false, isPaid: false, error: 'بيانات غير كافية للتحقق' };
  }

  try {
    const res = await fetchWithRetry(
      `${ONECLICK_BASE_URL}/v3/ocpay/checkPayment/${encodeURIComponent(paymentRef)}`,
      {
        method: 'GET',
        headers: {
          'X-Access-Token': apiKey,
        },
      },
      3,
      6000
    );

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      return {
        success: false,
        isPaid: false,
        error: data?.message || data?.error || 'فشل التحقق من حالة الدفع',
      };
    }

    // Status is typically "CONFIRMED", "PAID", or "SUCCESS"
    const rawStatus = (data.data?.status || data.status || '').toUpperCase();
    const isPaid =
      rawStatus === 'CONFIRMED' ||
      rawStatus === 'PAID' ||
      rawStatus === 'SUCCESS' ||
      rawStatus === 'FULFILLED';

    return {
      success: true,
      isPaid,
      status: rawStatus,
    };
  } catch (error: any) {
    console.error('OneClickDz checkPayment network error:', error);
    return { success: false, isPaid: false, error: 'تعذر الاتصال بخادم OneClickDz للتحقق' };
  }
}
