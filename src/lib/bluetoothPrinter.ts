import { ReceiptData } from '@/types/pos.types';

// Minimal Web Bluetooth API type declarations (not in standard TS DOM lib)
declare global {
  interface BluetoothDevice {
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: string, listener: () => void): void;
  }
  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  }
  interface BluetoothRemoteGATTService {
    getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  interface BluetoothRemoteGATTCharacteristic {
    properties: { write: boolean; writeWithoutResponse: boolean };
    writeValue(value: BufferSource): Promise<void>;
    writeValueWithoutResponse(value: BufferSource): Promise<void>;
  }
}

// Common BLE thermal printer service/characteristic UUIDs
const SERVICE_UUIDS = [
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

const CHAR_WRITE_UUIDS = [
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
];

// ESC/POS command bytes
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  FEED_3: [ESC, 0x64, 0x03],
  CUT: [GS, 0x56, 0x01],
};

const RECEIPT_WIDTH = 32;

function toASCII(str: string): string {
  const map: Record<string, string> = {
    à:'a',á:'a',ả:'a',ã:'a',ạ:'a',ă:'a',ắ:'a',ặ:'a',ằ:'a',ẳ:'a',ẵ:'a',
    â:'a',ấ:'a',ầ:'a',ẩ:'a',ẫ:'a',ậ:'a',
    è:'e',é:'e',ẻ:'e',ẽ:'e',ẹ:'e',ê:'e',ế:'e',ề:'e',ể:'e',ễ:'e',ệ:'e',
    ì:'i',í:'i',ỉ:'i',ĩ:'i',ị:'i',
    ò:'o',ó:'o',ỏ:'o',õ:'o',ọ:'o',ô:'o',ố:'o',ồ:'o',ổ:'o',ỗ:'o',ộ:'o',
    ơ:'o',ớ:'o',ờ:'o',ở:'o',ỡ:'o',ợ:'o',
    ù:'u',ú:'u',ủ:'u',ũ:'u',ụ:'u',ư:'u',ứ:'u',ừ:'u',ử:'u',ữ:'u',ự:'u',
    ỳ:'y',ý:'y',ỷ:'y',ỹ:'y',ỵ:'y',đ:'d',
    À:'A',Á:'A',Ả:'A',Ã:'A',Ạ:'A',Ă:'A',Ắ:'A',Ặ:'A',Ằ:'A',Ẳ:'A',Ẵ:'A',
    Â:'A',Ấ:'A',Ầ:'A',Ẩ:'A',Ẫ:'A',Ậ:'A',
    È:'E',É:'E',Ẻ:'E',Ẽ:'E',Ẹ:'E',Ê:'E',Ế:'E',Ề:'E',Ể:'E',Ễ:'E',Ệ:'E',
    Ì:'I',Í:'I',Ỉ:'I',Ĩ:'I',Ị:'I',
    Ò:'O',Ó:'O',Ỏ:'O',Õ:'O',Ọ:'O',Ô:'O',Ố:'O',Ồ:'O',Ổ:'O',Ỗ:'O',Ộ:'O',
    Ơ:'O',Ớ:'O',Ờ:'O',Ở:'O',Ỡ:'O',Ợ:'O',
    Ù:'U',Ú:'U',Ủ:'U',Ũ:'U',Ụ:'U',Ư:'U',Ứ:'U',Ừ:'U',Ử:'U',Ữ:'U',Ự:'U',
    Ỳ:'Y',Ý:'Y',Ỷ:'Y',Ỹ:'Y',Ỵ:'Y',Đ:'D',
  };
  return str.split('').map(c => map[c] ?? c).join('');
}

