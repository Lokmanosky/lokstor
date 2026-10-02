import { NextResponse } from 'next/server';

// This route is deprecated. Tracking moved to /api/analytics/presence.
// Returning 410 Gone to any caller that may still reference this path.
export async function POST() {
  return NextResponse.json({ error: 'Deprecated. Use /api/analytics/presence.' }, { status: 410 });
}
