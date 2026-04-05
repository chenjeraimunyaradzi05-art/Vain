import type { ImageLoaderProps } from 'next/image';

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const baseUrl =
  process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL ||
  (cloudName ? `https://res.cloudinary.com/${cloudName}/image/upload` : undefined);

export function isCloudinaryUrl(src: string): boolean {
  return src.includes('res.cloudinary.com') && src.includes('/image/upload/');
}

export function isCloudinaryPublicId(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('http://') || src.startsWith('https://')) return false;
  if (src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) return false;
  return true;
}

export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ? `q_${Math.min(Math.max(quality, 1), 100)}` : 'q_auto';
  const params = `f_auto,${q},w_${width}`;

  // If a full Cloudinary URL is provided, inject params after /image/upload/
  if (isCloudinaryUrl(src)) {
    const [prefix, rest] = src.split('/image/upload/');
    return `${prefix}/image/upload/${params}/${rest}`;
  }

  // If only a public ID is provided, build the URL from baseUrl
  if (baseUrl) {
    const normalizedSrc = src.replace(/^\/+/, '');
    return `${baseUrl}/${params}/${normalizedSrc}`;
  }

  // Fallback: return the original source
  return src;
}

export function toCloudinaryAutoUrl(src: string, quality?: number): string {
  if (!src) return src;
  const q = quality ? `q_${Math.min(Math.max(quality, 1), 100)}` : 'q_auto';
  const params = `f_auto,${q}`;

  if (isCloudinaryUrl(src)) {
    const [prefix, rest] = src.split('/image/upload/');
    if (!rest) return src;
    return `${prefix}/image/upload/${params}/${rest}`;
  }

  if (isCloudinaryPublicId(src) && baseUrl) {
    const normalizedSrc = src.replace(/^\/+/, '');
    return `${baseUrl}/${params}/${normalizedSrc}`;
  }

  return src;
}
