import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import type { Task, TaskLog, TaskDay } from '@/types/pos.types';

const TASKS_COL = 'tasks';
const LOGS_COL  = 'taskLogs';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentDayKey(): TaskDay {
  const days: TaskDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date().getDay()];
}

function toTask(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    title:         data.title as string,
    description:   data.description as string | undefined,
    priority:      (data.priority as Task['priority']) ?? 'medium',
    scheduledTime: data.scheduledTime as string,
    days:          (data.days as TaskDay[]) ?? [],
    requirePhoto:  (data.requirePhoto as boolean) ?? false,
    active:        (data.active as boolean) ?? true,
    order:         (data.order as number) ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
  };
}

function toTaskLog(id: string, data: Record<string, unknown>): TaskLog {
  return {
    id,
    taskId:      data.taskId as string,
    date:        data.date as string,
    status:      (data.status as TaskLog['status']) ?? 'pending',
    completedAt: data.completedAt instanceof Timestamp
      ? data.completedAt.toDate().toISOString()
      : (data.completedAt as string | undefined),
    completedBy:  data.completedBy as string | undefined,
    photoUrl:     data.photoUrl as string | undefined,
    notifiedAt:   data.notifiedAt as string | undefined,
  };
}

// ── Task CRUD ─────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  const q = query(collection(db, TASKS_COL), orderBy('scheduledTime', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTask(d.id, d.data() as Record<string, unknown>));
}

export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, TASKS_COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(id: string, data: Partial<Omit<Task, 'id'>>): Promise<void> {
  await updateDoc(doc(db, TASKS_COL, id), data);
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, TASKS_COL, id));
}

// ── Task Logs ────────────────────────────────────────────────────

/** Get today's task logs, creating pending entries for due tasks if needed */
export async function getTodayLogs(): Promise<TaskLog[]> {
  const date = todayStr();
  const q = query(collection(db, LOGS_COL), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTaskLog(d.id, d.data() as Record<string, unknown>));
}

/** Ensure a log document exists for a task today (idempotent) */
export async function ensureTaskLog(task: Task): Promise<void> {
  const date  = todayStr();
  const logId = `${date}_${task.id}`;
  const ref   = doc(db, LOGS_COL, logId);
  const snap  = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      taskId: task.id,
      date,
      status: 'pending',
    });
  }
}

/** Mark a task log as notified (so we don't send duplicate push notifications) */
export async function markTaskNotified(taskId: string): Promise<void> {
  const logId = `${todayStr()}_${taskId}`;
  const ref   = doc(db, LOGS_COL, logId);
  const snap  = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { taskId, date: todayStr(), status: 'pending', notifiedAt: new Date().toISOString() });
  } else {
    await updateDoc(ref, { notifiedAt: new Date().toISOString() });
  }
}

/** Complete a task — returns download URL */
export async function completeTask(
  taskId: string,
  deviceId: string,
  photoUrl?: string
): Promise<void> {
  const logId = `${todayStr()}_${taskId}`;
  await setDoc(
    doc(db, LOGS_COL, logId),
    {
      taskId,
      date:        todayStr(),
      status:      'completed',
      completedAt: serverTimestamp(),
      completedBy: deviceId,
      ...(photoUrl ? { photoUrl } : {}),
    },
    { merge: true }
  );
}

/** Get tasks that are active + scheduled for today + match current HH:MM */
export async function getDueTasksNow(): Promise<Task[]> {
  const allTasks = await getTasks();
  const nowHHMM  = new Date().toTimeString().slice(0, 5);
  const today    = currentDayKey();

  return allTasks.filter((t) => {
    if (!t.active) return false;
    if (t.scheduledTime !== nowHHMM) return false;
    if (t.days.length > 0 && !t.days.includes(today)) return false;
    return true;
  });
}

/** Tasks applicable to today (active + correct day) */
export async function getTodayTasks(): Promise<Task[]> {
  const allTasks = await getTasks();
  const today    = currentDayKey();
  return allTasks.filter((t) => {
    if (!t.active) return false;
    if (t.days.length > 0 && !t.days.includes(today)) return false;
    return true;
  });
}
