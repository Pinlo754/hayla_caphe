'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, LogIn, LogOut, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getTodayTasks, getTodayLogs, completeTask } from '@/app/lib/firebaseTasks';
import {
  getDeviceId,
  getActiveShift,
  checkIn,
  checkOut,
  saveFcmToken,
} from '@/app/lib/firebaseShifts';
import { compressImage } from '@/app/lib/firebaseStorage';
import { uploadReceiptImage } from '@/app/lib/firebaseStorage';
import { storage } from '@/app/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Task, TaskLog, Shift } from '@/types/pos.types';

// ── FCM init (client-only) ────────────────────────────────────────

async function initFcm(deviceId: string) {
  try {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return;
    const { getMessaging, getToken } = await import('firebase/messaging');
    const { app } = await import('@/app/lib/firebase');
    const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: sw });
    if (token) await saveFcmToken(deviceId, token);
  } catch { /* FCM not available — skip silently */ }
}

// ── Camera capture portal ─────────────────────────────────────────

interface CameraPortalProps {
  title: string;
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

function CameraPortal({ title, onCapture, onClose }: CameraPortalProps) {
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {});
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [ready]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const compressed = await compressImage(blob, 800, 0.8);
      onCapture(compressed);
    }, 'image/jpeg', 0.9);
  };

  if (!ready) return null;
  return createPortal(
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]">
      <p className="text-white/80 text-sm mb-4">{title}</p>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-sm rounded-2xl object-cover"
        style={{ maxHeight: '60vh' }}
      />
      <div className="flex gap-4 mt-6">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-white/20 text-white rounded-full font-bold text-sm"
        >
          Hủy
        </button>
        <button
          onClick={capture}
          className="px-8 py-3 bg-orange-500 text-white rounded-full font-bold text-sm shadow-lg"
        >
          Chụp ảnh
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Task card ─────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  log: TaskLog | undefined;
  deviceId: string;
  onComplete: (taskId: string) => void;
}

