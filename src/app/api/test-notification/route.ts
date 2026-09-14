import { NextResponse } from 'next/server';
import { getAdminDb, getAdminMessaging } from '@/app/lib/firebaseAdminApp';

export async function POST() {
  try {
    const db    = getAdminDb();
    const today = new Date().toISOString().slice(0, 10);

    // 1. Only devices currently checked in (active shift today) — devices
    //    that are off duty must NOT receive this.
    const shiftsSnap = await db
      .collection('shifts')
      .where('date', '==', today)
      .where('active', '==', true)
      .get();

    if (shiftsSnap.empty) {
      return NextResponse.json({ sent: 0, total: 0, reason: 'no active shifts' });
    }

    const deviceIds = [...new Set(shiftsSnap.docs.map((d) => d.data().deviceId as string))];

    // 2. Look up FCM tokens for those devices only (chunks of 30 for Firestore 'in')
    const tokens: string[] = [];
    for (let i = 0; i < deviceIds.length; i += 30) {
      const chunk = deviceIds.slice(i, i + 30);
      const tokSnap = await db
        .collection('fcmTokens')
        .where('deviceId', 'in', chunk)
        .get();
      tokSnap.docs.forEach((d) => {
        const t = (d.data() as { token?: string }).token;
        if (t) tokens.push(t);
      });
    }

    if (tokens.length === 0) {
      return NextResponse.json({
        sent: 0,
        total: 0,
        deviceCount: deviceIds.length,
        reason: 'no FCM tokens for active shifts',
      });
    }

    // 3. Send test push to those devices only
    const messaging = getAdminMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: '🔔 Test thông báo',
        body:  'Đây là thông báo thử — nếu bạn nhận được nghĩa là thiết bị đang trong ca hoạt động bình thường.',
      },
      data: { type: 'test' },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          requireInteraction: false,
        },
      },
    });

    return NextResponse.json({
      sent:        response.successCount,
      failed:      response.failureCount,
      total:       tokens.length,
      deviceCount: deviceIds.length,
    });
  } catch (err) {
    console.error('[test-notification]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
