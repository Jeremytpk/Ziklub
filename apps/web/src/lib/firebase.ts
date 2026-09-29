import { createZiklubApi } from '@ziklub/core';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { useEffect, useState } from 'react';

const env = import.meta.env;
export const useEmulators = env.VITE_USE_EMULATORS === 'true';

const config = useEmulators
  ? {
      apiKey: 'demo-key',
      authDomain: 'demo-ziklub.firebaseapp.com',
      projectId: 'demo-ziklub',
      databaseURL: 'https://demo-ziklub-default-rtdb.firebaseio.com',
      storageBucket: 'demo-ziklub.appspot.com',
      appId: 'demo',
    }
  : {
      // Firebase web config is public by design; access is protected by database.rules.json and storage.rules.
      apiKey: 'AIzaSyD7_13pF1VbzycBGEzxuJHPC_tWqTR_Qok',
      authDomain: 'ziklub.firebaseapp.com',
      projectId: 'ziklub',
      databaseURL: 'https://ziklub-default-rtdb.firebaseio.com',
      storageBucket: 'ziklub.firebasestorage.app',
      messagingSenderId: '605612326836',
      appId: '1:605612326836:web:1f768e4b79364211affce1',
    };

export const app = initializeApp(config);
export const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

if (useEmulators) {
  // Use the page's host so phones on the same Wi-Fi reach the emulators on this computer.
  const host = window.location.hostname;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectDatabaseEmulator(db, host, 9000);
  connectStorageEmulator(storage, host, 9199);
}

export const api = createZiklubApi(db, storage);

// ----- Anonymous sign-in: no account, but a stable hidden id for security rules. -----

let signInStarted = false;

export function useAuthUser(): { user: User | null; error: boolean } {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [error, setError] = useState(false);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (!u && !signInStarted) {
          signInStarted = true;
          signInAnonymously(auth).catch(() => {
            signInStarted = false;
            setError(true);
          });
        }
      }),
    [],
  );
  return { user, error };
}

/** The signed-in (anonymous) user, signing in first if that hasn't happened yet. */
export async function ensureSignedIn(): Promise<User> {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

// ----- Shared server clock -----

let offset = 0;
api.subscribeServerOffset((o) => (offset = o));

/** Current time on the Firebase server, in ms. */
export const serverNow = () => Date.now() + offset;
