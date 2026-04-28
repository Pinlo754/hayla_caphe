'use client';

import { useState, useEffect } from 'react';
import { usePosStore } from '@/store/usePosStore';
import { LayoutDashboard, Coffee, ClipboardList, Plus, Minus, ShoppingCart, X, Clock, CheckCircle2 } from 'lucide-react';

// CẤU HÌNH MOCKAPI URL
const MOCK_API_URL = 'https://69f11ba2c1533dbedc9e1899.mockapi.io/';

const menuItems = [
  { id: 1, name: 'Cà phê đen M', price: 35000, category: 'coffee' },
  { id: 2, name: 'Cà phê đen L', price: 39000, category: 'coffee' },
  { id: 3, name: 'Cà phê sữa M', price: 37000, category: 'coffee' },
  { id: 4, name: 'Cà phê sữa L', price: 41000, category: 'coffee' },
  { id: 5, name: 'Cà phê sữa tươi M', price: 44000, category: 'coffee' },
  { id: 6, name: 'Cà phê sữa tươi L', price: 49000, category: 'coffee' },
  { id: 7, name: 'Bạc xỉu M', price: 44000, category: 'coffee' },
  { id: 8, name: 'Bạc xỉu L', price: 49000, category: 'coffee' },
  { id: 9, name: 'Cà phê muối M', price: 44000, category: 'coffee' },
  { id: 10, name: 'Cà phê muối L', price: 49000, category: 'coffee' },
  { id: 11, name: 'Americano M', price: 39000, category: 'coffee' },
  { id: 12, name: 'Americano L', price: 44000, category: 'coffee' },
  { id: 15, name: 'Cappuccino', price: 44000, category: 'coffee' },
  { id: 16, name: 'Latte', price: 44000, category: 'coffee' },
  { id: 17, name: 'Coldbrew chanh vàng', price: 49000, category: 'coffee' },
  { id: 26, name: 'Trà thạch đào', price: 49000, category: 'tea' },
  { id: 27, name: 'Trà sen vàng kem lá dứa', price: 49000, category: 'tea' },
  { id: 28, name: 'Olong ổi hồng', price: 49000, category: 'tea' },
];

