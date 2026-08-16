import { create } from "zustand";
import { initializeApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from "firebase/auth";
import i18n from "../i18n";

// Web implementation — uses the `firebase` JS SDK instead of
// @react-native-firebase, since that native package has no web support at
// all. Metro picks this file automatically when bundling for web (see the
// bare useAuthStore.ts for the native iOS/Android implementation).
const firebaseConfig = {
  apiKey: "AIzaSyCJQfkULt6kd19ZxIr-Vt-HY_8HAThH7i8",
  authDomain: "bones-and-beasts.firebaseapp.com",
  projectId: "bones-and-beasts",
  storageBucket: "bones-and-beasts.firebasestorage.app",
  messagingSenderId: "835619649376",
  appId: "1:835619649376:web:58ec5881f62cf19af21005",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  // Used to compute the Group-play free trial window — sourced from
  // Firebase itself so it can't be reset by clearing local storage.
  creationTime: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isReady: boolean;
  busy: boolean;
  error: string | null;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  updatePhotoURL: (photoURL: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    creationTime: user.metadata.creationTime ?? null,
  };
}

// Same error-code-to-message mapping as the native store, since both use
// Firebase Auth under the hood and share the same "auth/*" error codes.
function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return i18n.t("authErrors.emailAlreadyInUse");
    case "auth/invalid-email":
      return i18n.t("authErrors.invalidEmail");
    case "auth/missing-email":
      return i18n.t("authErrors.missingEmail");
    case "auth/weak-password":
      return i18n.t("authErrors.weakPassword");
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return i18n.t("authErrors.wrongPassword");
    case "auth/user-not-found":
      return i18n.t("authErrors.userNotFound");
    case "auth/too-many-requests":
      return i18n.t("authErrors.tooManyRequests");
    case "auth/network-request-failed":
      return i18n.t("authErrors.networkError");
    case "auth/requires-recent-login":
      return i18n.t("authErrors.requiresRecentLogin");
    default:
      return (err as { message?: string })?.message ?? i18n.t("authErrors.generic");
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isReady: false,
  busy: false,
  error: null,

  signUpWithEmail: async (email, password, displayName) => {
    set({ busy: true, error: null });
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
        // updateProfile mutates the current user in place but doesn't
        // re-fire onAuthStateChanged, so the store's snapshot would
        // otherwise keep the pre-update (null) displayName.
        set({ user: toAuthUser(auth.currentUser) });
      }
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ busy: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  resetPassword: async (email) => {
    set({ busy: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  signInWithGoogle: async () => {
    set({ busy: true, error: null });
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return; // user closed the popup — not a real error
      }
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  // Apple sign-in on web needs a separate Services ID + private key
  // configured in Apple's developer portal (skipped for now — see README).
  // The Profile screen only shows the Apple button on iOS anyway, so this
  // exists purely so the store's shape matches the native implementation.
  signInWithApple: async () => {
    set({ error: "Sign in with Apple isn't set up for web yet — please use the iOS app." });
  },

  updateDisplayName: async (displayName) => {
    if (!auth.currentUser) return;
    set({ busy: true, error: null });
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      set({ user: toAuthUser(auth.currentUser) });
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  updatePhotoURL: async (photoURL) => {
    if (!auth.currentUser) return;
    set({ busy: true, error: null });
    try {
      await updateProfile(auth.currentUser, { photoURL });
      set({ user: toAuthUser(auth.currentUser) });
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  deleteAccount: async () => {
    const current = auth.currentUser;
    if (!current) return;
    set({ busy: true, error: null });
    try {
      await deleteUser(current);
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
  },

  clearError: () => set({ error: null }),
}));

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user: toAuthUser(user), isReady: true });
});
