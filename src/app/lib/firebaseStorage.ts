import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Compress an image file to a JPEG blob, capped at maxSize on the longest edge.
 * Keeps receipt photos small (~50-150KB) for fast upload + cheap storage.
 */
export async function compressImage(
  file: File | Blob,
  maxSize = 1280,
  quality = 0.7
): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width > height && width > maxSize) {
    height = Math.round((height * maxSize) / width);
    width = maxSize;
  } else if (height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file instanceof Blob ? file : new Blob([file]);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? (file as Blob)),
      'image/jpeg',
      quality
    );
  });
}

/**
 * Compress + upload a transfer receipt photo. Returns the public download URL.
 */
export async function uploadReceiptImage(file: File | Blob): Promise<string> {
  const compressed = await compressImage(file);
  const name = `receipts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const storageRef = ref(storage, name);
  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
