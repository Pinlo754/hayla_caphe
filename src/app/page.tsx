'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';

import { usePosStore } from '@/store/usePosStore';
import { menuItems as staticMenu } from '@/data/menuItems';
import { printer } from '@/lib/bluetoothPrinter';
import { getOrders, createOrder, updateOrder } from '@/app/lib/firebaseOrders';
import { getMenuItems } from '@/app/lib/firebaseMenu';
import { getToppings } from '@/app/lib/firebaseToppings';
import type { ToppingItem } from '@/app/lib/firebaseToppings';
import { addPoints } from '@/app/lib/firebaseCustomers';
import { uploadReceiptImage } from '@/app/lib/firebaseStorage';

import PosHeader from '@/components/pos/PosHeader';
import BottomNav from '@/components/pos/BottomNav';
import TableGrid from '@/components/pos/TableGrid';
import MenuTab from '@/components/pos/MenuTab';
import OrdersTab from '@/components/pos/OrdersTab';
import DashboardTab from '@/components/pos/DashboardTab';
import CartDrawer from '@/components/pos/CartDrawer';
import OrderDetailModal from '@/components/pos/OrderDetailModal';

import type { ActiveTab, Customer, DiscountType, MenuItem, Order, PaymentMethod, ReceiptData } from '@/types/pos.types';

