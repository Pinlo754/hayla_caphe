import type { Task, TaskPriority } from '@/types/pos.types';

export type SeedTask = Omit<Task, 'id' | 'createdAt' | 'order'>;

// ── Helpers ─────────────────────────────────────────────────────────

/** Quán chia 3 ca: 6h–14h (sáng) / 14h–22h (chiều) / 22h–6h (đêm) */
const SHIFTS = [
  { label: 'Ca sáng',  start: '06:05', end: '13:50' },
  { label: 'Ca chiều', start: '14:05', end: '21:50' },
  { label: 'Ca đêm',   start: '22:05', end: '05:50' },
];

function daily(
  title: string,
  scheduledTime: string,
  opts: Partial<SeedTask> = {}
): SeedTask {
  return {
    title,
    description: '',
    priority: 'medium',
    group: 'hourly',
    scheduledTime,
    recurrence: 'daily',
    days: [],
    requirePhoto: false,
    active: true,
    ...opts,
  };
}

/** One task repeated at the start (or end) of every shift — for "việc lặp mỗi ca" */
function everyShift(
  title: string,
  when: 'start' | 'end',
  opts: Partial<SeedTask> = {}
): SeedTask[] {
  return SHIFTS.map(({ label, start, end }) => ({
    title: `${title} (${label})`,
    description: '',
    priority: 'medium' as TaskPriority,
    group: 'shift' as const,
    scheduledTime: when === 'start' ? start : end,
    recurrence: 'daily' as const,
    days: [],
    requirePhoto: false,
    active: true,
    ...opts,
  }));
}

/** A fixed-hour task repeated every N hours across the day (e.g. "mỗi 2 giờ") */
function everyNHours(
  title: string,
  startHour: number,
  endHour: number,
  stepHours: number,
  opts: Partial<SeedTask> = {}
): SeedTask[] {
  const out: SeedTask[] = [];
  for (let h = startHour; h <= endHour; h += stepHours) {
    const hour = ((h % 24) + 24) % 24;
    out.push(daily(title, `${String(hour).padStart(2, '0')}:15`, opts));
  }
  return out;
}

// ── Đầu ca / cuối ca — mọi ca, bất kể ai vào ca ─────────────────────

const SHIFT_TASKS: SeedTask[] = [
  ...everyShift('Đọc sổ bàn giao ca trước', 'start', {
    description: 'Sự cố, đồ khách quên, món hết, khách đặt trước.',
  }),
  ...everyShift('Đếm & ký quỹ tiền lẻ đầu ca', 'start', {
    priority: 'high',
    description: 'Đếm tiền quỹ lẻ, ký xác nhận với ca trước.',
  }),
  ...everyShift('Kiểm tra thiết bị đầu ca', 'start', {
    priority: 'high',
    description: 'Máy pha đủ áp, máy xay, tủ mát đủ lạnh, lò, wifi/router, máy in bill, máy quẹt thẻ/QR.',
  }),
  ...everyShift('Đổ trà ủ / nước cốt cũ, pha mẻ mới', 'start', {
    priority: 'high',
  }),
  ...everyShift('Vệ sinh quầy pha chế + chụp ảnh', 'end', {
    requirePhoto: true,
    description: 'Vệ sinh toàn bộ quầy, chụp ảnh nhiều khu vực.',
  }),
  ...everyShift('Chốt doanh thu cuối ca', 'end', {
    priority: 'high',
    description: 'Đối chiếu tiền mặt + chuyển khoản với máy/phần mềm. Không để nhiều tiền mặt ở quầy qua đêm.',
  }),
  ...everyShift('Ghi sổ bàn giao ca', 'end', {
    description: 'Món hết, thiết bị hỏng, sự cố khách, món pha sai/hỏng để ca sau nắm.',
  }),
];

// ── Theo giờ cố định trong ngày ──────────────────────────────────────

