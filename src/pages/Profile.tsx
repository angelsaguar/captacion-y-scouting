import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCircle, Shield, Mail, Calendar, LogOut, Key } from 'lucide-react';

export default function Profile() {
  const { user, signOut } = useAuthStore();

  if (!user) return null;

  const registrationKey = import.meta.env.VITE_REGISTRATION_KEY || 'lapoveda_secret_2026';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal y preferencias.</p>
      </div>

      <Card className="border-none shadow-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-700 to-slate-900 relative">
           <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-2xl bg-white p-1 shadow-lg ring-4 ring-white">
              <div className="w-full h-full rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-black">
                 {user.nombre.charAt(0)}
              </div>
           </div>
        </div>
        <CardContent className="pt-16 pb-8 px-8 space-y-6">
           <div className="flex justify-between items-start">
             <div>
               <h2 className="text-2xl font-bold">{user.nombre}</h2>
               <p className="text-muted-foreground">{user.email}</p>
             </div>
             <Badge className="bg-blue-600 text-white uppercase tracking-widest text-[10px] px-3 py-1">
                {user.role}
             </Badge>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="capitalize">{user.role}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <UserCircle className="w-4 h-4 text-muted-foreground" />
                <span>ID: {user.id.substring(0, 8)}...</span>
              </div>
           </div>

           <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <Key className="w-5 h-5 text-amber-500 flex-shrink-0" />
               <div>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Clave de Registro para Nuevos Analistas</p>
                 <p className="text-sm font-mono font-bold text-white mt-1 select-all">
                   {registrationKey}
                 </p>
               </div>
             </div>
           </div>

           <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => signOut()} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
              <Button className="bg-slate-900">Actualizar Datos</Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
