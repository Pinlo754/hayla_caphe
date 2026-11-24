import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/app/lib/firebaseAdminApp';
import type { CartItem } from '@/types/pos.types';

const FB_API = 'https://graph.facebook.com/v23.0';

interface NotifyOrderPayload {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNote?: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'transfer';
}

interface FacebookConfig {
  enabled: boolean;
  pageAccessToken: string;
  recipientPsids: string[];
}

async function getFbConfig(): Promise<FacebookConfig | null> {
  const db = getAdminDb();
  const snap = await db.collection('settings').doc('facebookNotify').get();
  if (!snap.exists) return null;
  return snap.data() as FacebookConfig;
}

function buildMessage(p: NotifyOrderPayload): string {
  const itemLines = p.items
    .map((i) => {
      let line = `• ${i.quantity}× ${i.name}`;
      if (i.size) line += ` [${i.size}]`;
      if (i.combo) line += ` + ${i.combo}`;
      if (i.toppings?.length) line += ` (${i.toppings.join(', ')})`;
      line += ` — ${(i.price * i.quantity).toLocaleString('vi-VN')}đ`;
      return line;
    })
    .join('\n');

  const payment = p.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản';
  const stamp = new Date().toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return [
    `🛎 ĐƠN ONLINE MỚI — #${p.orderId.slice(-8).toUpperCase()}`,
    `🕐 ${stamp}`,
    ``,
    `👤 ${p.customerName}`,
    `📞 ${p.customerPhone}`,
    `📍 ${p.customerAddress}`,
    ...(p.customerNote ? [`💬 ${p.customerNote}`] : []),
    ``,
    itemLines,
    ``,
    `💰 Tổng: ${p.total.toLocaleString('vi-VN')}đ`,
    `💳 ${payment}`,
  ].join('\n');
}

async function sendToOne(psid: string, text: string, token: string): Promise<string | null> {
  const res = await fetch(`${FB_API}/me/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      recipient: { id: psid },
      messaging_type: 'UPDATE',
      message: { text },
    }),
  });

  const data = await res.json();
  if (data.error) {
    return `PSID ${psid}: ${data.error.message} (code ${data.error.code})`;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body: NotifyOrderPayload = await req.json();

    const cfg = await getFbConfig();
    if (!cfg?.enabled) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'disabled' });
    }

    const psids = cfg.recipientPsids?.filter(Boolean) ?? [];
    if (!cfg.pageAccessToken) {
      return NextResponse.json(
        { ok: false, error: 'Chưa cấu hình Page Access Token' },
        { status: 400 }
      );
    }
    if (psids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Chưa có PSID nhân viên nào trong danh sách' },
        { status: 400 }
      );
    }

    const text = buildMessage(body);

    const errors = (
      await Promise.all(psids.map((psid) => sendToOne(psid, text, cfg.pageAccessToken)))
    ).filter(Boolean) as string[];

    if (errors.length === psids.length) {
      return NextResponse.json({ ok: false, error: errors.join('; ') }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      sent: psids.length - errors.length,
      failed: errors.length,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (err) {
    console.error('[notify-order] Exception:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
