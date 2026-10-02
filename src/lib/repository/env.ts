/**
 * SPENDSTATE // FIREBASE ENV
 *
 * Reads the optional `VITE_FIREBASE_*` SDK config. This module touches **no**
 * Firebase code — it only reports whether the cloud backend has been configured,
 * so the UI can hide the cloud sync option entirely when the env vars are absent.
 *
 * A Firebase web `apiKey` is not a secret: it ships in every Firebase web app
 * and is protected by the Firestore security rules in `firestore.rules`.
 */
export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const env = import.meta.env

export const firebaseConfig: FirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
}

/**
 * True only when enough of the config is present to boot the SDK. When false,
 * the app never imports Firebase and the cloud sync option is not rendered.
 */
export const isCloudConfigured: boolean = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)
