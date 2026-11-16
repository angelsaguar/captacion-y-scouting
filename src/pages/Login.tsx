import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { supabase } from '@/lib/supabase';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isAuthorizedStaff = (emailRaw: string, nombreRaw: string = '') => {
    const cleanEmail = emailRaw.trim().toLowerCase();
    const cleanNombre = nombreRaw.trim().toLowerCase();
    const isSanti = cleanEmail.includes('santi') || cleanNombre.includes('santi');
    const isAlejandro = cleanEmail.includes('alejandro') || cleanEmail.includes('saguar') || cleanNombre.includes('alejandro') || cleanNombre.includes('saguar');
    const isJavier = cleanEmail.includes('javier') || cleanEmail.includes('asensio') || cleanNombre.includes('javier') || cleanNombre.includes('asensio');
    const isAdmin = cleanEmail === 'angel.saguar@telefonica.net';
    return { allowed: isAdmin || isSanti || isAlejandro || isJavier, isAdmin };
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const fbUser = credential.user;
      const fbEmail = (fbUser.email || '').trim().toLowerCase();
      const fbName = fbUser.displayName || '';
      const { allowed, isAdmin } = isAuthorizedStaff(fbEmail, fbName);

      if (!allowed) {
        await firebaseSignOut(auth);
        throw new Error('Acceso restringido: Cuenta Google no autorizada.');
      }

      setUser({
        id: fbUser.uid,
        email: fbEmail,
        nombre: fbName || (isAdmin ? 'Ángel Saguar' : 'Usuario Autorizado'),
        role: isAdmin ? 'admin' : 'scout',
      });
      toast.success('Sesión iniciada con Google y Nube Firebase conectada');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const { allowed } = isAuthorizedStaff(cleanEmail);

    if (!allowed) {
      toast.error('Acceso restringido: Solo el administrador Ángel Saguar y los observadores autorizados (SANTI, ALEJANDRO SAGUAR, JAVIER ASENSIO) tienen permitido el acceso.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        const loggedEmail = data.user.email ? data.user.email.toLowerCase() : '';
        const loggedNombre = (data.user.user_metadata?.nombre || '').toLowerCase();
        const check = isAuthorizedStaff(loggedEmail, loggedNombre);

        if (!check.allowed) {
          await supabase.auth.signOut();
          throw new Error('Acceso restringido: Cuenta no autorizada.');
        }
      }

      toast.success('Sesión iniciada correctamente');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[128px]" />
      </div>

      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-2 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              <Database className="w-3 h-3" /> Firebase Firestore + Persistencia Local
            </span>
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-white p-2 rounded-2xl shadow-lg ring-4 ring-white/10">
              <UDLaPovedaLogo className="w-16 h-16" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white uppercase">FUNDACION. AFE SCOUTING</CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Acceso autorizado para el administrador Ángel Saguar y los observadores (SANTI, ALEJANDRO SAGUAR).
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold h-11 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
              <span>Continuar con Google (Sincronización Firestore)</span>
            </Button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-800" />
              <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">o acceso con email</span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Introduce tu correo electrónico" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-blue-600"
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-blue-600"
                  required 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'ENTRAR A LA PLATAFORMA'
              )}
            </Button>
            <p className="text-xs text-center text-slate-400 font-medium mt-1">
              ¿Eres observador autorizado (SANTI / ALEJANDRO SAGUAR)? <Link to="/register" className="text-blue-500 hover:underline font-bold">Regístrate aquí</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      <div className="absolute bottom-8 text-center w-full text-slate-500 text-xs tracking-widest uppercase font-semibold">
        © 2026 CLUB - PROFESSIONAL SCOUTING DIVISION
      </div>
    </div>
  );
}