function TaskCard({ task, log, deviceId, onComplete }: TaskCardProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [completing, setCompleting] = useState(false);

  const isDone = log?.status === 'completed';

  const handleComplete = async (photoBlob?: Blob) => {
    setCompleting(true);
    try {
      let photoUrl: string | undefined;
      if (photoBlob) {
        const storageRef = ref(storage, `task-photos/${new Date().toISOString().slice(0,10)}_${task.id}.jpg`);
        await uploadBytes(storageRef, photoBlob, { contentType: 'image/jpeg' });
        photoUrl = await getDownloadURL(storageRef);
      }
      await completeTask(task.id, deviceId, photoUrl);
      onComplete(task.id);
    } finally {
      setCompleting(false);
      setShowCamera(false);
    }
  };

  const PRIORITY_DOT: Record<string, string> = {
    high:   'bg-red-500',
    medium: 'bg-amber-500',
    low:    'bg-green-500',
  };

  return (
    <>
      {showCamera && (
        <CameraPortal
          title={`Chụp ảnh: ${task.title}`}
          onCapture={(blob) => { setShowCamera(false); handleComplete(blob); }}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className={`bg-white rounded-2xl border p-4 flex gap-3 items-start transition ${isDone ? 'opacity-60' : ''}`}>
        {/* Priority dot */}
        <div className="mt-1 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${PRIORITY_DOT[task.priority]}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-bold text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {task.title}
            </p>
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Clock size={10} />{task.scheduledTime}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
          )}
          {isDone && log?.completedAt && (
            <p className="text-[10px] text-green-600 mt-1">
              ✓ Hoàn thành lúc {new Date(log.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {isDone && log?.photoUrl && (
            <a href={log.photoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 mt-0.5 inline-block">
              📷 Xem ảnh minh chứng
            </a>
          )}
        </div>

        {!isDone && (
          <button
            disabled={completing}
            onClick={() => task.requirePhoto ? setShowCamera(true) : handleComplete()}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:bg-gray-200 disabled:text-gray-400 transition"
          >
            {completing ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              <>
                {task.requirePhoto && <Camera size={13} />}
                Xong
              </>
            )}
          </button>
        )}

        {isDone && <CheckCircle2 size={22} className="text-green-500 shrink-0 mt-0.5" />}
      </div>
    </>
  );
}

// ── Main tab ──────────────────────────────────────────────────────

export default function ChecklistTab() {
  const deviceId = getDeviceId();

  const [shift, setShift]       = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [logs, setLogs]         = useState<TaskLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Check-in form state
  const [staffName, setStaffName]   = useState('');
  const [showCheckinCamera, setShowCheckinCamera]   = useState(false);
  const [showCheckoutCamera, setShowCheckoutCamera] = useState(false);
  const [checkinLoading, setCheckinLoading]   = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Load active shift on mount
  useEffect(() => {
    getActiveShift(deviceId).then((s) => {
      setShift(s);
      setShiftLoading(false);
    }).catch(() => setShiftLoading(false));
  }, [deviceId]);

  // Init FCM once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then(() => initFcm(deviceId)).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTasks = useCallback(async () => {
    setDataLoading(true);
    try {
      const [t, l] = await Promise.all([getTodayTasks(), getTodayLogs()]);
      setTasks(t);
      setLogs(l);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Load tasks whenever shift becomes active
  useEffect(() => {
    if (shift?.active) loadTasks();
  }, [shift, loadTasks]);

  // Client-side scheduler: every minute check for due tasks
  useEffect(() => {
    if (!shift?.active) return;
    const interval = setInterval(async () => {
      const now = new Date().toTimeString().slice(0, 5);
      const due = tasks.filter((t) => t.scheduledTime === now && t.active);
      for (const task of due) {
        const alreadyNotified = logs.find((l) => l.taskId === task.id && l.notifiedAt);
        if (!alreadyNotified) {
          await fetch('/api/send-task-notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.id, taskTitle: task.title, taskDesc: task.description }),
          }).catch(() => {});
          // Refresh logs so we track notifiedAt locally too
          getTodayLogs().then(setLogs).catch(() => {});
        }
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [shift, tasks, logs]);

  const handleCheckIn = async (photoBlob?: Blob) => {
    if (!staffName.trim()) return;
    setCheckinLoading(true);
    try {
      const newShift = await checkIn(deviceId, staffName.trim(), photoBlob);
      setShift(newShift);
      await initFcm(deviceId);
      await loadTasks();
    } finally {
      setCheckinLoading(false);
      setShowCheckinCamera(false);
    }
  };

  const handleCheckOut = async (photoBlob?: Blob) => {
    if (!shift) return;
    setCheckoutLoading(true);
    try {
      await checkOut(shift.id, photoBlob);
      setShift(null);
      setTasks([]);
      setLogs([]);
    } finally {
      setCheckoutLoading(false);
      setShowCheckoutCamera(false);
    }
  };

  const handleTaskComplete = (taskId: string) => {
    getTodayLogs().then(setLogs).catch(() => {});
  };

  // ── Loading ────────────────────────────────────────────────────
  if (shiftLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not checked in ─────────────────────────────────────────────
  if (!shift) {
    return (
      <>
        {showCheckinCamera && (
          <CameraPortal
            title="Chụp ảnh check-in"
            onCapture={(blob) => { setShowCheckinCamera(false); handleCheckIn(blob); }}
            onClose={() => setShowCheckinCamera(false)}
          />
        )}

        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <div className="text-6xl mb-4">☕</div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Chào mừng!</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">Hãy check-in để bắt đầu ca làm việc hôm nay</p>

          <div className="w-full max-w-xs space-y-3">
            <input
              type="text"
              placeholder="Tên nhân viên"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full border rounded-2xl px-4 py-3 text-gray-800 text-sm outline-none focus:border-orange-400"
            />

            <button
              disabled={!staffName.trim() || checkinLoading}
              onClick={() => setShowCheckinCamera(true)}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm disabled:bg-gray-200 disabled:text-gray-400 shadow-lg shadow-orange-200 transition"
            >
              {checkinLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Camera size={18} />
                  Check-in với ảnh
                </>
              )}
            </button>

            <button
              disabled={!staffName.trim() || checkinLoading}
              onClick={() => handleCheckIn()}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold text-sm disabled:opacity-40 transition"
            >
              <LogIn size={16} />
              Check-in không ảnh
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Checked in — task list ─────────────────────────────────────
  const completedCount = tasks.filter((t) => logs.find((l) => l.taskId === t.id && l.status === 'completed')).length;

  // Group tasks by hour bucket for display
  const grouped: Record<string, Task[]> = {};
  for (const task of tasks) {
    const hour = task.scheduledTime.slice(0, 2) + ':00';
    if (!grouped[hour]) grouped[hour] = [];
    grouped[hour].push(task);
  }

  return (
    <>
      {showCheckoutCamera && (
        <CameraPortal
          title="Chụp ảnh check-out"
          onCapture={(blob) => { setShowCheckoutCamera(false); handleCheckOut(blob); }}
          onClose={() => setShowCheckoutCamera(false)}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-lg">
          👤
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm">{shift.staffName}</p>
          <p className="text-xs text-green-600">
            ✓ Check-in lúc{' '}
            {new Date(shift.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{completedCount}/{tasks.length} việc</p>
          <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1">
            <div
              className="h-1.5 bg-orange-500 rounded-full transition-all"
              style={{ width: tasks.length > 0 ? `${(completedCount / tasks.length) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* Refresh */}
      <div className="flex justify-end mb-3">
        <button
          onClick={loadTasks}
          disabled={dataLoading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          <RefreshCw size={13} className={dataLoading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-sm">Không có công việc nào hôm nay</p>
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([hour, hourTasks]) => (
              <div key={hour}>
                <p className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                  <Clock size={11} /> {hour}
                </p>
                <div className="space-y-2">
                  {hourTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      log={logs.find((l) => l.taskId === task.id)}
                      deviceId={deviceId}
                      onComplete={handleTaskComplete}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Check-out button */}
      <div className="fixed bottom-20 left-4 right-4 z-30">
        <button
          disabled={checkoutLoading}
          onClick={() => setShowCheckoutCamera(true)}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-3.5 rounded-2xl font-bold text-sm shadow-xl transition"
        >
          {checkoutLoading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogOut size={18} />
              Check-out kết thúc ca
            </>
          )}
        </button>
      </div>
    </>
  );
}
