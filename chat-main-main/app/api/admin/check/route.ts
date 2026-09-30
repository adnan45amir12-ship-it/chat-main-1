import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();
    const adminUid = process.env.ADMIN_UID || 'EqI2wKJjJ0hQ0VWg8SaFssooWk43';

    if (!uid) {
      return NextResponse.json({ isAdmin: false, error: 'UID is required' }, { status: 400 });
    }

    const isConfigured = Boolean(
      adminUid &&
      adminUid !== 'REPLACE_WITH_YOUR_FIREBASE_UID' &&
      adminUid !== 'ADMIN_UID_REPLACE_ME'
    );

    const isAdmin = isConfigured && uid === adminUid;

    return NextResponse.json({
      isAdmin,
      isConfigured,
      adminUidConfigured: isConfigured,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
