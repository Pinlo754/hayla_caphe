/**
 * Firebase Admin SDK — chỉ dùng phía server (API routes, Server Components).
 *
 * Cách lấy Service Account Key:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   → download file JSON → copy toàn bộ nội dung JSON vào .env.local:
 *
 *   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"haylacaphe-158ea",...}
 *
 * Dùng single-line JSON (không xuống dòng). Có thể dùng lệnh:
 *   node -e "console.log(JSON.stringify(require('./serviceAccountKey.json')))"
 * để convert file JSON về single line.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY chưa được cấu hình trong .env.local'
    );
  }

  return initializeApp({ credential: cert(JSON.parse(keyJson)) });
}

// Named database 'haylacaphe' — khớp với firebase.js client config
export function getAdminDb() {
  return getFirestore(getAdminApp(), 'haylacaphe');
}

export function getAdminMessaging() {
  return getMessaging(getAdminApp());
}
