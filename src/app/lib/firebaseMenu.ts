import { db } from './firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { MenuItem } from '@/types/pos.types';
import { menuItems as staticMenu } from '@/data/menuItems';

const COL = 'menuItems';

function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function docToMenuItem(docSnap: { id: string; data: () => Record<string, unknown> }): MenuItem {
  const d = docSnap.data();
  return {
    id: Number(docSnap.id),
    name: d.name as string,
    price: d.price as number,
    category: d.category as string,
    combos: d.combos as string[] | undefined,
    image: d.image as string | undefined,
    available: (d.available as boolean) ?? true,
    toppings: d.toppings as string[] | undefined,
  };
}

async function fetchAll(): Promise<ReturnType<typeof docToMenuItem>[]> {
  const snapshot = await getDocs(collection(db, COL));
  if (snapshot.empty) {
    await seedMenuItems();
    const seeded = await getDocs(collection(db, COL));
    return seeded.docs.map(docToMenuItem);
  }
  return snapshot.docs.map(docToMenuItem);
}

async function seedMenuItems(): Promise<void> {
  for (const item of staticMenu) {
    await setDoc(doc(db, COL, String(item.id)), {
      ...clean(item),
      available: true,
      createdAt: serverTimestamp(),
    });
  }
}

// POS: only available items
export async function getMenuItems(): Promise<MenuItem[]> {
  const all = await fetchAll();
  return all
    .filter((i) => i.available !== false)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

// Admin: all items including unavailable
export async function getAllMenuItems(): Promise<MenuItem[]> {
  const all = await fetchAll();
  return all.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function createMenuItem(data: Omit<MenuItem, 'id'>): Promise<number> {
  const snapshot = await getDocs(collection(db, COL));
  const maxId = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0);
  const newId = maxId + 1;
  await setDoc(doc(db, COL, String(newId)), {
    ...clean(data),
    id: newId,
    available: true,
    createdAt: serverTimestamp(),
  });
  return newId;
}

export async function updateMenuItem(id: number, data: Partial<MenuItem>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...rest } = data;
  await updateDoc(doc(db, COL, String(id)), {
    ...clean(rest),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMenuItem(id: number): Promise<void> {
  await deleteDoc(doc(db, COL, String(id)));
}
