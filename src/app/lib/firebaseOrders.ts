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
  where,
  limit as limitQuery,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import type { Order } from '@/types/pos.types';

const COL = 'orders';

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

/** Lấy toàn bộ đơn hàng (chỉ dùng cho trang Orders list) */
export async function getOrders(): Promise<Order[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toOrder);
}

/** Lấy đơn hàng trong khoảng thời gian — dùng cho Dashboard chart */
export async function getOrdersByDateRange(from: Date, to: Date): Promise<Order[]> {
  const q = query(
    collection(db, COL),
    where('createdAt', '>=', Timestamp.fromDate(from)),
    where('createdAt', '<=', Timestamp.fromDate(to)),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toOrder);
}

/** N đơn gần nhất (cho phần "Đơn hàng gần đây") */
export async function getRecentOrders(n = 10): Promise<Order[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'), limitQuery(n));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(toOrder);
}

/** Số đơn đang chờ thanh toán */
export async function getPendingCount(): Promise<number> {
  const q = query(collection(db, COL), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.size;
}

/** Xóa nhiều đơn theo ID (chia batch để tránh giới hạn 500 của Firestore) */
export async function deleteOrdersBatch(ids: string[]): Promise<void> {
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    ids.slice(i, i + CHUNK).forEach((id) => batch.delete(doc(db, COL, id)));
    await batch.commit();
  }
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
