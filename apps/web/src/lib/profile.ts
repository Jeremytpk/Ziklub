import { DEFAULT_LOOK, randomLook, sanitizeLook, type ZuLook } from '@ziklub/zu';

export interface Profile {
  name: string;
  look: ZuLook;
}

const KEY = 'ziklub.profile';

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.name !== 'string' || !p.name.trim()) return null;
    return { name: p.name.slice(0, 20), look: sanitizeLook(p.look) };
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private mode: the profile simply isn't remembered.
  }
}

export function newProfile(): Profile {
  return { name: '', look: { ...DEFAULT_LOOK, ...randomLook(), hat: 'none' } };
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, 20);
}
