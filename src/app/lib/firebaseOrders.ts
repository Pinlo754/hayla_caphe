import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import type { Order } from '@/types/pos.types';

const COL = 'orders';

// Firestore rejects undefined values — strip them via JSON round-trip
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function toOrder(docSnap: { id: string; data: () => Record<string, unknown> }): Order {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt as string | undefined),
  } as Order;
}

export async function getOrders(): Promise<Order[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toOrder);
}

export async function createOrder(data: Omit<Order, 'id'>): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt: _skip, ...rest } = data;
  const docRef = await addDoc(collection(db, COL), {
    ...clean(rest),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export async function updateOrder(id: string, data: Partial<Omit<Order, 'id'>>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt: _skip, ...rest } = data;
  await updateDoc(doc(db, COL, id), {
    ...clean(rest),
    updatedAt: serverTimestamp(),
  });
}
