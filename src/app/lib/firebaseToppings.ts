import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { TOPPINGS, TOPPING_PRICE } from '@/data/menuItems';

export interface ToppingItem {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

const COL = 'toppings';

function docToTopping(docSnap: { id: string; data: () => Record<string, unknown> }): ToppingItem {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    name: d.name as string,
    price: d.price as number,
    available: (d.available as boolean) ?? true,
  };
}

async function fetchAll(): Promise<ToppingItem[]> {
  const snapshot = await getDocs(collection(db, COL));
  if (snapshot.empty) {
    await seedToppings();
    const seeded = await getDocs(collection(db, COL));
    return seeded.docs.map(docToTopping).sort((a, b) => a.name.localeCompare(b.name));
  }
  return snapshot.docs.map(docToTopping).sort((a, b) => a.name.localeCompare(b.name));
}

async function seedToppings(): Promise<void> {
  for (const name of TOPPINGS) {
    await addDoc(collection(db, COL), {
      name,
      price: TOPPING_PRICE,
      available: true,
      createdAt: serverTimestamp(),
    });
  }
}

// POS: only available toppings
export async function getToppings(): Promise<ToppingItem[]> {
  const all = await fetchAll();
  return all.filter((t) => t.available !== false);
}

// Admin: all toppings
export async function getAllToppings(): Promise<ToppingItem[]> {
  return fetchAll();
}

export async function createTopping(data: { name: string; price: number }): Promise<string> {
  const docRef = await addDoc(collection(db, COL), {
    ...data,
    available: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTopping(id: string, data: Partial<Omit<ToppingItem, 'id'>>): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTopping(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
