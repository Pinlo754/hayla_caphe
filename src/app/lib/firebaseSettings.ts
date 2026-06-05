import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface PosSettings {
  autoDownloadReceipt: boolean;
}

const DEFAULT: PosSettings = { autoDownloadReceipt: true };
const REF = doc(db, 'settings', 'pos');

export async function getPosSettings(): Promise<PosSettings> {
  try {
    const snap = await getDoc(REF);
    if (!snap.exists()) return DEFAULT;
    const data = snap.data();
    return {
      autoDownloadReceipt: data.autoDownloadReceipt ?? DEFAULT.autoDownloadReceipt,
    };
  } catch {
    return DEFAULT;
  }
}

export async function updatePosSettings(patch: Partial<PosSettings>): Promise<void> {
  await setDoc(REF, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}
