import { create } from 'zustand';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { supabase } from '../lib/supabase';
import { auth } from '../lib/firebase';
import { User } from '../types';
import {
  ADMIN_EMAIL,
  ALEJANDRO_EMAIL,
  CLUB_MODULES,
  getAlejandroAccessConfig,
  isStrictAdminEmail,
  isStrictAlejandroEmail,
} from '../lib/clubAccessAndSync';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => {
    if (user) {
      const cleanEmail = (user.email || '').trim().toLowerCase();
      const isAdmin = isStrictAdminEmail(cleanEmail);
      const isAlejandro = isStrictAlejandroEmail(cleanEmail);

      // Zero-Trust: Only angel.saguar@telefonica.net (ADMIN) and asaguar04@gmail.com (SCOUT) are allowed
      if (!isAdmin && !isAlejandro) {
        supabase.auth.signOut().catch(() => {});
        firebaseSignOut(auth).catch(() => {});
        set({ user: null, loading: false });
        return;
      }

      if (isAdmin) {
        user.role = 'admin';
        user.email = ADMIN_EMAIL;
        user.allowedModules = CLUB_MODULES.map((m) => m.id);
      } else {
        user.role = 'scout';
        user.email = ALEJANDRO_EMAIL;
        user.allowedModules = Array.isArray(user.allowedModules) ? user.allowedModules : [];
      }
    }
    set({ user, loading: false });
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore local signout error
    }
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore firebase signout error
    }
    set({ user: null, loading: false });
  },
  refreshUser: async () => {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser || !fbUser.email || !fbUser.emailVerified) {
        await supabase.auth.signOut().catch(() => {});
        set({ user: null, loading: false });
        return;
      }

      const cleanEmail = fbUser.email.trim().toLowerCase();
      if (isStrictAdminEmail(cleanEmail)) {
        set({
          user: {
            id: fbUser.uid,
            email: ADMIN_EMAIL,
            nombre: fbUser.displayName || 'Ángel Saguar',
            role: 'admin',
            allowedModules: CLUB_MODULES.map((m) => m.id),
            uidLocked: true,
          },
          loading: false,
        });
        return;
      }

      if (isStrictAlejandroEmail(cleanEmail)) {
        const cfg = await getAlejandroAccessConfig();
        if (!cfg.active || (cfg.uidLocked && cfg.uid && cfg.uid !== fbUser.uid)) {
          await firebaseSignOut(auth).catch(() => {});
          set({ user: null, loading: false });
          return;
        }
        set({
          user: {
            id: fbUser.uid,
            email: ALEJANDRO_EMAIL,
            nombre: fbUser.displayName || cfg.nombre || 'Alejandro Saguar',
            role: 'scout',
            allowedModules: cfg.allowedModules,
            uidLocked: cfg.uidLocked,
          },
          loading: false,
        });
        return;
      }

      // Any other account is strictly rejected
      await supabase.auth.signOut().catch(() => {});
      await firebaseSignOut(auth).catch(() => {});
      set({ user: null, loading: false });
    } catch (error) {
      console.error('Auth refresh failed:', error);
      set({ user: null, loading: false });
    }
  },
}));
