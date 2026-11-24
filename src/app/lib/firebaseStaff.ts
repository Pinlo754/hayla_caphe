import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { hashPassword, generateSalt } from './passwordHash';
import type { StaffAccount } from '@/types/pos.types';

const COL = 'staffAccounts';

function toStaff(id: string, data: Record<string, unknown>): StaffAccount {
  return {
    id,
    username:     data.username as string,
    name:         data.name as string,
    passwordHash: data.passwordHash as string,
    salt:         data.salt as string,
    active:       (data.active as boolean) ?? true,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt as string | undefined),
  };
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** All employee accounts (admin management screen) */
export async function getStaffAccounts(): Promise<StaffAccount[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => toStaff(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function findByUsername(username: string) {
  const q = query(collection(db, COL), where('username', '==', normalizeUsername(username)));
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, data: snap.docs[0].data() };
}

/** Create a new employee account. Throws if the username is already taken. */
export async function createStaffAccount(
  name: string,
  username: string,
  password: string
): Promise<string> {
  const uname = normalizeUsername(username);
  if (await findByUsername(uname)) {
    throw new Error('Tên đăng nhập đã tồn tại');
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const docRef = await addDoc(collection(db, COL), {
    name: name.trim(),
    username: uname,
    salt,
    passwordHash,
    active: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update display name / active status */
export async function updateStaffAccount(
  id: string,
  data: Partial<{ name: string; active: boolean }>
): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

/** Reset an employee's password */
export async function resetStaffPassword(id: string, newPassword: string): Promise<void> {
  const salt = generateSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  await updateDoc(doc(db, COL, id), { salt, passwordHash, updatedAt: serverTimestamp() });
}

export async function deleteStaffAccount(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

/** Verify login credentials. Returns the account on success, null otherwise. */
export async function verifyLogin(username: string, password: string): Promise<StaffAccount | null> {
  const found = await findByUsername(username);
  if (!found) return null;

  const staff = toStaff(found.id, found.data);
  if (!staff.active) return null;

  const hash = await hashPassword(password, staff.salt);
  if (hash !== staff.passwordHash) return null;

  return staff;
}
