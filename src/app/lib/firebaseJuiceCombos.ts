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
import { JUICE_COMBOS } from '@/data/menuItems';

export interface JuiceCombo {
  id: string;
  name: string;
  available: boolean;
}

const COL = 'juiceCombos';

function docToCombo(docSnap: { id: string; data: () => Record<string, unknown> }): JuiceCombo {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    name: d.name as string,
    available: (d.available as boolean) ?? true,
  };
}

async function fetchAll(): Promise<JuiceCombo[]> {
  const snapshot = await getDocs(collection(db, COL));
  if (snapshot.empty) {
    await seedCombos();
    const seeded = await getDocs(collection(db, COL));
    return seeded.docs.map(docToCombo);
  }
  return snapshot.docs.map(docToCombo);
}

async function seedCombos(): Promise<void> {
  for (const name of JUICE_COMBOS) {
    await addDoc(collection(db, COL), {
      name,
      available: true,
      createdAt: serverTimestamp(),
    });
  }
}

// Admin: tất cả combo (kể cả đang nghỉ)
export async function getAllJuiceCombos(): Promise<JuiceCombo[]> {
  return fetchAll();
}

// POS: chỉ combo đang bán
export async function getActiveJuiceCombos(): Promise<string[]> {
  const all = await fetchAll();
  return all.filter((c) => c.available !== false).map((c) => c.name);
}

export async function createJuiceCombo(name: string): Promise<string> {
  const docRef = await addDoc(collection(db, COL), {
    name,
    available: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateJuiceCombo(id: string, data: Partial<Omit<JuiceCombo, 'id'>>): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJuiceCombo(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
