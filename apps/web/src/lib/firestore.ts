import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { app, useEmulators } from './firebase';

// Firestore is only used by the Contact page, which loads this file on demand (keeps the main bundle small).
export const firestore = getFirestore(app);
if (useEmulators) connectFirestoreEmulator(firestore, window.location.hostname, 8080);
