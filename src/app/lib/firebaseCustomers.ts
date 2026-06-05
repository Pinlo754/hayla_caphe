import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  orderBy,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { Customer } from '@/types/pos.types';

const COL = 'customers';

function toCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    name: data.name as string,
    phone: data.phone as string,
    address: data.address as string | undefined,
    points: (data.points as number) ?? 0,
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

export async function getCustomer(id: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return toCustomer(id, snap.data() as Record<string, unknown>);
}

export async function createCustomer(
  id: string,
  data: { name: string; phone: string; address?: string; points?: number }
): Promise<Customer> {
  const payload = {
    name: data.name,
    phone: data.phone,
    ...(data.address ? { address: data.address } : {}),
    points: data.points ?? 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, COL, id), payload);
  return { id, ...data, points: data.points ?? 0, createdAt: new Date().toISOString() };
}

export async function updateCustomer(
  id: string,
  data: Partial<Pick<Customer, 'name' | 'phone' | 'address'>>
): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function addPoints(id: string, points: number): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    points: increment(points),
    updatedAt: serverTimestamp(),
  });
}

export async function getAllCustomers(): Promise<Customer[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCustomer(d.id, d.data() as Record<string, unknown>));
}