function padLine(left: string, right: string, w = RECEIPT_WIDTH): string {
  const spaces = w - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

function centerText(text: string, w = RECEIPT_WIDTH): string {
  const spaces = Math.max(0, Math.floor((w - text.length) / 2));
  return ' '.repeat(spaces) + text;
}

function buildReceipt(data: ReceiptData): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const push = (bytes: number[]) => chunks.push(new Uint8Array(bytes));
  const text = (str: string) => chunks.push(enc.encode(toASCII(str)));
  const line = (str: string) => text(str + '\n');

  const divider = '='.repeat(RECEIPT_WIDTH);
  const dashed = '-'.repeat(RECEIPT_WIDTH);

  const now = data.createdAt;
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear().toString().slice(-2)}`;
  const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  push(CMD.INIT);
  push(CMD.ALIGN_CENTER);
  push(CMD.BOLD_ON);
  push(CMD.DOUBLE_HEIGHT);
  line('HAY LA CA PHE');
  push(CMD.NORMAL_SIZE);
  push(CMD.BOLD_OFF);
  line(divider);

  push(CMD.ALIGN_LEFT);
  line(padLine(`Ban: ${data.tableId}`, `${dateStr} ${timeStr}`));
  line(dashed);

  for (const item of data.items) {
    const name = toASCII(item.name);
    const priceStr = `${(item.price * item.quantity).toLocaleString()}d`;
    const itemLine = `${item.quantity}x ${name}`;
    line(padLine(itemLine.length + priceStr.length < RECEIPT_WIDTH ? itemLine : itemLine.slice(0, RECEIPT_WIDTH - priceStr.length - 1), priceStr));
    if (item.note) {
      line(`   >> ${toASCII(item.note)}`);
    }
  }

  line(dashed);

  if (data.discountAmount && data.discountAmount > 0) {
    line(padLine('Tam tinh:', `${data.subtotal.toLocaleString()}d`));
    const discLabel = data.discountType === 'percent'
      ? `Giam gia (${data.discountValue}%):`
      : 'Giam gia:';
    line(padLine(discLabel, `-${data.discountAmount.toLocaleString()}d`));
  }

  push(CMD.BOLD_ON);
  line(padLine('TONG CONG:', `${data.total.toLocaleString()}d`));
  push(CMD.BOLD_OFF);
  line(padLine('Thanh toan:', data.paymentMethod === 'cash' ? 'Tien mat' : 'Chuyen khoan'));
  line(divider);

  push(CMD.ALIGN_CENTER);
  line(centerText('Cam on quy khach!'));
  push(CMD.FEED_3);
  push(CMD.CUT);

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

class BluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  isConnected(): boolean {
    return this.device?.gatt?.connected === true && this.characteristic !== null;
  }

  getDeviceName(): string {
    return this.device?.name ?? 'Máy in';
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Trình duyệt không hỗ trợ Bluetooth. Hãy dùng Chrome trên Android.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICE_UUIDS,
    });

    if (!this.device!.gatt) throw new Error('Không thể kết nối GATT');
    const server = await this.device!.gatt.connect();
    this.characteristic = await this.findWriteCharacteristic(server);

    this.device!.addEventListener('gattserverdisconnected', () => {
      this.characteristic = null;
    });
  }

  private async findWriteCharacteristic(
    server: BluetoothRemoteGATTServer
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    for (const svcUUID of SERVICE_UUIDS) {
      try {
        const service = await server.getPrimaryService(svcUUID);
        for (const charUUID of CHAR_WRITE_UUIDS) {
          try {
            const char = await service.getCharacteristic(charUUID);
            if (char.properties.write || char.properties.writeWithoutResponse) {
              return char;
            }
          } catch { /* try next */ }
        }
      } catch { /* try next service */ }
    }
    throw new Error('Không tìm thấy cổng ghi. Kiểm tra lại loại máy in.');
  }

  async disconnect(): Promise<void> {
    this.device?.gatt?.disconnect();
    this.device = null;
    this.characteristic = null;
  }

  async print(data: ReceiptData): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Chưa kết nối máy in');
    }
    const bytes = buildReceipt(data);
    await this.writeBytes(bytes);
  }

  private async writeBytes(data: Uint8Array): Promise<void> {
    const CHUNK = 20;
    for (let i = 0; i < data.length; i += CHUNK) {
      const chunk = data.slice(i, Math.min(i + CHUNK, data.length));
      try {
        await this.characteristic!.writeValueWithoutResponse(chunk);
      } catch {
        await this.characteristic!.writeValue(chunk);
      }
      await delay(20);
    }
  }
}

export const printer = new BluetoothPrinter();