// Trigger a local download of the captured transfer receipt
function downloadReceiptLocally(file: File, tableId: number) {
  try {
    const url = URL.createObjectURL(file);
    const ext = file.name?.split('.').pop()?.toLowerCase() || 'jpg';
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `bienlai-ban${tableId}-${stamp}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.warn('Không thể lưu ảnh biên lai về máy:', e);
  }
}

export default function MobilePOS() {
  const { cart, selectedTable, selectTable, clearCart, setCart } = usePosStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('tables');
  const [showCart, setShowCart] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [toppingsData, setToppingsData] = useState<ToppingItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');

  // Load menu + toppings from Firestore (fallback to static)
  useEffect(() => {
    getMenuItems()
      .then(setMenuData)
      .catch(() => {
        const fallback = [...staticMenu].sort(
          (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        );
        setMenuData(fallback);
      });
    getToppings().then(setToppingsData).catch(() => {});
  }, []);

  const printerCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    printerCheckRef.current = setInterval(() => {
      const connected = printer.isConnected();
      setPrinterConnected(connected);
      if (connected) setPrinterName(printer.getDeviceName());
    }, 1000);
    return () => {
      if (printerCheckRef.current) clearInterval(printerCheckRef.current);
    };
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountType === 'percent'
    ? subtotal * (discountValue / 100)
    : Number(discountValue);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (e) {
      console.error('Lỗi tải đơn hàng:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'tables' || activeTab === 'dashboard') {
      fetchOrders();
    }
  }, [activeTab]);

  const printReceipt = async (receiptData: ReceiptData) => {
    if (!printer.isConnected()) return;
    try {
      await printer.print(receiptData);
    } catch (e) {
      console.warn('Lỗi in hóa đơn:', e);
      alert('⚠️ Thanh toán thành công nhưng không thể in hóa đơn. Kiểm tra kết nối máy in.');
    }
  };

  const handleConnectPrinter = async () => {
    if (!printer.isSupported()) {
      alert('Trình duyệt không hỗ trợ Bluetooth. Hãy dùng Chrome trên Android.');
      return;
    }
    try {
      await printer.connect();
      setPrinterConnected(true);
      setPrinterName(printer.getDeviceName());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      if (!msg.includes('cancelled')) alert('Lỗi kết nối: ' + msg);
    }
  };

  const handleDisconnectPrinter = async () => {
    await printer.disconnect();
    setPrinterConnected(false);
    setPrinterName('');
  };

  const handleAddMore = (order: Order) => {
    setEditingOrderId(order.id);
    selectTable(order.tableId);
    setCart(order.items);
    setActiveTab('menu');
  };

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order);
    setShowOrderModal(true);
  };

  const handleCheckout = async () => {
    if (!selectedTable || cart.length === 0) return;
    if (paymentMethod === 'transfer' && !receiptFile) {
      alert('Vui lòng chụp ảnh biên lai chuyển khoản.');
      return;
    }
    setIsProcessing(true);

    try {
      // Upload transfer receipt first (fail fast before writing the order)
      let receiptImage: string | undefined;
      if (paymentMethod === 'transfer' && receiptFile) {
        receiptImage = await uploadReceiptImage(receiptFile);
      }

      const orderData = {
        tableId: selectedTable,
        items: cart,
        totalPrice: finalTotal,
        discount: discountValue > 0 ? { type: discountType, value: discountValue, amount: discountAmount } : null,
        status: 'Complete' as const,
        paymentMethod,
        ...(receiptImage ? { receiptImage } : {}),
      };

      if (editingOrderId) {
        await updateOrder(editingOrderId, orderData);
      } else {
        await createOrder({ ...orderData, createdAt: new Date().toISOString() });
      }

      // Order saved — save the receipt photo to the local device too
      if (receiptFile) downloadReceiptLocally(receiptFile, selectedTable);

      await printReceipt({
        tableId: selectedTable,
        items: cart,
        subtotal,
        discountType: discountValue > 0 ? discountType : undefined,
        discountValue: discountValue > 0 ? discountValue : undefined,
        discountAmount: discountValue > 0 ? discountAmount : undefined,
        total: finalTotal,
        paymentMethod,
        createdAt: new Date(),
      });

      // Award loyalty points
      if (selectedCustomer) {
        const pts = Math.floor(finalTotal / 1000);
        if (pts > 0) await addPoints(selectedCustomer.id, pts).catch(() => {});
        setSelectedCustomer(null);
      }

      clearCart();
      setEditingOrderId(null);
      setDiscountValue(0);
      setDiscountType('percent');
      setPaymentMethod('cash');
      setReceiptFile(null);
      setShowCart(false);
      setActiveTab('orders');
      fetchOrders();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      alert('Lỗi: ' + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    if (paymentMethod === 'transfer' && !receiptFile) {
      alert('Vui lòng chụp ảnh biên lai chuyển khoản.');
      return;
    }
    setIsProcessing(true);
    try {
      let receiptImage: string | undefined;
      if (paymentMethod === 'transfer' && receiptFile) {
        receiptImage = await uploadReceiptImage(receiptFile);
      }

      await updateOrder(orderId, {
        status: 'completed',
        paymentMethod,
        ...(receiptImage ? { receiptImage } : {}),
      });

      // Order paid — save the receipt photo to the local device too
      if (receiptFile && viewingOrder) downloadReceiptLocally(receiptFile, viewingOrder.tableId);

      if (viewingOrder) {
        const orderSubtotal = viewingOrder.items.reduce((s, i) => s + i.price * i.quantity, 0);
        await printReceipt({
          tableId: viewingOrder.tableId,
          items: viewingOrder.items,
          subtotal: orderSubtotal,
          discountType: viewingOrder.discount?.type,
          discountValue: viewingOrder.discount?.value,
          discountAmount: viewingOrder.discount?.amount,
          total: viewingOrder.totalPrice,
          paymentMethod,
          createdAt: new Date(),
        });
      }

      setShowOrderModal(false);
      setViewingOrder(null);
      setReceiptFile(null);
      fetchOrders();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      alert('Lỗi thanh toán: ' + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-20">
      <PosHeader
        activeTab={activeTab}
        printerConnected={printerConnected}
        printerName={printerName}
        onConnectPrinter={handleConnectPrinter}
        onDisconnectPrinter={handleDisconnectPrinter}
      />

      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'tables' && (
          <TableGrid
            orders={orders}
            onSelectTable={(t) => { selectTable(t); setActiveTab('menu'); }}
            onViewOrder={handleViewOrder}
            onAddMore={handleAddMore}
          />
        )}

        {activeTab === 'menu' && <MenuTab products={menuData} toppings={toppingsData} />}

        {activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            isLoading={isLoadingOrders}
            onRefresh={fetchOrders}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            orders={orders}
            isLoading={isLoadingOrders}
            onRefresh={fetchOrders}
          />
        )}
      </main>

      {cart.length > 0 && activeTab === 'menu' && (
        <div
          onClick={() => setShowCart(true)}
          className="fixed bottom-24 left-4 right-4 bg-gray-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-2xl z-30 cursor-pointer animate-in slide-in-from-bottom duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl">
              <ShoppingCart size={20} />
            </div>
            <div>
              <p className="text-[10px] opacity-60 font-bold uppercase">Bàn {selectedTable}</p>
              <p className="font-bold">{subtotal.toLocaleString()}đ</p>
            </div>
          </div>
          <span className="text-sm font-bold text-orange-400">Xem đơn ({cart.length})</span>
        </div>
      )}

      {showCart && (
        <CartDrawer
          discountType={discountType}
          discountValue={discountValue}
          paymentMethod={paymentMethod}
          isProcessing={isProcessing}
          selectedCustomer={selectedCustomer}
          onCustomerChange={setSelectedCustomer}
          receiptFile={receiptFile}
          onReceiptChange={setReceiptFile}
          onDiscountTypeChange={setDiscountType}
          onDiscountValueChange={setDiscountValue}
          onPaymentMethodChange={setPaymentMethod}
          onCheckout={handleCheckout}
          onClose={() => { setShowCart(false); setReceiptFile(null); }}
        />
      )}

      {showOrderModal && viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          paymentMethod={paymentMethod}
          isProcessing={isProcessing}
          receiptFile={receiptFile}
          onReceiptChange={setReceiptFile}
          onPaymentMethodChange={setPaymentMethod}
          onConfirmPayment={handleConfirmPayment}
          onClose={() => { setShowOrderModal(false); setViewingOrder(null); setReceiptFile(null); }}
        />
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
