import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { getNeeds, addNeed, updateNeed, deleteNeed } from '@/lib/needs';
import { Need } from '@/types';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Pencil, 
  Check, 
  X, 
  Trophy, 
  User, 
  FileText, 
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const POVEDA_TEAMS = [
  'Aficionado A',
  'Aficionado B',
  'Juvenil A',
  'Juvenil B',
  'Cadete A',
  'Cadete B',
  'Infantil A',
  'Infantil B',
  'Alevín A',
  'Femenino Sénior',
  'Femenino Juvenil'
];

const POSITIONS = [
  'PORTERO',
  'CENTRAL',
  'LATERAL',
  'MEDIO CENTRO DEFENSIVO',
  'INTERIOR',
  'MEDIA PUNTA',
  'EXTREMO',
  'DELANTERO'
];

export default function Needs() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const isAdminOrScout = user?.role === 'admin' || user?.role === 'scout';

  // Form State
  const [equipo, setEquipo] = useState('');
  const [posicion, setPosicion] = useState('');
  const [solicitante, setSolicitante] = useState(user?.nombre || '');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEquipo, setEditingEquipo] = useState('');
  const [editingPosicion, setEditingPosicion] = useState('');
  const [editingSolicitante, setEditingSolicitante] = useState('');
  const [editingObservaciones, setEditingObservaciones] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [needToDelete, setNeedToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters State
  const [filterTeam, setFilterTeam] = useState('ALL');
  const [filterPosition, setFilterPosition] = useState('ALL');

  useEffect(() => {
    async function loadNeeds() {
      try {
        const data = await getNeeds();
        setNeeds(data);
      } catch (err) {
        toast.error('Error al cargar la lista de necesidades');
      } finally {
        setLoading(false);
      }
    }
    loadNeeds();
  }, []);

  // Update requester field if user logs in / store changes
  useEffect(() => {
    if (user?.nombre && !solicitante) {
      setSolicitante(user.nombre);
    }
  }, [user]);

  const handleAddNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrScout) {
      toast.error('Solo personal registrado puede enviar necesidades.');
      return;
    }
    if (!equipo) {
      toast.error('Por favor, selecciona el equipo solicitante.');
      return;
    }
    if (!posicion) {
      toast.error('Por favor, selecciona la posición requerida.');
      return;
    }
    if (!solicitante.trim()) {
      toast.error('Por favor, escribe el nombre de la persona solicitante.');
      return;
    }

    setSaving(true);
    try {
      const created = await addNeed(
        equipo,
        posicion,
        solicitante,
        observaciones,
        user?.id
      );
      setNeeds(prev => [created, ...prev]);
      setEquipo('');
      setPosicion('');
      setObservaciones('');
      toast.success('Necesidad de captación registrada Correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la necesidad');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (need: Need) => {
    setEditingId(need.id);
    setEditingEquipo(need.equipo);
    setEditingPosicion(need.posicion);
    setEditingSolicitante(need.solicitante);
    setEditingObservaciones(need.observaciones || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateNeed = async (id: string) => {
    if (!isAdminOrScout) {
      toast.error('No tienes permisos suficientes.');
      return;
    }
    if (!editingEquipo) {
      toast.error('El equipo es obligatorio');
      return;
    }
    if (!editingPosicion) {
      toast.error('La posición es obligatoria');
      return;
    }
    if (!editingSolicitante.trim()) {
      toast.error('La persona solicitante es obligatoria');
      return;
    }

    setUpdating(true);
    try {
      const updated = await updateNeed(
        id,
        editingEquipo,
        editingPosicion,
        editingSolicitante,
        editingObservaciones
      );
      setNeeds(prev => prev.map(n => n.id === id ? updated : n));
      setEditingId(null);
      toast.success('Necesidad actualizada correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setUpdating(false);
    }
  };

  const requestDeleteNeed = (id: string) => {
    if (!isAdminOrScout) {
      toast.error('No tienes permisos suficientes.');
      return;
    }
    setNeedToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteNeed = async () => {
    if (!needToDelete) return;
    setIsDeleting(true);
    try {
      const success = await deleteNeed(needToDelete);
      if (success) {
        setNeeds(prev => prev.filter(n => n.id !== needToDelete));
        toast.success('Necesidad eliminada de la lista');
        setDeleteModalOpen(false);
        setNeedToDelete(null);
      } else {
        toast.error('Error al intentar eliminar');
      }
    } catch (err) {
      toast.error('Error al intentar eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter logic
  const filteredNeeds = needs.filter(need => {
    const teamMatch = filterTeam === 'ALL' || need.equipo === filterTeam;
    const posMatch = filterPosition === 'ALL' || need.posicion === filterPosition;
    return teamMatch && posMatch;
  });

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-8 h-8 text-blue-500" />
            Necesidades de Captación
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Registra y consulta las carencias y posiciones prioritarias que los cuerpos técnicos solicitan reforzar.
          </p>
        </div>
      </div>

      {/* Grid containing Registration and Listing */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Registration Form Column */}
        {isAdminOrScout ? (
          <Card className="glass-card lg:col-span-1 h-fit">
            <CardHeader className="border-b border-slate-900 pb-4">
              <CardTitle className="text-sm font-black uppercase text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                Registrar Necesidad
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Registra la vacante o requerimiento de refuerzo detectado.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddNeed} className="space-y-5">
                {/* Requesting Team Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Equipo Solicitante</label>
                  <Select value={equipo} onValueChange={setEquipo}>
                    <SelectTrigger className="bg-slate-900 border-slate-805 text-white text-sm">
                      <SelectValue placeholder="Seleccionar equipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {POVEDA_TEAMS.map((team) => (
                        <SelectItem key={team} value={team} className="text-sm">
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Requested Position Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Posición a Reforzar</label>
                  <Select value={posicion} onValueChange={setPosicion}>
                    <SelectTrigger className="bg-slate-900 border-slate-805 text-white text-sm uppercase">
                      <SelectValue placeholder="Seleccionar posición..." />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((pos) => (
                        <SelectItem key={pos} value={pos} className="text-sm">
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Requester Text Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Persona que lo solicita</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Ej. Entrenador Aficionado A o Scouter"
                      value={solicitante}
                      onChange={(e) => setSolicitante(e.target.value)}
                      className="bg-slate-900 border-slate-805 pl-9 text-white placeholder-slate-500 text-sm"
                    />
                  </div>
                </div>

                {/* Observations Text Area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Observaciones y Perfil</label>
                  <Textarea
                    placeholder="Menciona características indispensables (ej. zurdo, rápido, dominante en juego aéreo...)"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="bg-slate-900 border-slate-850 min-h-[100px] text-white placeholder-slate-500 text-sm focus-visible:ring-blue-600"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 mt-2 hover:scale-[1.01] transition-all cursor-pointer"
                >
                  {saving ? 'Registrando...' : 'Registrar Necesidad'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card p-6 flex flex-col items-center justify-center text-center gap-4 h-fit">
            <ShieldAlert className="w-12 h-12 text-slate-500" />
            <div>
              <p className="font-bold text-slate-300">Modo Solo Lectura</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                Debes iniciar sesión con una cuenta autorizada para registrar necesidades de captación.
              </p>
            </div>
          </Card>
        )}

        {/* Directory/Listing Column - Responsive span */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtering Controls */}
          <Card className="glass-card p-4 border border-slate-850 bg-slate-950/40">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-between">
              <div className="text-xs uppercase text-slate-400 font-bold tracking-widest flex items-center gap-1.5 self-start sm:self-auto mb-2 sm:mb-0">
                <Search className="w-4 h-4 text-slate-400" />
                <span>Filtrar Necesidades</span>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                {/* Filter Team Select */}
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger className="bg-slate-900 border-slate-805 text-white text-xs h-9 min-w-[140px]">
                    <SelectValue placeholder="Equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los equipos</SelectItem>
                    {POVEDA_TEAMS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter Position Select */}
                <Select value={filterPosition} onValueChange={setFilterPosition}>
                  <SelectTrigger className="bg-slate-900 border-slate-805 text-white text-xs h-9 min-w-[140px]">
                    <SelectValue placeholder="Posición" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas las posiciones</SelectItem>
                    {POSITIONS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Table Listing Card */}
          <Card className="glass-card">
            <CardHeader className="pb-3 border-b border-slate-900 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase text-slate-200">
                  Vacantes Activas ({filteredNeeds.length})
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Prioridades reflejadas de mayor a menor urgencia.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-12 text-center text-slate-400 animate-pulse text-sm">
                  Cargando prioridades de captación...
                </div>
              ) : filteredNeeds.length === 0 ? (
                <div className="py-16 text-center text-slate-500 italic text-sm border border-dashed border-slate-850 rounded-xl bg-slate-950/10">
                  Ninguna vacante registrada con los filtros seleccionados.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNeeds.map((need) => {
                    const isEditing = editingId === need.id;
                    return (
                      <div 
                        key={need.id} 
                        className={`p-4 border rounded-xl transition-all duration-300 relative ${
                          isEditing 
                            ? 'bg-slate-905 border-blue-500/50' 
                            : 'bg-slate-950/30 border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        {isEditing ? (
                          /* Inline Edit Experience */
                          <div className="space-y-4">
                            <h4 className="text-xs uppercase font-black tracking-widest text-blue-500 flex items-center gap-2">
                              <Pencil className="w-3.5 h-3.5" />
                              Editando Necesidad
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-3">
                              {/* Edit Team */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Equipo</span>
                                <Select value={editingEquipo} onValueChange={setEditingEquipo}>
                                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-8">
                                    <SelectValue placeholder="Equipo..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {POVEDA_TEAMS.map((t) => (
                                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Edit Position */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Posición</span>
                                <Select value={editingPosicion} onValueChange={setEditingPosicion}>
                                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-8 uppercase">
                                    <SelectValue placeholder="Posición..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {POSITIONS.map((p) => (
                                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Edit Requester */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Persona Solicitante</span>
                                <Input
                                  value={editingSolicitante}
                                  onChange={(e) => setEditingSolicitante(e.target.value)}
                                  className="h-8 py-1 bg-slate-900 border-slate-700 text-white text-xs"
                                />
                              </div>
                            </div>

                            {/* Edit Observations */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Observaciones / Perfil</span>
                              <Textarea
                                value={editingObservaciones}
                                onChange={(e) => setEditingObservaciones(e.target.value)}
                                className="bg-slate-900 border-slate-700 text-slate-200 text-xs min-h-[60px]"
                              />
                            </div>

                            <div className="flex items-center gap-2 justify-end pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={updating}
                                className="bg-transparent border-slate-800 text-slate-400 text-xs hover:text-white"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateNeed(need.id)}
                                disabled={updating}
                                className="bg-green-600 hover:bg-green-500 font-bold text-white text-xs flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {updating ? 'Guardando...' : 'Guardar Cambios'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Standard View Card */
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2.5">
                              {/* Header Metadata */}
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-blue-950 text-blue-400 font-black border border-blue-500/20 text-[11px] rounded-md px-2 py-0.5">
                                  {need.equipo}
                                </Badge>
                                <Badge className="bg-slate-900 text-slate-200 font-extrabold text-[10px] uppercase rounded-md px-2 py-0.5 border border-slate-800">
                                  {need.posicion}
                                </Badge>
                              </div>

                              {/* Action Items for authorized users */}
                              {isAdminOrScout && (
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleStartEdit(need)}
                                    className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-slate-900"
                                    title="Editar necesidad"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => requestDeleteNeed(need.id)}
                                    className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-950/20"
                                    title="Eliminar necesidad"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Main Descriptions */}
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                              {need.observaciones || 'Sin observaciones de perfil específicas.'}
                            </p>

                            {/* Footer Requester + Time */}
                            <div className="flex flex-row items-center justify-between gap-1 text-[11px] text-slate-500 font-bold uppercase pt-1 border-t border-slate-950 mt-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-600" />
                                Solicitado por: <span className="text-slate-400 lowercase first-letter:uppercase">{need.solicitante}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                                {need.created_at ? new Date(need.created_at).toLocaleDateString() : 'Por defecto'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="¿Eliminar necesidad?"
        message="¿Estás seguro de que deseas eliminar esta necesidad de la lista del club?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteNeed}
        onClose={() => {
          setDeleteModalOpen(false);
          setNeedToDelete(null);
        }}
        variant="danger"
        isSubmitting={isDeleting}
      />
    </div>
  );
}
