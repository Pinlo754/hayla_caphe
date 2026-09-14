'use client';

import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

/** Blocks the POS until an employee logs in with their account. */
export default function LoginGate() {
  const { login, error } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      await login(username, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 items-center justify-center px-6">
      <div className="text-6xl mb-4">☕</div>
      <h1 className="font-bold text-orange-600 text-2xl italic mb-1">Hay là cà phê</h1>
      <p className="text-sm text-gray-500 mb-8 text-center">Đăng nhập để bắt đầu bán hàng</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="text"
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded-2xl px-4 py-3 text-gray-800 text-sm outline-none focus:border-orange-400"
          autoComplete="username"
          autoFocus
        />

        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3 pr-10 text-gray-800 text-sm outline-none focus:border-orange-400"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && <p className="text-red-500 text-xs text-center bg-red-50 py-2 rounded-xl">{error}</p>}

        <button
          type="submit"
          disabled={!username.trim() || !password || loading}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm disabled:bg-gray-200 disabled:text-gray-400 shadow-lg shadow-orange-200 transition"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn size={18} />
              Đăng nhập
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Chưa có tài khoản? Liên hệ quản lý để được cấp tài khoản.
      </p>
    </div>
  );
}
