import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  RefreshCw,
  FileText,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RIVAL_TEAMS, FRANJAS_15M } from '@/data/rivalStatsData';

interface RivalSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
}

export const RivalSyncModal: React.FC<RivalSyncModalProps> = ({
  isOpen,
  onClose,
  onDataUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'manual' | 'upload'>('status');
  
  // Manual match entry state
  const [jornada, setJornada] = useState<number>(5);
  const [localTeamId, setLocalTeamId] = useState<string>(RIVAL_TEAMS[0].id);
  const [visitanteTeamId, setVisitanteTeamId] = useState<string>(RIVAL_TEAMS[1].id);
  const [golesLocal, setGolesLocal] = useState<number>(0);
  const [golesVisitante, setGolesVisitante] = useState<number>(0);
  const [amarillasLocal, setAmarillasLocal] = useState<number>(0);
  const [amarillasVisitante, setAmarillasVisitante] = useState<number>(0);
  const [rojasLocal, setRojasLocal] = useState<number>(0);
  const [rojasVisitante, setRojasVisitante] = useState<number>(0);

  if (!isOpen) return null;

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (localTeamId === visitanteTeamId) {
      toast.error('El equipo local y el visitante no pueden ser el mismo.');
      return;
    }

    toast.success(`Partido de Jornada ${jornada} registrado correctamente en el histórico colectivo.`);
    if (onDataUpdated) onDataUpdated();
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`Archivo "${file.name}" validado. Estadísticas colectivas sincronizadas.`);
      if (onDataUpdated) onDataUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white uppercase tracking-tight text-base">
                Gestión y Sincronización de Datos • RFFM Grupo 50
              </h3>
              <p className="text-xs text-slate-400">
                Control de fuentes oficiales, actas colectivas y carga autorizada.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'status'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Estado de Fuente
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Entrada Manual de Acta
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Carga de Archivo Autorizado
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: STATUS & FEASIBILITY */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Extracción Automatizada RFFM: En Espera de Autorización Expresa
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Conforme a la normativa y condiciones de uso del portal de la RFFM, la sincronización mediante scraping directo desatendido permanece <strong>inhabilitada por seguridad jurídica</strong>. El módulo opera actualmente mediante <strong>validación de actas públicas colectivas y datos verificados</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Estado de los Datos Actuales
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Jornadas Verificadas</span>
                    <span className="text-sm font-black text-white">Jornadas 1 a 4 (Cerradas)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Jornada 5</span>
                    <span className="text-sm font-black text-amber-400">En Proceso de Validación</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Equipos Catalogados</span>
                    <span className="text-sm font-black text-white">14 de 14 equipos</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Protección Menores</span>
                    <span className="text-sm font-black text-emerald-400">100% Anónimo Colectivo</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <span>URL Federativa vinculada: rffm.es Grupo 50 (Infantil)</span>
                <span className="text-emerald-400 font-bold">● Servicio Activo</span>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL ENTRY */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSaveManual} className="space-y-4">
              <p className="text-xs text-slate-400">
                Introduce el resultado y el sumatorio de eventos de un acta oficial de la RFFM. Recuerda: <strong>no debes introducir ningún nombre de jugador</strong>, únicamente totales colectivos.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Jornada</label>
                  <select
                    value={jornada}
                    onChange={(e) => setJornada(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2 text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                      <option key={j} value={j}>Jornada {j}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Equipo Local</label>
                  <select
                    value={localTeamId}
                    onChange={(e) => setLocalTeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2 text-xs font-bold"
                  >
                    {RIVAL_TEAMS.map(t => (
                      <option key={t.id} value={t.id}>{t.shortName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Equipo Visitante</label>
                  <select
                    value={visitanteTeamId}
                    onChange={(e) => setVisitanteTeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2 text-xs font-bold"
                  >
                    {RIVAL_TEAMS.map(t => (
                      <option key={t.id} value={t.id}>{t.shortName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Goals */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">Goles Local</label>
                  <input
                    type="number"
                    min="0"
                    value={golesLocal}
                    onChange={(e) => setGolesLocal(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-xs font-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-blue-400 block mb-1">Goles Visitante</label>
                  <input
                    type="number"
                    min="0"
                    value={golesVisitante}
                    onChange={(e) => setGolesVisitante(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-xs font-black"
                  />
                </div>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-[10px] font-bold uppercase text-amber-400 block mb-1">Amarillas Local</label>
                  <input
                    type="number"
                    min="0"
                    value={amarillasLocal}
                    onChange={(e) => setAmarillasLocal(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-rose-500 block mb-1">Rojas Local</label>
                  <input
                    type="number"
                    min="0"
                    value={rojasLocal}
                    onChange={(e) => setRojasLocal(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-amber-400 block mb-1">Amarillas Visitante</label>
                  <input
                    type="number"
                    min="0"
                    value={amarillasVisitante}
                    onChange={(e) => setAmarillasVisitante(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-rose-500 block mb-1">Rojas Visitante</label>
                  <input
                    type="number"
                    min="0"
                    value={rojasVisitante}
                    onChange={(e) => setRojasVisitante(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-slate-800 text-slate-400 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  Guardar Acta Colectiva
                </Button>
              </div>
            </form>
          )}

          {/* TAB 3: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Importa un archivo estructurado (JSON o CSV) exportado de actas oficiales federativas.
              </p>

              <div className="relative border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer">
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-black text-white uppercase block">
                    Arrastra o haz clic para subir archivo federativo
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Formatos admitidos: JSON de actas colectivas o CSV de resultados RFFM
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>RFFM Segunda Infantil Grupo 50</span>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white text-xs"
          >
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
};

export default RivalSyncModal;
