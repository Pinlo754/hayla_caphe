import { create } from 'zustand';
import { getDeviceId, getActiveShift, checkIn, checkOut } from '@/app/lib/firebaseShifts';
import type { Shift } from '@/types/pos.types';

interface ShiftState {
  deviceId: string;
  shift: Shift | null;
  loading: boolean;
  loadShift: () => Promise<void>;
  doCheckIn: (staffName: string, photo?: Blob) => Promise<void>;
  doCheckOut: (photo?: Blob) => Promise<void>;
}

/**
 * Identifies which employee is using this device today. A device must be
 * checked in (staff name, optionally with a photo) before the POS unlocks;
 * every order created afterwards is tagged with `shift.staffName`.
 */
export const useShiftStore = create<ShiftState>((set, get) => ({
  deviceId: typeof window !== 'undefined' ? getDeviceId() : 'server',
  shift: null,
  loading: true,

  loadShift: async () => {
    set({ loading: true });
    try {
      const shift = await getActiveShift(get().deviceId);
      set({ shift, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  doCheckIn: async (staffName, photo) => {
    const shift = await checkIn(get().deviceId, staffName, photo);
    set({ shift });
  },

  doCheckOut: async (photo) => {
    const { shift } = get();
    if (!shift) return;
    await checkOut(shift.id, photo);
    set({ shift: null });
  },
}));
