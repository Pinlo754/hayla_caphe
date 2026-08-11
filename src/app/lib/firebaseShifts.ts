import { db, storage } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from './firebaseStorage';
import type { Shift } from '@/types/pos.types';

const SHIFTS_COL = 'shifts';
const TOKENS_COL = 'fcmTokens';

// ── Device identity ───────────────────────────────────────────────

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('pos_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pos_device_id', id);
  }
  return id;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toShift(id: string, data: Record<string, unknown>): Shift {
  return {
    id,
    deviceId:     data.deviceId as string,
    staffName:    data.staffName as string,
    date:         data.date as string,
    active:       (data.active as boolean) ?? false,
    checkInAt:
      data.checkInAt instanceof Timestamp
        ? data.checkInAt.toDate().toISOString()
        : (data.checkInAt as string),
    checkInPhoto:  data.checkInPhoto as string | undefined,
    checkOutAt:
      data.checkOutAt instanceof Timestamp
        ? data.checkOutAt.toDate().toISOString()
        : (data.checkOutAt as string | undefined),
    checkOutPhoto: data.checkOutPhoto as string | undefined,
  };
}

// ── Photo upload ──────────────────────────────────────────────────

async function uploadShiftPhoto(file: File | Blob, path: string): Promise<string> {
  const compressed = await compressImage(file, 800, 0.75);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

// ── Shift management ──────────────────────────────────────────────

/** Get today's active shift for this device (null if not checked in) */
export async function getActiveShift(deviceId: string): Promise<Shift | null> {
  const today = todayStr();
  const q = query(
    collection(db, SHIFTS_COL),
    where('deviceId', '==', deviceId),
    where('date', '==', today),
    where('active', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toShift(d.id, d.data() as Record<string, unknown>);
}

/** Check in — creates a shift document, optionally uploads photo */
export async function checkIn(
  deviceId: string,
  staffName: string,
  photoFile?: File | Blob
): Promise<Shift> {
  const today   = todayStr();
  const shiftId = `${today}_${deviceId}`;
  let checkInPhoto: string | undefined;

  if (photoFile) {
    checkInPhoto = await uploadShiftPhoto(photoFile, `shifts/${shiftId}_in.jpg`);
  }

  const payload: Record<string, unknown> = {
    deviceId,
    staffName,
    date:       today,
    active:     true,
    checkInAt:  serverTimestamp(),
    ...(checkInPhoto ? { checkInPhoto } : {}),
  };

  await setDoc(doc(db, SHIFTS_COL, shiftId), payload);

  return {
    id: shiftId,
    deviceId,
    staffName,
    date: today,
    active: true,
    checkInAt: new Date().toISOString(),
    checkInPhoto,
  };
}

/** Check out — closes the shift, optionally uploads photo */
export async function checkOut(shiftId: string, photoFile?: File | Blob): Promise<void> {
  let checkOutPhoto: string | undefined;

  if (photoFile) {
    checkOutPhoto = await uploadShiftPhoto(photoFile, `shifts/${shiftId}_out.jpg`);
  }

  await updateDoc(doc(db, SHIFTS_COL, shiftId), {
    active:      false,
    checkOutAt:  serverTimestamp(),
    ...(checkOutPhoto ? { checkOutPhoto } : {}),
  });
}

/** Get all currently active shifts across all devices (for notification fanout) */
export async function getAllActiveShifts(): Promise<Shift[]> {
  const today = todayStr();
  const q = query(
    collection(db, SHIFTS_COL),
    where('date', '==', today),
    where('active', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toShift(d.id, d.data() as Record<string, unknown>));
}

// ── FCM token management ─────────────────────────────────────────

export async function saveFcmToken(deviceId: string, token: string): Promise<void> {
  await setDoc(doc(db, TOKENS_COL, deviceId), {
    token,
    deviceId,
    updatedAt: serverTimestamp(),
  });
}

/** Returns FCM tokens for all currently-checked-in devices */
export async function getActiveShiftTokens(): Promise<string[]> {
  const shifts = await getAllActiveShifts();
  if (shifts.length === 0) return [];

  const deviceIds = [...new Set(shifts.map((s) => s.deviceId))];
  const tokens: string[] = [];

  // Firestore 'in' operator supports up to 30 items
  const chunks: string[][] = [];
  for (let i = 0; i < deviceIds.length; i += 30) {
    chunks.push(deviceIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const q = query(collection(db, TOKENS_COL), where('deviceId', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const token = (d.data() as { token?: string }).token;
      if (token) tokens.push(token);
    });
  }

  return tokens;
}
