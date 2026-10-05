import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Stores: { ip -> { count, windowStart } }
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute window
const RATE_LIMIT_MAX        = 5;      // max 5 attempts per minute per IP

function getRateLimitKey(req: NextRequest): string {
  // Try headers set by reverse proxies / Vercel
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp    = req.headers.get('x-real-ip');
  const ip        = (forwarded?.split(',')[0] ?? realIp ?? '127.0.0.1').trim();
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now  = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Fresh window
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const resetIn = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart);
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.count += 1;
  rateLimitMap.set(key, entry);
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - entry.count,
    resetIn: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart),
  };
}

// Clean stale entries every 5 minutes to avoid memory leak
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  });
}, 5 * 60_000);

// ── POST /api/validate-coupon ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Rate limit check
  const ipKey = getRateLimitKey(req);
  const rl    = checkRateLimit(ipKey);

  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json(
      { success: false, error: `تجاوزت الحد المسموح به. حاول مجدداً بعد ${retryAfter} ثانية.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + rl.resetIn),
        },
      }
    );
  }

  // 2. Parse body
  let code: string;
  let productId: string | undefined;
  let basePrice: number;
  let userEmail: string | undefined;

  try {
    const body = await req.json();
    code      = String(body.code ?? '').trim().toUpperCase();
    productId = body.productId ? String(body.productId) : undefined;
    basePrice = Number(body.basePrice ?? 0);
    // email is optional — only supplied when user is logged in
    userEmail = body.userEmail ? String(body.userEmail).toLowerCase().trim() : undefined;

    if (!code || code.length > 50) {
      return NextResponse.json({ success: false, error: 'كود الخصم غير صالح' }, { status: 400 });
    }
    if (isNaN(basePrice) || basePrice < 0) {
      return NextResponse.json({ success: false, error: 'سعر غير صالح' }, { status: 400 });
    }
    // Basic email format validation
    if (userEmail && (userEmail.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail))) {
      userEmail = undefined; // ignore invalid email silently
    }
  } catch {
    return NextResponse.json({ success: false, error: 'طلب غير صالح' }, { status: 400 });
  }

  // 3. Look up code in Firestore (server-side only — no client SDK exposure)
  if (!adminDb) {
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 });
  }

  try {
    const snap = await adminDb
      .collection('discountCodes')
      .where('code', '==', code)
      .limit(1)
      .get();

    if (snap.empty) {
      // Intentionally vague — don't reveal whether code exists
      return NextResponse.json({ success: false, error: 'كود الخصم غير صحيح' }, { status: 200 });
    }

    const docSnap = snap.docs[0];
    const data    = docSnap.data() as {
      code: string;
      type: 'percentage' | 'fixed';
      value: number;
      scope: 'all' | 'product';
      productId?: string;
      isActive: boolean;
      usageCount: number;
      maxUsage?: number;
      minOrderAmount?: number;
      expiresAt?: number;
    };

    // 4. Validate code rules
    if (!data.isActive) {
      return NextResponse.json({ success: false, error: 'هذا الكود غير مفعّل حالياً' });
    }
    if (data.expiresAt && data.expiresAt < Date.now()) {
      return NextResponse.json({ success: false, error: 'انتهت صلاحية هذا الكود' });
    }
    if (data.maxUsage && data.usageCount >= data.maxUsage) {
      return NextResponse.json({ success: false, error: 'تجاوز هذا الكود الحد الأقصى للاستخدام' });
    }
    if (data.scope === 'product' && data.productId !== productId) {
      return NextResponse.json({ success: false, error: 'هذا الكود مخصص لمنتج آخر' });
    }
    if (data.minOrderAmount && basePrice < data.minOrderAmount) {
      return NextResponse.json({
        success: false,
        error: `الحد الأدنى للطلب لاستخدام هذا الكود هو ${data.minOrderAmount.toLocaleString('ar-DZ')} د.ج`,
      });
    }

    // 5. Per-email usage check — each email can use any coupon only once ever
    if (userEmail) {
      // Key: codeId_email  (sanitized to be a valid Firestore doc ID)
      const usageKey = `${docSnap.id}_${userEmail.replace(/[^a-z0-9@._-]/gi, '_')}`;
      const usageSnap = await adminDb.collection('discountUsages').doc(usageKey).get();
      if (usageSnap.exists) {
        return NextResponse.json({
          success: false,
          error: 'لقد استخدمت كود الخصم من قبل. كل إيميل يُسمح له باستخدام الكود مرة واحدة فقط.',
        });
      }
    }

    // 6. Calculate discounted price
    let discountedPrice: number;
    if (data.type === 'percentage') {
      discountedPrice = Math.max(0, Math.round(basePrice * (1 - data.value / 100)));
    } else {
      discountedPrice = Math.max(0, basePrice - data.value);
    }

    const savings = basePrice - discountedPrice;

    // 7. Return only what the client needs — no internal IDs or sensitive metadata
    return NextResponse.json(
      {
        success: true,
        discountId: docSnap.id,
        code: data.code,
        type: data.type,
        value: data.value,
        scope: data.scope,
        discountedPrice,
        originalPrice: basePrice,
        savings,
      },
      {
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      }
    );
  } catch (err: any) {
    console.error('[validate-coupon] Firestore error:', err);
    return NextResponse.json({ success: false, error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}


// Only POST is allowed
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
