import { Magic } from 'magic-sdk';

const createMagic = () => {
  if (typeof window !== 'undefined') {
    const key = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY || '';
    if (key) {
      return new Magic(key);
    }
  }
  return null;
};

export const magic = createMagic();
