import { create } from "zustand";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import i18n from "../i18n";

// Native (iOS/Android) implementation — Metro picks useAuthStore.web.ts
// instead on web, since @react-native-firebase has no web support at all
// and would throw just from being imported there.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

interface AuthState {
  user: FirebaseAuthTypes.User | null;
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

// Firebase's error codes are stable but not exactly reader-friendly —
// translate the common ones a player might actually hit.
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
      const credential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      if (displayName.trim()) {
        await credential.user.updateProfile({ displayName: displayName.trim() });
        // updateProfile mutates the current user in place but doesn't
        // re-fire onAuthStateChanged, so the store's snapshot would
        // otherwise keep the pre-update (null) displayName.
        set({ user: auth().currentUser });
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
      await auth().signInWithEmailAndPassword(email.trim(), password);
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
      await auth().sendPasswordResetEmail(email.trim());
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
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      if (!idToken) throw new Error("No ID token returned from Google.");
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "SIGN_IN_CANCELLED" || code === "-5") {
        // User dismissed the Google sign-in sheet — not a real error.
        return;
      }
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  signInWithApple: async () => {
    set({ busy: true, error: null });
    try {
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { identityToken, fullName } = appleCredential;
      if (!identityToken) throw new Error("No identity token returned from Apple.");
      const firebaseCredential = auth.AppleAuthProvider.credential(identityToken);
      const result = await auth().signInWithCredential(firebaseCredential);
      // Apple only ever hands over the name on a person's very first sign-in
      // to this app — capture it now since it won't come again.
      if (fullName?.givenName && !result.user.displayName) {
        await result.user.updateProfile({ displayName: fullName.givenName });
        set({ user: auth().currentUser });
      }
    } catch (err) {
      if ((err as { code?: string })?.code === "ERR_REQUEST_CANCELED") return;
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  updateDisplayName: async (displayName) => {
    const current = auth().currentUser;
    if (!current) return;
    set({ busy: true, error: null });
    try {
      await current.updateProfile({ displayName: displayName.trim() });
      set({ user: auth().currentUser });
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  updatePhotoURL: async (photoURL) => {
    const current = auth().currentUser;
    if (!current) return;
    set({ busy: true, error: null });
    try {
      await current.updateProfile({ photoURL });
      set({ user: auth().currentUser });
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  deleteAccount: async () => {
    const current = auth().currentUser;
    if (!current) return;
    set({ busy: true, error: null });
    try {
      await current.delete();
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  signOut: async () => {
    try {
      const current = await GoogleSignin.getCurrentUser();
      if (current) await GoogleSignin.signOut();
    } catch {
      // Not signed in via Google — nothing to clean up there.
    }
    await auth().signOut();
  },

  clearError: () => set({ error: null }),
}));

auth().onAuthStateChanged((user) => {
  useAuthStore.setState({ user, isReady: true });
});
