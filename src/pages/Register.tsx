import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';

export default function Register() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-white p-2 rounded-2xl shadow-lg ring-4 ring-white/10">
              <UDLaPovedaLogo className="w-14 h-14" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-white uppercase">
            REGISTRO PÚBLICO DESHABILITADO
          </CardTitle>
          <CardDescription className="text-slate-400">
            Por motivos de seguridad, el alta libre mediante claves estáticas ha sido desactivada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              El acceso a <strong>Captación y Scouting</strong> requiere iniciar sesión con una cuenta Google expresamente autorizada y vinculada por UID en Firebase Authentication.
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Link to="/login" className="w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Inicio de Sesión Google</span>
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
