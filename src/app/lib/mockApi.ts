// app/lib/mockApi.ts

const TABLES_KEY = 'mock_active_tables';
const ORDERS_KEY = 'mock_orders_history';

export const mockApi = {
  // Lấy trạng thái tất cả các bàn
  getActiveTables: () => {
    const data = localStorage.getItem(TABLES_KEY);
    return data ? JSON.parse(data) : {};
  },

  // Lưu món vào bàn (Gửi bếp/Thanh toán sau)
  saveOrderToTable: (tableId: number, items: any[], totalPrice: number) => {
    const tables = mockApi.getActiveTables();
    tables[tableId] = {
      items,
      totalPrice,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
    return tables;
  },

  // Thanh toán: Lưu vào lịch sử và xóa bàn
  completePayment: (tableId: number, orderData: any) => {
    // 1. Lưu vào lịch sử đơn hàng
    const history = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    history.push({ ...orderData, id: Date.now(), createdAt: new Date().toISOString() });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(history));

    // 2. Xóa bàn khỏi danh sách hoạt động
    const tables = mockApi.getActiveTables();
    delete tables[tableId];
    localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
    return tables;
  }
};