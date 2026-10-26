import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Shield, 
  Search, 
  Sparkles, 
  Plus, 
  Check, 
  ImageIcon, 
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  getAllRivalCrests, 
  saveRivalCrest, 
  deleteRivalCrest, 
  RivalCrest, 
  normalizeRivalKey,
  getRivalInitials,
  DEFAULT_RIVAL_CRESTS 
} from '@/lib/rivalCrests';

interface RivalCrestsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRivalName?: string;
  preselectedRival?: string;
  onCrestSelected?: (rivalName: string, crestUrl: string) => void;
  existingRivalNames?: string[];
}

export default function RivalCrestsManagerModal({
  isOpen,
  onClose,
  initialRivalName = '',
  preselectedRival,
  onCrestSelected,
  existingRivalNames = []
}: RivalCrestsManagerModalProps) {
  const effectiveInitialRival = preselectedRival || initialRivalName;
  const [crests, setCrests] = useState<RivalCrest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // New / Edit Crest Form State
  const [targetRivalName, setTargetRivalName] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-seed and load crests
  const loadCrests = async () => {
    setLoading(true);
    try {
      const list = await getAllRivalCrests();
      setCrests(list);
    } catch (e) {
      console.warn('Failed to load rival crests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCrests();
      if (effectiveInitialRival) {
        setTargetRivalName(effectiveInitialRival);
      }
    }
  }, [isOpen, effectiveInitialRival]);

  if (!isOpen) return null;

  // Process image file to base64 DataURL
  const handleFileProcess = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido (PNG, JPG, SVG o WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('La imagen es demasiado pesada (máximo 8 MB). Elige una versión más optimizada.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result as string;
      if (res) {
        setPreviewDataUrl(res);
        toast.success(`Imagen "${file.name}" cargada correctamente para previsualizar.`);
      }
    };
    reader.onerror = () => {
      toast.error('Error al leer el archivo de imagen.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Save Crest Handler
  const handleSaveCrest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRivalName.trim()) {
      toast.error('Introduce el nombre del equipo rival.');
      return;
    }
    if (!previewDataUrl) {
      toast.error('Selecciona o arrastra una imagen para el escudo.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Guardando escudo del equipo rival...');

    try {
      const saved = await saveRivalCrest(targetRivalName.trim(), previewDataUrl);
      toast.success(`¡Escudo de "${saved.nombre}" guardado con éxito!`, { id: toastId });
      
      // Update local state
      await loadCrests();
      if (onCrestSelected) {
        onCrestSelected(saved.nombre, saved.escudoUrl);
      }

      // Reset form
      setTargetRivalName('');
      setPreviewDataUrl(null);
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar el escudo.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Crest Handler
  const handleDelete = async (crest: RivalCrest) => {
    if (!confirm(`¿Eliminar el escudo de ${crest.nombre}?`)) return;

    try {
      await deleteRivalCrest(crest.id);
      toast.success(`Escudo de "${crest.nombre}" eliminado.`);
      await loadCrests();
    } catch (e) {
      toast.error('No se pudo eliminar el escudo.');
    }
  };

  // Quick edit a rival's crest
  const handleEditSelect = (crest: RivalCrest) => {
    setTargetRivalName(crest.nombre);
    setPreviewDataUrl(crest.escudoUrl);
  };

  // Filtered list
  const filteredCrests = crests.filter((c) => {
    if (!searchQuery) return true;
    const q = normalizeRivalKey(searchQuery);
    return c.nombreNormalizado.includes(q) || c.nombre.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Suggest rival names from matches that don't have custom crest yet
  const rivalsWithoutCrest = existingRivalNames.filter((name) => {
    const k = normalizeRivalKey(name);
    return !crests.some((c) => c.nombreNormalizado === k);
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-left">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-4 sm:p-5 border-b border-blue-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Escudos de Equipos Rivales
                </h3>
                <span className="text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full">
                  {crests.length} {crests.length === 1 ? 'Guardado' : 'Guardados'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sube o administra los escudos oficiales de los rivales para los partidos, carteles matchday, convocatorias y dossieres.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area (Form on Left / Top, Library Grid on Right / Bottom) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* UPLOAD / EDIT FORM (5 / 12 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{targetRivalName && crests.some(c => c.nombreNormalizado === normalizeRivalKey(targetRivalName)) ? 'Actualizar Escudo Rival' : 'Subir Nuevo Escudo'}</span>
                </span>
                {previewDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewDataUrl(null)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                  >
                    Quitar foto
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveCrest} className="space-y-3.5">
                {/* Team Name Input */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Nombre del Equipo Rival *
                  </label>
                  <input
                    type="text"
                    required
                    value={targetRivalName}
                    onChange={(e) => setTargetRivalName(e.target.value)}
                    placeholder="Ej. COSLADA, A.D. Arganda, Rivas..."
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-cyan-500 transition-colors"
                  />

                  {/* Quick-suggest from scheduled matches */}
                  {rivalsWithoutCrest.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Rivales en tu calendario sin escudo:
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                        {rivalsWithoutCrest.slice(0, 6).map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setTargetRivalName(name)}
                            className="text-[10px] font-bold bg-slate-950 border border-slate-800 hover:border-cyan-400/60 text-slate-300 hover:text-cyan-300 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                          >
                            + {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropzone File Upload */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Archivo de Imagen del Escudo *
                  </label>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden ${
                      isDragging
                        ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-400/30'
                        : previewDataUrl
                        ? 'border-emerald-500/50 bg-slate-950/90'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {previewDataUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-xl border border-slate-700 flex items-center justify-center">
                          <img
                            src={previewDataUrl}
                            alt="Vista previa del escudo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                          ✓ Escudo listo para guardar
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Haz clic para cambiar de archivo
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex flex-col items-center">
                        <div className="w-11 h-11 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                          <ImageIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <p className="text-xs font-bold text-white">
                          Arrastra aquí el escudo o <span className="text-cyan-400 underline">examina</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          PNG transparente, SVG, JPG o WEBP (hasta 8MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !targetRivalName.trim() || !previewDataUrl}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  <span>Guardar y Vincular Escudo</span>
                </Button>
              </form>
            </div>
          </div>

          {/* LIBRARY / CATALOG OF RIVALS (7 / 12 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            {/* Search Header */}
            <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar equipo rival..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadCrests}
                className="h-8 px-2.5 text-xs text-slate-400 hover:text-white"
                title="Recargar catálogo"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Recargar</span>
              </Button>
            </div>

            {/* Crests Grid */}
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-2.5">
              {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs animate-pulse">
                  Cargando catálogo de escudos...
                </div>
              ) : filteredCrests.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl space-y-2">
                  <Shield className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">
                    {searchQuery ? `No se encontraron rivales con "${searchQuery}"` : 'Aún no has subido escudos de equipos rivales.'}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Usa el formulario de la izquierda para subir el escudo de cualquier club al que te enfrentes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredCrests.map((crest) => (
                    <div
                      key={crest.id}
                      className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md group transition-all"
                    >
                      {/* Badge Display */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-md border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={crest.escudoUrl}
                            alt={crest.nombre}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-white uppercase tracking-tight truncate">
                            {crest.nombre}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            Actualizado: {new Date(crest.updatedAt).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSelect(crest)}
                          className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-blue-600/30 border border-slate-800 hover:border-blue-500/50 flex items-center justify-center text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                          title="Cambiar escudo o nombre"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(crest)}
                          className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-800 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Eliminar este escudo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick helper tip footer */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex items-center gap-2.5 text-[11px] text-slate-400">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Los escudos subidos se asocian de forma automática por nombre en el Calendario de Partidos, los Carteles Matchday y las Convocatorias oficiales.
              </span>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-3.5 sm:p-4 flex items-center justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white px-5 rounded-xl"
          >
            Listo / Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
}
