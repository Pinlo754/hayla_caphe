import { NextRequest, NextResponse } from 'next/server';
import { getZaloConfig, getValidAccessToken } from '@/app/lib/firebaseZaloTokens';
import type { CartItem } from '@/types/pos.types';

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

function buildMessage(p: NotifyOrderPayload): string {
  const itemLines = p.items
    .map((i) => {
      let line = `  • ${i.quantity}× ${i.name}`;
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
    `👤 Khách: ${p.customerName}`,
    `📞 SĐT: ${p.customerPhone}`,
    `📍 Địa chỉ: ${p.customerAddress}`,
    ...(p.customerNote ? [`💬 Ghi chú: ${p.customerNote}`] : []),
    ``,
    `🧾 Đơn hàng:`,
    itemLines,
    ``,
    `💰 Tổng: ${p.total.toLocaleString('vi-VN')}đ`,
    `💳 Thanh toán: ${payment}`,
  ].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body: NotifyOrderPayload = await req.json();

    const cfg = await getZaloConfig();
    if (!cfg?.enabled) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'disabled' });
    }
    if (!cfg.groupId) {
      return NextResponse.json({ ok: false, error: 'Chưa cấu hình Group ID Zalo' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Không lấy được access token Zalo' }, { status: 500 });
    }

    const text = buildMessage(body);

    const res = await fetch('https://openapi.zalo.me/v3.0/oa/message/group/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': accessToken,
      },
      body: JSON.stringify({
        recipient: { group_id: cfg.groupId },
        message: { text },
      }),
    });

    const data = await res.json();

    if (data.error !== 0) {
      console.error('[notify-order] Zalo API error:', data);
      return NextResponse.json({ ok: false, error: data.message ?? 'Zalo API lỗi', data }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notify-order] Exception:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