const HOURLY_TASKS: SeedTask[] = [
  daily('Thay nhang + cúng cà phê ông Địa', '06:15', { priority: 'low' }),
  daily('Kiểm nguyên liệu ca sáng, báo NL sắp hết', '06:30', { priority: 'high', requirePhoto: true }),
  daily('Chỉnh cữ xay (dial-in) cà phê', '06:45', {
    description: 'Thời tiết đổi là vị đổi — nếm thử & chỉnh lại cữ xay.',
  }),
  daily('Vệ sinh mặt tiền quán', '07:00', {
    description: 'Lau kính, cửa, bảng hiệu, quét sân/bãi xe.',
    requirePhoto: true,
  }),
  daily('Kiểm tra & reset wifi/router buổi sáng', '07:30'),
  daily('Tưới cây', '12:00'),
  daily('Lau sàn khu khách', '11:00', {
    description: 'Làm trước giờ trưa đông khách.',
    requirePhoto: true,
  }),
  ...everyNHours('Kiểm tra NVS + châm nước lọc + gom ly, lau bàn trống', 8, 4 + 24, 2, {
    priority: 'high',
    description: 'Giấy, xà phòng, mùi, sàn nhà vệ sinh — quan trọng nhất với khách ngồi lâu.',
  }),
  daily('Kiểm nguyên liệu ca chiều', '14:30', {
    priority: 'high',
    requirePhoto: true,
    description: 'Kiểm tra + chuẩn bị nguyên liệu, kiểm hạn dùng sữa/syrup/topping.',
  }),
  daily('Kiểm tra nhãn ngày mở & hạn dùng', '15:00', {
    description: 'Sữa, syrup, topping, trà ủ — quán 24h rất dễ lẫn hạn.',
    requirePhoto: true,
  }),
  daily('Đăng bài/story fanpage + trả tin nhắn khách', '15:30', { priority: 'low' }),
  daily('Tưới cây', '17:00'),
  daily('Kiểm tra điện & wifi giờ cao điểm', '17:00', {
    description: 'Bật đèn ngoài, kiểm tra ổ cắm & wifi trước giờ cao điểm tối.',
  }),
  daily('Chuẩn bị đủ đá, sữa, trà cho giờ cao điểm tối', '18:30', {
    priority: 'high',
    description: 'Khung 19h–23h thường đông khách nhất.',
  }),
  daily('Kiểm nguyên liệu ca đêm + chốt món hết', '22:30', {
    priority: 'high',
    requirePhoto: true,
    description: 'Chốt danh sách món hết để sáng đặt hàng.',
  }),
  daily('Vệ sinh lò nướng bánh mì', '23:00', { requirePhoto: true }),
  daily('Kiểm tra an ninh ban đêm', '00:00', {
    priority: 'high',
    description: 'Cửa phụ, camera, đèn bãi xe, vé giữ xe, khách say/ngủ quên.',
  }),
  daily('Tưới cây', '02:00'),
  daily('Lau sàn tổng thể & kê lại bàn ghế', '02:00', {
    description: 'Giờ vắng nhất trong ngày, làm kỹ được.',
    requirePhoto: true,
  }),
  daily('Rửa dụng cụ tồn, sắp kho, dán nhãn ngày mở hàng mới', '03:30'),
  daily('Setup lại quán, chuẩn bị bàn giao ca sáng', '05:30', { priority: 'high', requirePhoto: true }),
];

// ── Định kỳ theo ngày / tuần / tháng ──────────────────────────────────