export default function MobilePOS() {
  const { cart, selectedTable, selectTable, addToCart, updateQuantity, clearCart } = usePosStore();

  const [activeTab, setActiveTab] = useState('tables');
  const [products] = useState<any[]>(menuItems);
  const [showCart, setShowCart] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [showQR, setShowQR] = useState(false);
  const [isQRExpanded, setIsQRExpanded] = useState(false);
  // State cho danh sách đơn hàng
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // 1. Lấy danh sách đơn hàng từ MockAPI
  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`${MOCK_API_URL}/orders`);
      if (res.ok) {
        const data = await res.json();
        // Sắp xếp đơn mới nhất lên đầu
        setOrders(data.reverse());
      }
    } catch (error) {
      console.error("Lỗi lấy đơn hàng:", error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Tự động load đơn hàng khi chuyển sang tab 'orders'
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  // 2. Logic tạo Order (POST)
  const handleCheckout = async () => {
    if (!selectedTable || cart.length === 0) return;
    setIsProcessing(true);

    try {
      const orderData = {
        tableId: selectedTable,
        items: cart,
        totalPrice: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        paymentMethod: paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const response = await fetch(`${MOCK_API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error('Lỗi server');

      alert(`Thành công! Đơn hàng Bàn ${selectedTable} đã được gửi.`);
      clearCart();
      setShowCart(false);
      setShowQR(false);
      setActiveTab('orders'); // Chuyển sang xem danh sách đơn sau khi đặt thành công
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white p-4 border-b flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <h1 className="font-bold text-orange-600 text-xl tracking-tighter italic">Hay là cà phê</h1>
        {selectedTable && activeTab !== 'orders' && (
          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
            Đang chọn: Bàn {selectedTable}
          </span>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4">

        {/* TAB 1: CHỌN BÀN */}
        {activeTab === 'tables' && (
          <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-300">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
              <button
                key={t}
                onClick={() => { selectTable(t); setActiveTab('menu'); }}
                className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${selectedTable === t ? 'border-orange-500 bg-orange-50 text-orange-600' : 'bg-white border-transparent shadow-sm text-gray-800'
                  }`}
              >
                <span className="text-[10px] opacity-50 uppercase font-bold">Bàn</span>
                <span className="text-2xl font-black">{t}</span>
              </button>
            ))}
          </div>
        )}

        {/* TAB 2: CHỌN MÓN */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
            {products.map((p) => (
              <div key={p.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 relative overflow-hidden">
                <div className="h-20 bg-orange-50 rounded-xl mb-2 flex items-center justify-center text-orange-200">
                  <Coffee size={28} />
                </div>
                <h3 className="font-bold text-xs h-8 line-clamp-2 leading-tight text-gray-800">{p.name}</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-orange-600 font-black text-sm">{p.price.toLocaleString()}đ</span>
                  <button
                    onClick={() => {
                      if (!selectedTable) return alert("Vui lòng chọn bàn trước!");
                      addToCart(p);
                    }}
                    className="bg-orange-500 text-white p-1.5 rounded-lg active:scale-90 shadow-md shadow-orange-100"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: DANH SÁCH ĐƠN HÀNG (TRANG MỚI) */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-black text-gray-800 text-lg">Lịch sử đơn hàng</h2>
              <button onClick={fetchOrders} className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">Làm mới</button>
            </div>

            {isLoadingOrders ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-sm font-medium">Đang tải đơn hàng...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <ClipboardList size={48} className="mx-auto text-gray-200 mb-2" />
                <p className="text-gray-400 text-sm">Chưa có đơn hàng nào</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đơn hàng #{order.id}</p>
                      <h4 className="text-lg font-black text-gray-800">Bàn số {order.tableId}</h4>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${order.status === 'pending' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                      }`}>
                      {order.status === 'pending' ? '⏳ Chờ xử lý' : '✅ Hoàn tất'}
                    </span>
                  </div>

                  <div className="space-y-1 mb-3 border-t border-b border-gray-50 py-2">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs text-gray-600">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{(item.price * item.quantity).toLocaleString()}đ</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-gray-400 text-[10px]">
                      <Clock size={12} />
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Tổng cộng</p>
                      <p className="text-base font-black text-orange-600">{order.totalPrice?.toLocaleString()}đ</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* GIỎ HÀNG NỔI (Chỉ hiện ở Tab Menu) */}
      {cart.length > 0 && activeTab === 'menu' && (
        <div
          onClick={() => setShowCart(true)}
          className="fixed bottom-24 left-4 right-4 bg-gray-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-2xl z-30 animate-in slide-in-from-bottom duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl"><ShoppingCart size={20} /></div>
            <div>
              <p className="text-[10px] opacity-60 font-bold uppercase">Bàn {selectedTable}</p>
              <p className="font-bold">{cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}đ</p>
            </div>
          </div>
          <span className="text-sm font-bold text-orange-400">Xem đơn ({cart.length})</span>
        </div>
      )}

      {/* Drawer Giỏ hàng (ShowCart) - Giữ nguyên logic cũ nhưng cập nhật style đồng nhất */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative bg-white rounded-t-[40px] max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center pt-4 pb-2" onClick={() => setShowCart(false)}>
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-800">Chi tiết đơn hàng</h2>
              <button onClick={() => setShowCart(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-orange-600 text-sm font-bold">{item.price.toLocaleString()}đ</p>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400"><Minus size={14} /></button>
                    <span className="font-black w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-orange-600"><Plus size={14} /></button>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-dashed space-y-3">
                <p className="font-bold text-gray-700">Thanh toán bằng:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setPaymentMethod('cash'); setShowQR(false) }} className={`py-3 rounded-2xl border-2 font-bold transition-all ${paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 text-gray-400'}`}>💵 Tiền mặt</button>
                  <button onClick={() => { setPaymentMethod('transfer'); setShowQR(true) }} className={`py-3 rounded-2xl border-2 font-bold transition-all ${paymentMethod === 'transfer' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 text-gray-400'}`}>🏦 Chuyển khoản</button>
                </div>
              </div>

              {/* HIỂN THỊ QR NẾU CHỌN CHUYỂN KHOẢN */}
              {showQR && (
                <div className="mt-4 p-4 bg-orange-50 rounded-3xl border-2 border-dashed border-orange-200 flex flex-col items-center animate-in zoom-in duration-300">
                  <p className="text-[10px] font-bold text-orange-400 mb-2 uppercase flex items-center gap-1">
                    <Plus size={10} /> Chạm vào mã để phóng to
                  </p>

                  <div
                    className="relative cursor-pointer active:scale-95 transition-transform"
                    onClick={() => setIsQRExpanded(true)}
                  >
                    <img
                      src={`https://img.vietqr.io/image/VCB-1021950952-compact2.jpg?amount=${cart.reduce((s, i) => s + (i.price * i.quantity), 0)}&addInfo=Ban%20${selectedTable}`}
                      alt="QR Payment"
                      className="w-40 h-40 object-contain rounded-xl shadow-md bg-white p-2"
                    />
                    {/* Icon gợi ý phóng to ở góc ảnh */}
                    <div className="absolute bottom-2 right-2 bg-orange-500 text-white p-1 rounded-md shadow-lg">
                      <LayoutDashboard size={14} />
                    </div>
                  </div>

                  <p className="mt-2 text-[10px] text-center text-gray-500 leading-tight">
                    Ngân hàng: <b className="text-gray-900">Vietcombank</b> <br />
                    STK: <b className="text-gray-900">0123456789</b>
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t space-y-4">
              <div className="flex justify-between items-end">
                <span className="font-bold text-gray-400">TỔNG CỘNG</span>
                <span className="text-3xl font-black text-orange-600 tracking-tighter">
                  {cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}đ
                </span>
              </div>
              <button
                disabled={isProcessing}
                onClick={handleCheckout}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-200 disabled:bg-gray-200"
              >
                {isProcessing ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐẶT MÓN'}
              </button>
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}
      {/* MODAL PHÓNG TO QR TOÀN MÀN HÌNH */}
      {isQRExpanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          {/* Backdrop tối đậm hơn để làm nổi bật QR */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setIsQRExpanded(false)}
          />

          <div className="relative bg-white p-4 rounded-[40px] w-full max-w-sm animate-in zoom-in duration-300 flex flex-col items-center">
            {/* Nút đóng nhanh */}
            <button
              onClick={() => setIsQRExpanded(false)}
              className="absolute -top-14 right-0 bg-white/20 text-white p-3 rounded-full backdrop-blur-md"
            >
              <X size={24} />
            </button>

            <div className="w-full text-center mb-4 pt-2">
              <h3 className="font-black text-xl text-gray-900">Quét mã thanh toán</h3>
              <p className="text-orange-600 font-bold text-lg">
                {cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}đ
              </p>
            </div>

            {/* QR Lớn */}
            <img
              src={`https://img.vietqr.io/image/VCB-1021950952-compact2.jpg?amount=${cart.reduce((s, i) => s + (i.price * i.quantity), 0)}&addInfo=Ban%20${selectedTable}`}
              alt="QR Expanded"
              className="w-full aspect-square object-contain rounded-2xl mb-4"
            />

            <div className="w-full bg-gray-50 p-4 rounded-3xl text-center mb-2">
              <p className="text-sm text-gray-500 font-medium">Nội dung chuyển khoản:</p>
              <p className="text-lg font-black text-gray-900">BAN {selectedTable}</p>
            </div>

            <button
              onClick={() => setIsQRExpanded(false)}
              className="w-full py-4 text-gray-400 font-bold text-sm"
            >
              Đóng mã QR
            </button>
          </div>
        </div>
      )}
      {/* Bottom Nav */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t flex justify-around p-3 z-40">
        <button onClick={() => setActiveTab('tables')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tables' ? 'text-orange-500 scale-110' : 'text-gray-300'}`}>
          <LayoutDashboard size={24} /><span className="text-[9px] font-black uppercase">Bàn</span>
        </button>
        <button onClick={() => setActiveTab('menu')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'menu' ? 'text-orange-500 scale-110' : 'text-gray-300'}`}>
          <Coffee size={24} /><span className="text-[9px] font-black uppercase">Menu</span>
        </button>
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'orders' ? 'text-orange-500 scale-110' : 'text-gray-300'}`}>
          <ClipboardList size={24} /><span className="text-[9px] font-black uppercase">Đơn hàng</span>
        </button>
      </footer>
    </div>
  );
}