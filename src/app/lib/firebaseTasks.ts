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
import type { Task, TaskLog, TaskDay, TaskGroup, TaskRecurrence } from '@/types/pos.types';
import { currentShiftPeriod, shiftPeriodOf } from './shiftPeriods';

const TASKS_COL = 'tasks';
const LOGS_COL  = 'taskLogs';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentDayKey(): TaskDay {
  const days: TaskDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date().getDay()];
}

/** Whole-day difference between two "YYYY-MM-DD" strings (date-only, no TZ drift) */
function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00Z`).getTime();
  const to   = new Date(`${toDate}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

function toTask(id: string, data: Record<string, unknown>): Task {
  const days = (data.days as TaskDay[]) ?? [];
  return {
    id,
    title:         data.title as string,
    description:   data.description as string | undefined,
    priority:      (data.priority as Task['priority']) ?? 'medium',
    group:         (data.group as TaskGroup) ?? 'hourly',
    scheduledTime: data.scheduledTime as string,
    recurrence:    (data.recurrence as TaskRecurrence) ?? (days.length > 0 ? 'weekly' : 'daily'),
    days,
    dayOfMonth:    data.dayOfMonth as number | undefined,
    intervalDays:  data.intervalDays as number | undefined,
    anchorDate:    data.anchorDate as string | undefined,
    requirePhoto:  (data.requirePhoto as boolean) ?? false,
    active:        (data.active as boolean) ?? true,
    order:         (data.order as number) ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
  };
}

/** Does this task apply today, given its recurrence rule? */
function isDueToday(task: Task, today: string, todayKey: TaskDay): boolean {
  switch (task.recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return task.days.length === 0 || task.days.includes(todayKey);
    case 'monthly':
      return !!task.dayOfMonth && new Date(`${today}T00:00:00Z`).getUTCDate() === task.dayOfMonth;
    case 'interval': {
      if (!task.intervalDays || task.intervalDays < 1) return false;
      const anchor = task.anchorDate ?? task.createdAt.slice(0, 10);
      const diff = daysBetween(anchor, today);
      return diff >= 0 && diff % task.intervalDays === 0;
    }
    default:
      return false;
  }
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

// Firestore rejects `undefined` field values — strip optional fields that
// aren't set (e.g. dayOfMonth/intervalDays/anchorDate when not applicable).
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function getTasks(): Promise<Task[]> {
  const q = query(collection(db, TASKS_COL), orderBy('scheduledTime', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTask(d.id, d.data() as Record<string, unknown>));
}

export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, TASKS_COL), {
    ...clean(data),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(id: string, data: Partial<Omit<Task, 'id'>>): Promise<void> {
  await updateDoc(doc(db, TASKS_COL, id), clean(data));
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

/** Get tasks that are active + due today (by recurrence rule) + match current HH:MM */
export async function getDueTasksNow(): Promise<Task[]> {
  const allTasks = await getTasks();
  const nowHHMM  = new Date().toTimeString().slice(0, 5);
  const today    = todayStr();
  const dayKey   = currentDayKey();

  return allTasks.filter((t) => {
    if (!t.active) return false;
    if (t.scheduledTime !== nowHHMM) return false;
    return isDueToday(t, today, dayKey);
  });
}

/**
 * Tasks applicable to today (active + due by recurrence rule) AND scheduled
 * within the shift currently running — so staff only see their own shift's
 * checklist, not the other two shifts' worth of tasks.
 */
export async function getTodayTasks(): Promise<Task[]> {
  const allTasks = await getTasks();
  const today    = todayStr();
  const dayKey   = currentDayKey();
  const nowShift = currentShiftPeriod();
  return allTasks.filter(
    (t) => t.active && isDueToday(t, today, dayKey) && shiftPeriodOf(t.scheduledTime) === nowShift
  );
}
