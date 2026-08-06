import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getObservers, addObserver, deleteObserver, updateObserver } from '@/lib/observers';
import { Observer } from '@/types';
import { Users, Plus, Trash2, Calendar, Pencil, Check, X, Camera, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// Image compression and resize helper
const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('Canvas context is null'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default function Observers() {
  const [observers, setObservers] = useState<Observer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newObsName, setNewObsName] = useState('');
  const [newObsPhoto, setNewObsPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPhoto, setEditingPhoto] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [observerToDelete, setObserverToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    async function loadObservers() {
      try {
        const data = await getObservers();
        setObservers(data);
      } catch (err) {
        toast.error('Error al cargar la lista de observadores');
      } finally {
        setLoading(false);
      }
    }
    loadObservers();
  }, []);

  const handleAddObserver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Solo los administradores pueden dar de alta scouters.');
      return;
    }
    const trimmed = newObsName.trim();
    if (!trimmed) {
      toast.error('El nombre del observador no puede estar vacío');
      return;
    }

    setSaving(true);
    try {
      const created = await addObserver(trimmed, newObsPhoto || undefined);
      setObservers(prev => [...prev.filter(o => o.id !== created.id), created].sort((a,b) => a.nombre.localeCompare(b.nombre)));
      setNewObsName('');
      setNewObsPhoto('');
      toast.success(`Observador "${created.nombre}" registrado con éxito`);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo guardar el observador');
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteObserver = (id: string, name: string) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden eliminar scouters.');
      return;
    }
    setObserverToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const confirmDeleteObserver = async () => {
    if (!observerToDelete) return;
    setIsDeleting(true);
    try {
      const success = await deleteObserver(observerToDelete.id);
      if (success) {
        setObservers(prev => prev.filter(o => o.id !== observerToDelete.id));
        toast.success('Observador eliminado de la lista');
        setDeleteModalOpen(false);
        setObserverToDelete(null);
      } else {
        toast.error('No se pudo eliminar el observador');
      }
    } catch (err) {
      toast.error('Error al intentar eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = (id: string, name: string, fotoUrl?: string) => {
    setEditingId(id);
    setEditingName(name);
    setEditingPhoto(fotoUrl || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingPhoto('');
  };

  const handleUpdateObserver = async (id: string) => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden editar scouters.');
      return;
    }
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error('El nombre del observador no puede estar vacío');
      return;
    }

    setUpdating(true);
    try {
      const updated = await updateObserver(id, trimmed, editingPhoto || '');
      setObservers(prev => prev.map(o => o.id === id ? updated : o).sort((a,b) => a.nombre.localeCompare(b.nombre)));
      setEditingId(null);
      setEditingName('');
      setEditingPhoto('');
      toast.success('Scouter actualizado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el scouter');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tight">Directorio de Scouters</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestiona el equipo de observadores y analistas de la UD La Poveda.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Registration Card - Only shown for Admins */}
        {isAdmin && (
          <Card className="glass-card md:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base font-black uppercase text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                Alta de Scouter
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Registra un nuevo analista/observador para el club.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddObserver} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Nombre Completo</label>
                  <Input
                    placeholder="Ej. Ángel Saguar"
                    value={newObsName}
                    onChange={(e) => setNewObsName(e.target.value)}
                    className="bg-slate-900 border-slate-805 text-white placeholder-slate-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Foto Oficial del Club</label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative group">
                      {newObsPhoto ? (
                        <>
                          <img src={newObsPhoto} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewObsPhoto('')}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-500 text-xs font-bold"
                          >
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <Camera className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const base64 = await processImageFile(file);
                              setNewObsPhoto(base64);
                            } catch (err) {
                              toast.error('Error al procesar la imagen');
                            }
                          }
                        }}
                        className="bg-slate-900 border-slate-805 text-white text-xs file:bg-blue-600 file:hover:bg-blue-500 file:text-white file:border-none file:px-2 file:py-1 file:rounded-md file:mr-2 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Formato PNG/JPG. Se redimensionará automáticamente.</p>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {saving ? 'Registrando...' : 'Registrar Scouter'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Directory Listing */}
        <Card className={`glass-card ${isAdmin ? 'md:col-span-2' : 'md:col-span-3'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black uppercase text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Scouters Registrados ({observers.length})
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Lista de observadores activos disponibles para asignar a informes de jugadores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-slate-400 animate-pulse text-sm">
                Cargando directorio de scouters...
              </div>
            ) : observers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic text-sm border-2 border-dashed border-slate-800 rounded-xl">
                No hay scouters registrados. {isAdmin && 'Utiliza el formulario lateral para dar de alta al primero.'}
              </div>
            ) : (
              <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/20">
                <Table>
                  <TableHeader className="bg-slate-950/40">
                    <TableRow className="border-slate-805 hover:bg-transparent">
                      <TableHead className="text-slate-500 font-bold uppercase text-[10px] py-3">Nombre del Scouter</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase text-[10px] py-3">F. de Registro</TableHead>
                      {isAdmin && <TableHead className="text-right text-slate-500 font-bold uppercase text-[10px] py-3">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {observers.map((obs) => {
                      const isEditing = editingId === obs.id;
                      return (
                        <TableRow key={obs.id} className="border-slate-805 hover:bg-slate-900/30">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              {isEditing ? (
                                <div className="flex items-center gap-3 w-full">
                                  <div className="relative w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 group">
                                    {editingPhoto ? (
                                      <img src={editingPhoto} className="w-full h-full object-cover" />
                                    ) : (
                                      <Camera className="w-5 h-5 text-slate-500" />
                                    )}
                                    <label htmlFor={`edit-photo-${obs.id}`} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                      <UploadCloud className="w-4 h-4 text-white" />
                                    </label>
                                    <input
                                      id={`edit-photo-${obs.id}`}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const base64 = await processImageFile(file);
                                            setEditingPhoto(base64);
                                          } catch (err) {
                                            toast.error('Error al procesar la imagen');
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 flex flex-col gap-1.5 justify-center">
                                    <Input
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      className="h-8 py-1 bg-slate-900 border-slate-700 text-white text-sm max-w-[200px]"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateObserver(obs.id);
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <div className="flex items-center gap-2 text-xs">
                                      <label htmlFor={`edit-photo-${obs.id}`} className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer flex items-center gap-1 transition-colors">
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        <span>Subir/Cambiar Foto</span>
                                      </label>
                                      {editingPhoto && (
                                        <>
                                          <span className="text-slate-700">|</span>
                                          <button 
                                            type="button" 
                                            onClick={() => setEditingPhoto('')} 
                                            className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 transition-colors"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Quitar Foto</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-500/20 flex items-center justify-center overflow-hidden text-xs font-black text-blue-400 shrink-0">
                                    {obs.foto_url ? (
                                      <img src={obs.foto_url} alt={obs.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                      obs.nombre.substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <span className="font-bold text-slate-200 text-sm">{obs.nombre}</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-slate-400 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {obs.created_at ? new Date(obs.created_at).toLocaleDateString() : 'Por defecto'}
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="py-3 text-right">
                              <div className="flex justify-end items-center gap-1">
                                {isEditing ? (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleUpdateObserver(obs.id)}
                                      disabled={updating}
                                      className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-950/20"
                                      title="Guardar"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={handleCancelEdit}
                                      disabled={updating}
                                      className="h-8 w-8 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                                      title="Cancelar"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleStartEdit(obs.id, obs.nombre, obs.foto_url)}
                                      className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                      title="Editar scouter"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => requestDeleteObserver(obs.id, obs.nombre)}
                                      className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/20"
                                      title="Eliminar Scouter"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="¿Eliminar Scouter?"
        message={`¿Estás seguro de que deseas eliminar al scouter "${observerToDelete?.name || ''}"? Esta acción no borrará informes de jugadores ya asignados.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteObserver}
        onClose={() => {
          setDeleteModalOpen(false);
          setObserverToDelete(null);
        }}
        variant="danger"
        isSubmitting={isDeleting}
      />
    </div>
  );
}
