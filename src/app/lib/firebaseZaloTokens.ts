/**
 * Zalo OA token management — lưu access/refresh token vào Firestore.
 *
 * Firestore path: settings/zaloTokens
 * {
 *   accessToken  : string  — hết hạn sau 2 tiếng
 *   refreshToken : string  — hết hạn sau 90 ngày, tự gia hạn sau mỗi lần refresh
 *   expiresAt    : number  — timestamp ms của access_token
 *   groupId      : string  — ID nhóm GMF cần gửi tin
 *   enabled      : boolean — bật/tắt thông báo Zalo
 * }
 *
 * Env vars cần có (trong .env.local):
 *   ZALO_APP_ID
 *   ZALO_APP_SECRET
 */

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface ZaloConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  groupId: string;
  enabled: boolean;
}

const TOKEN_DOC = doc(db, 'settings', 'zaloTokens');

export async function getZaloConfig(): Promise<ZaloConfig | null> {
  const snap = await getDoc(TOKEN_DOC);
  if (!snap.exists()) return null;
  return snap.data() as ZaloConfig;
}

export async function saveZaloConfig(data: Partial<ZaloConfig>): Promise<void> {
  await setDoc(TOKEN_DOC, data, { merge: true });
}

/**
 * Trả về access_token hợp lệ, tự động refresh nếu sắp hết hạn.
 * Trả về null nếu chưa cấu hình hoặc refresh thất bại.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const cfg = await getZaloConfig();
  if (!cfg?.enabled || !cfg.refreshToken) return null;

  const BUFFER_MS = 5 * 60 * 1000; // làm mới trước 5 phút
  if (cfg.accessToken && Date.now() < cfg.expiresAt - BUFFER_MS) {
    return cfg.accessToken;
  }

  // Refresh access token
  const appId = process.env.ZALO_APP_ID;
  const appSecret = process.env.ZALO_APP_SECRET;
  if (!appId || !appSecret) {
    console.error('[ZaloTokens] Thiếu ZALO_APP_ID / ZALO_APP_SECRET trong env');
    return null;
  }

  try {
    const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'secret_key': appSecret,
      },
      body: new URLSearchParams({
        app_id: appId,
        grant_type: 'refresh_token',
        refresh_token: cfg.refreshToken,
      }),
    });

    const data = await res.json();
    if (!data.access_token) {
      console.error('[ZaloTokens] Refresh thất bại:', data);
      return null;
    }

    const updated: Partial<ZaloConfig> = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? cfg.refreshToken,
      expiresAt: Date.now() + (Number(data.expires_in) || 7200) * 1000,
    };
    await saveZaloConfig(updated);
    return updated.accessToken!;
  } catch (err) {
    console.error('[ZaloTokens] Lỗi khi refresh token:', err);
    return null;
  }
}

/**
 * Đổi authorization_code lấy access_token + refresh_token (chạy 1 lần khi setup).
 */
export async function exchangeCodeForTokens(
  code: string,
  appId: string,
  appSecret: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  try {
    const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'secret_key': appSecret,
      },
      body: new URLSearchParams({
        app_id: appId,
        grant_type: 'authorization_code',
        code,
      }),
    });
    const data = await res.json();
    if (!data.access_token) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: Number(data.expires_in) || 7200,
    };
  } catch {
    return null;
  }
}
