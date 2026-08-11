import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminMessaging } from '@/app/lib/firebaseAdminApp';

interface SendBody {
  taskId:    string;
  taskTitle: string;
  taskDesc?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { taskId, taskTitle, taskDesc } = (await req.json()) as SendBody;
    if (!taskId || !taskTitle) {
      return NextResponse.json({ error: 'taskId and taskTitle required' }, { status: 400 });
    }

    const db      = getAdminDb();
    const today   = new Date().toISOString().slice(0, 10);

    // 1. Get all active shifts today
    const shiftsSnap = await db
      .collection('shifts')
      .where('date', '==', today)
      .where('active', '==', true)
      .get();

    if (shiftsSnap.empty) {
      return NextResponse.json({ sent: 0, reason: 'no active shifts' });
    }

    const deviceIds = [...new Set(shiftsSnap.docs.map((d) => d.data().deviceId as string))];

    // 2. Look up FCM tokens for those devices (in chunks of 30)
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
      return NextResponse.json({ sent: 0, reason: 'no FCM tokens for active shifts' });
    }

    // 3. Send multicast notification
    const messaging = getAdminMessaging();
    const response  = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `⏰ ${taskTitle}`,
        body:  taskDesc ?? 'Đến giờ thực hiện công việc!',
      },
      data: { taskId },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          requireInteraction: true,
        },
      },
    });

    // 4. Mark task log as notified
    const logId = `${today}_${taskId}`;
    await db.collection('taskLogs').doc(logId).set(
      { taskId, date: today, status: 'pending', notifiedAt: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({
      sent:    response.successCount,
      failed:  response.failureCount,
      total:   tokens.length,
    });
  } catch (err) {
    console.error('[send-task-notifications]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
