/**
 * Facebook Messenger notification config — lưu trong Firestore settings/facebookNotify.
 *
 * Cách hoạt động:
 *   - Khi có đơn online, server gọi Messenger Send API gửi tin nhắn trực tiếp
 *     đến từng nhân viên qua PSID (Page-Scoped ID) của họ.
 *   - Dùng message_tag "POST_PURCHASE_UPDATE" — cho phép nhắn ngoài cửa sổ 24h.
 *
 * Cách lấy PSID của nhân viên:
 *   1. Nhân viên gửi bất kỳ tin nhắn nào đến Facebook Page của quán.
 *   2. Vào Page Inbox → mở cuộc trò chuyện → URL chứa thread ID,
 *      hoặc dùng Graph API Explorer:
 *      GET /me/conversations?fields=participants → lấy "id" của từng participant.
 *   3. Dán PSID vào ô bên dưới.
 *
 * Firestore document: settings/facebookNotify
 * {
 *   enabled          : boolean
 *   pageId           : string   — numeric Page ID
 *   pageAccessToken  : string   — Long-lived Page Access Token (không hết hạn)
 *   recipientPsids   : string[] — danh sách PSID nhân viên nhận thông báo
 * }
 *
 * Quyền App cần có: pages_messaging
 */

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface FacebookConfig {
  enabled: boolean;
  pageId: string;
  pageAccessToken: string;
  recipientPsids: string[];
}

const FB_DOC = doc(db, 'settings', 'facebookNotify');

export async function getFacebookConfig(): Promise<FacebookConfig | null> {
  const snap = await getDoc(FB_DOC);
  if (!snap.exists()) return null;
  return snap.data() as FacebookConfig;
}

export async function saveFacebookConfig(data: Partial<FacebookConfig>): Promise<void> {
  await setDoc(FB_DOC, data, { merge: true });
}
