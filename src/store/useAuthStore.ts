import { create } from 'zustand';
import { verifyLogin } from '@/app/lib/firebaseStaff';

export interface StaffSession {
  id: string;
  username: string;
  name: string;
}

interface AuthState {
  session: StaffSession | null;
  loading: boolean;
  error: string;
  init: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const STORAGE_KEY = 'pos_staff_session';

/** Which employee is logged into this device — drives POS access + order attribution. */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  error: '',

  init: () => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      set({ session: raw ? (JSON.parse(raw) as StaffSession) : null, loading: false });
    } catch {
      set({ session: null, loading: false });
    }
  },

  login: async (username, password) => {
    set({ error: '' });
    try {
      const staff = await verifyLogin(username, password);
      if (!staff) {
        set({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
        return false;
      }
      const session: StaffSession = { id: staff.id, username: staff.username, name: staff.name };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      set({ session, error: '' });
      return true;
    } catch {
      set({ error: 'Không thể đăng nhập, vui lòng thử lại.' });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ session: null });
  },
}));
