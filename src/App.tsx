import React, { useEffect } from 'react';
// Force rebuild to trigger Vercel deployment sync
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { syncJugadorasToDatabaseAndLocalStorage } from '@/lib/seedJugadoras';
import { migrateAllStoredMatches } from '@/lib/matchDuration';
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

export default function App() {
  const { user, setUser, loading, refreshUser } = useAuthStore();

  useEffect(() => {
    // Check initial session
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          refreshUser();
        } else if (auth.currentUser && auth.currentUser.email) {
          const email = auth.currentUser.email.toLowerCase();
          setUser({
            id: auth.currentUser.uid,
            email: auth.currentUser.email,
            nombre: auth.currentUser.displayName || email.split('@')[0],
            role: email === 'angel.saguar@telefonica.net' ? 'admin' : 'scout',
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Initial session check failed:', error);
        setUser(null);
      }
    };

    checkInitialSession();
    syncJugadorasToDatabaseAndLocalStorage();
    migrateAllStoredMatches();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        refreshUser();
      } else if (!auth.currentUser) {
        setUser(null);
      }
    });

    const unsubFirebase = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const cleanEmail = fbUser.email.toLowerCase();
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          setUser({
            id: fbUser.uid,
            email: fbUser.email,
            nombre: fbUser.displayName || cleanEmail.split('@')[0],
            role: cleanEmail === 'angel.saguar@telefonica.net' ? 'admin' : 'scout',
          });
        }
        window.dispatchEvent(new CustomEvent('lapoveda_firebase_auth_ready'));
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubFirebase();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-pulse text-xl font-bold tracking-tighter text-blue-600">CLUB SCOUTING...</div>
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
            <Route path="/scouting" element={<Dashboard />} />
            <Route path="/gestion-equipo" element={<GestionEquipo />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/new" element={<PlayerForm />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/players/:id/edit" element={<PlayerForm />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/observers" element={<Observers />} />
            <Route path="/needs" element={<Needs />} />
            <Route path="/coaches" element={<Coaches />} />
            <Route path="/campograma" element={<Campograma />} />
            <Route path="/estadisticas-rivales" element={<EstadisticasRivales />} />
            <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </TooltipProvider>
  );
}