const PERIODIC_TASKS: SeedTask[] = [
  daily('Vệ sinh vòi đánh sữa & máy xay sinh tố', '21:00', {
    group: 'periodic',
    description: 'Vệ sinh sau mỗi lần dùng — đây là lượt kiểm tra/nhắc cuối ngày.',
  }),
  daily('Backflush máy pha + vệ sinh cối xay, khay hứng, lưới lọc', '21:30', {
    group: 'periodic',
    priority: 'high',
    requirePhoto: true,
  }),
  {
    title: 'Vệ sinh máy pha bằng thuốc chuyên dụng',
    description: 'Descale định kỳ, thực hiện ở ca đêm khi quán vắng khách.',
    priority: 'high',
    group: 'periodic',
    scheduledTime: '23:30',
    recurrence: 'interval',
    days: [],
    intervalDays: 2,
    requirePhoto: true,
    active: true,
  },
  {
    title: 'Vệ sinh máy làm đá',
    description: '',
    priority: 'medium',
    group: 'periodic',
    scheduledTime: '21:00',
    recurrence: 'weekly',
    days: ['mon'],
    requirePhoto: true,
    active: true,
  },
  {
    title: 'Vệ sinh tủ lạnh / tủ mát (lau kệ, kiểm nhiệt độ)',
    description: '',
    priority: 'medium',
    group: 'periodic',
    scheduledTime: '21:15',
    recurrence: 'weekly',
    days: ['mon'],
    requirePhoto: true,
    active: true,
  },
  {
    title: 'Vệ sinh lưới lọc máy lạnh / quạt',
    description: '',
    priority: 'low',
    group: 'periodic',
    scheduledTime: '21:00',
    recurrence: 'weekly',
    days: ['thu'],
    requirePhoto: true,
    active: true,
  },
  {
    title: 'Vệ sinh hố ga – cống thoát',
    description: '',
    priority: 'medium',
    group: 'periodic',
    scheduledTime: '21:15',
    recurrence: 'weekly',
    days: ['thu'],
    requirePhoto: true,
    active: true,
  },
  {
    title: 'Kiểm kê tồn kho tổng',
    description: '',
    priority: 'high',
    group: 'periodic',
    scheduledTime: '20:00',
    recurrence: 'weekly',
    days: ['sun'],
    requirePhoto: false,
    active: true,
  },
  {
    title: 'Đặt hàng nhà cung cấp theo lịch cố định',
    description: 'Đặt theo lịch cố định (T2 & T5) thay vì đợi thiếu mới gọi.',
    priority: 'high',
    group: 'periodic',
    scheduledTime: '10:00',
    recurrence: 'weekly',
    days: ['mon', 'thu'],
    requirePhoto: false,
    active: true,
  },
  {
    title: 'Kiểm tra bình chữa cháy',
    description: '',
    priority: 'medium',
    group: 'periodic',
    scheduledTime: '20:00',
    recurrence: 'monthly',
    days: [],
    dayOfMonth: 1,
    requirePhoto: true,
    active: true,
  },
  {
    title: 'Kiểm tra dây điện / ổ cắm',
    description: '',
    priority: 'medium',
    group: 'periodic',
    scheduledTime: '20:15',
    recurrence: 'monthly',
    days: [],
    dayOfMonth: 1,
    requirePhoto: true,
    active: true,
  },
  {
    title: 'Kiểm tra bàn ghế lung lay, sửa chữa',
    description: '',
    priority: 'low',
    group: 'periodic',
    scheduledTime: '20:30',
    recurrence: 'monthly',
    days: [],
    dayOfMonth: 1,
    requirePhoto: false,
    active: true,
  },
  {
    title: 'Thay nước bình lọc',
    description: '',
    priority: 'medium',
    group: 'periodic',
    scheduledTime: '20:45',
    recurrence: 'monthly',
    days: [],
    dayOfMonth: 1,
    requirePhoto: false,
    active: true,
  },
  {
    title: 'Tổng vệ sinh kho',
    description: '',
    priority: 'medium',
    group: 'periodic',
    scheduledTime: '21:00',
    recurrence: 'monthly',
    days: [],
    dayOfMonth: 1,
    requirePhoto: true,
    active: true,
  },
];

export const DEFAULT_TASKS: SeedTask[] = [
  ...SHIFT_TASKS,
  ...HOURLY_TASKS,
  ...PERIODIC_TASKS,
];
