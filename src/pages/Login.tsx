import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import {
  ADMIN_EMAIL,
  ALEJANDRO_EMAIL,
  CLUB_MODULES,
  bindAndVerifyAlejandroUid,
  ensureAlejandroAccessInitializedByAdmin,
  isStrictAdminEmail,
  isStrictAlejandroEmail,
} from '@/lib/clubAccessAndSync';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      let credential;
      try {
        credential = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        // Fallback for iPadOS / Safari PWA standalone mode if popups are blocked
        if (
          popupErr?.code === 'auth/popup-blocked' ||
          popupErr?.code === 'auth/operation-not-supported-in-this-environment'
        ) {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }

      const fbUser = credential.user;
      const fbEmail = (fbUser.email || '').trim().toLowerCase();

      if (!fbUser.emailVerified) {
        await firebaseSignOut(auth);
        throw new Error('Acceso denegado: Se requiere una cuenta Google con correo verificado.');
      }

      if (isStrictAdminEmail(fbEmail)) {
        await ensureAlejandroAccessInitializedByAdmin();
        setUser({
          id: fbUser.uid,
          email: ADMIN_EMAIL,
          nombre: fbUser.displayName || 'Ángel Saguar',
          role: 'admin',
          allowedModules: CLUB_MODULES.map((m) => m.id),
          uidLocked: true,
        });
        toast.success('Bienvenido, Administrador Principal (Sincronización Mac & iPad activa)');
        navigate('/');
        return;
      }

      if (isStrictAlejandroEmail(fbEmail)) {
        const scoutConfig = await bindAndVerifyAlejandroUid(fbUser);
        setUser({
          id: fbUser.uid,
          email: ALEJANDRO_EMAIL,
          nombre: fbUser.displayName || scoutConfig.nombre || 'Alejandro Saguar',
          role: 'scout',
          allowedModules: scoutConfig.allowedModules,
          uidLocked: scoutConfig.uidLocked,
        });
        toast.success('Identidad Google y UID de Firebase verificados correctamente');
        navigate('/');
        return;
      }

      // Any other email is strictly rejected and signed out
      await firebaseSignOut(auth);
      throw new Error(
        `Acceso denegado: La cuenta "${fbEmail}" no tiene autorización en Captación y Scouting.`
      );
    } catch (error: any) {
      toast.error(error?.message || 'Error al verificar credenciales con Google Authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px]" />
      </div>

      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-2 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3" /> Acceso Blindado Google Auth + UID Vinculado
            </span>
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-white p-2 rounded-2xl shadow-lg ring-4 ring-white/10">
              <UDLaPovedaLogo className="w-16 h-16" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white uppercase">
            FUNDACION. AFE SCOUTING
          </CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Plataforma privada de Captación y Dirección Deportiva sincronizada para Mac y iPad.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold h-12 flex items-center justify-center gap-2.5 cursor-pointer shadow-lg rounded-xl"
            id="google-signin-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                <span>Verificando identidad y UID en Firebase...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                <span>Iniciar Sesión con Cuenta Google Verificada</span>
              </>
            )}
          </Button>

          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-200 font-bold">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Política de Seguridad Zero-Trust</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-400">
              El acceso está restringido exclusivamente a las cuentas Google verificadas del Administrador Principal y del Observador autorizado con validación criptográfica de UID en Firebase Authentication.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-0">
          <p className="text-[11px] text-center text-slate-500 font-medium">
            Compatible con Safari y Chrome en macOS y iPadOS.
          </p>
        </CardFooter>
      </Card>

      <div className="absolute bottom-8 text-center w-full text-slate-500 text-xs tracking-widest uppercase font-semibold">
        © 2026 CLUB - PROFESSIONAL SCOUTING DIVISION
      </div>
    </div>
  );
}
