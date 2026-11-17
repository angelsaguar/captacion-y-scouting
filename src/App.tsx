import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/store/useAuthStore';
import {
  getRedirectResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { syncJugadorasToDatabaseAndLocalStorage } from '@/lib/seedJugadoras';
import { migrateAllStoredMatches } from '@/lib/matchDuration';
import {
  ADMIN_EMAIL,
  ALEJANDRO_EMAIL,
  CLUB_MODULES,
  ClubModuleId,
  bindAndVerifyAlejandroUid,
  ensureAlejandroAccessInitializedByAdmin,
  isRouteAllowedForUser,
  isStrictAdminEmail,
  isStrictAlejandroEmail,
  subscribeToAlejandroAccessConfig,
  syncAllClubDataWithFirestore,
} from '@/lib/clubAccessAndSync';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Home from '@/pages/Home';
import GestionEquipo from '@/pages/GestionEquipo';
import Dashboard from '@/pages/Dashboard';
import Players from '@/pages/Players';
import PlayerDetail from '@/pages/PlayerDetail';
import PlayerForm from '@/pages/PlayerForm';
import Comparison from '@/pages/Comparison';
import Analytics from '@/pages/Analytics';
import Admin from '@/pages/Admin';
import Profile from '@/pages/Profile';
import Observers from '@/pages/Observers';
import Needs from '@/pages/Needs';
import Coaches from '@/pages/Coaches';
import Campograma from '@/pages/Campograma';
import EstadisticasRivales from '@/pages/EstadisticasRivales';
import { TooltipProvider } from '@/components/ui/tooltip';

function ProtectedModuleRoute({ children }: { children: React.ReactElement }) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = isRouteAllowedForUser(
    location.pathname,
    user.role,
    (user.allowedModules || []) as ClubModuleId[]
  );

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { user, setUser, loading } = useAuthStore();

  useEffect(() => {
    let unsubScoutAccess: (() => void) | null = null;

    // Handle redirect result for iPadOS / Safari standalone mode
    getRedirectResult(auth).catch((err) => {
      console.warn('Redirect sign-in check:', err);
    });

    const unsubFirebase = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubScoutAccess) {
        unsubScoutAccess();
        unsubScoutAccess = null;
      }

      if (!fbUser || !fbUser.email || !fbUser.emailVerified) {
        setUser(null);
        return;
      }

      const cleanEmail = fbUser.email.trim().toLowerCase();

      if (isStrictAdminEmail(cleanEmail)) {
        await ensureAlejandroAccessInitializedByAdmin();
        setUser({
          id: fbUser.uid,
          email: ADMIN_EMAIL,
          nombre: fbUser.displayName || 'Ángel Saguar',
          role: 'admin',
          allowedModules: CLUB_MODULES.map((m) => m.id),
          uidLocked: true,
        });
        window.dispatchEvent(new CustomEvent('lapoveda_firebase_auth_ready'));
        return;
      }

      if (isStrictAlejandroEmail(cleanEmail)) {
        try {
          const scoutCfg = await bindAndVerifyAlejandroUid(fbUser);
          setUser({
            id: fbUser.uid,
            email: ALEJANDRO_EMAIL,
            nombre: fbUser.displayName || scoutCfg.nombre || 'Alejandro Saguar',
            role: 'scout',
            allowedModules: scoutCfg.allowedModules,
            uidLocked: scoutCfg.uidLocked,
          });

          // Live subscription so changes made by Admin on Mac immediately update Alejandro's iPad
          unsubScoutAccess = subscribeToAlejandroAccessConfig((updatedCfg) => {
            if (!updatedCfg.active || (updatedCfg.uidLocked && updatedCfg.uid && updatedCfg.uid !== fbUser.uid)) {
              firebaseSignOut(auth).catch(() => {});
              setUser(null);
              return;
            }
            const current = useAuthStore.getState().user;
            if (current && current.email === ALEJANDRO_EMAIL) {
              setUser({
                ...current,
                allowedModules: updatedCfg.allowedModules,
                uidLocked: updatedCfg.uidLocked,
              });
            }
          });

          window.dispatchEvent(new CustomEvent('lapoveda_firebase_auth_ready'));
        } catch (err) {
          console.error('Alejandro verification failed:', err);
          await firebaseSignOut(auth).catch(() => {});
          setUser(null);
        }
        return;
      }

      // Any other account is unauthorized
      await firebaseSignOut(auth).catch(() => {});
      setUser(null);
    });

    return () => {
      if (unsubScoutAccess) unsubScoutAccess();
      unsubFirebase();
    };
  }, [setUser]);

  // PII Protection & Cross-Device Sync: Only load player rosters and sync after verified login
  useEffect(() => {
    if (!user) return;
    if (!isStrictAdminEmail(user.email) && !isStrictAlejandroEmail(user.email)) return;

    syncJugadorasToDatabaseAndLocalStorage();
    migrateAllStoredMatches();
    syncAllClubDataWithFirestore({ direction: 'bidirectional' }).catch((err) => {
      console.warn('Background Firestore club sync notice:', err);
    });
  }, [user?.id, user?.email, (user?.allowedModules || []).join(',')]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-pulse text-xl font-bold tracking-tighter text-blue-600">
          CLUB SCOUTING...
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

          {/* Main Portal Landing Home */}
          <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />

          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route
              path="/scouting"
              element={
                <ProtectedModuleRoute>
                  <Dashboard />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/gestion-equipo"
              element={
                <ProtectedModuleRoute>
                  <GestionEquipo />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/players"
              element={
                <ProtectedModuleRoute>
                  <Players />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/players/new"
              element={
                <ProtectedModuleRoute>
                  <PlayerForm />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/players/:id"
              element={
                <ProtectedModuleRoute>
                  <PlayerDetail />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/players/:id/edit"
              element={
                <ProtectedModuleRoute>
                  <PlayerForm />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/comparison"
              element={
                <ProtectedModuleRoute>
                  <Comparison />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedModuleRoute>
                  <Analytics />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/observers"
              element={user?.role === 'admin' ? <Observers /> : <Navigate to="/" />}
            />
            <Route
              path="/needs"
              element={
                <ProtectedModuleRoute>
                  <Needs />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/coaches"
              element={
                <ProtectedModuleRoute>
                  <Coaches />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/campograma"
              element={
                <ProtectedModuleRoute>
                  <Campograma />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/estadisticas-rivales"
              element={
                <ProtectedModuleRoute>
                  <EstadisticasRivales />
                </ProtectedModuleRoute>
              }
            />
            <Route
              path="/admin"
              element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />}
            />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </TooltipProvider>
  );
}
