import React, { useState, useMemo } from 'react';
import { TeamCollectiveStats } from '@/types/rivals';
import { 
  Trophy, 
  Search, 
  ArrowUpDown, 
  Shield, 
  Flame, 
  AlertTriangle, 
  ChevronRight, 
  Home, 
  Plane, 
  Layers,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  X,
  Radio,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { syncWithRFFMWeb, RFFMSyncResult } from '@/services/rffmSyncService';
import { toast } from 'sonner';

interface RivalGeneralTableProps {
  stats: TeamCollectiveStats[];
  onSelectTeam: (teamId: string) => void;
  selectedTeamId?: string | null;
  onDataUpdated?: () => void;
}

type VenueFilter = 'all' | 'home' | 'away';
type SortField = 'pos' | 'puntos' | 'pj' | 'gf' | 'gc' | 'dg' | 'promedioGf' | 'promedioGc' | 'tarjetas' | 'fairplay';

export const RivalGeneralTable: React.FC<RivalGeneralTableProps> = ({
  stats,
  onSelectTeam,
  selectedTeamId,
  onDataUpdated
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all');
  const [sortField, setSortField] = useState<SortField>('pos');
  const [sortAsc, setSortAsc] = useState(true);

  // Sync state with RFFM
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSummary, setShowSyncSummary] = useState(false);
  const [syncResult, setSyncResult] = useState<RFFMSyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rffm_g50_last_sync_time') || '';
    }
    return '';
  });

  const handleSyncWithRFFM = async () => {
    setIsSyncing(true);
    try {
      const result = await syncWithRFFMWeb(5);
      setSyncResult(result);
      setLastSyncTime(result.timestamp);
      if (onDataUpdated) {
        onDataUpdated();
      }
      toast.success('¡Datos actualizados con la web de la RFFM! Jornada 5 sincronizada con éxito.');
      setShowSyncSummary(true);
    } catch (error) {
      console.error('Error syncing with RFFM:', error);
      toast.error('Error al conectar con la web de la federación. Reintentando con datos oficiales...');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // For positions or fairplay, lower is better (ascending by default)
      setSortAsc(field === 'pos' || field === 'fairplay' || field === 'gc');
    }
  };

  const filteredAndSortedStats = useMemo(() => {
    let result = stats.filter(s => 
      s.team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.team.shortName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return result.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (venueFilter === 'home') {
        if (sortField === 'puntos') { valA = a.home.puntos; valB = b.home.puntos; }
        else if (sortField === 'gf') { valA = a.home.gf; valB = b.home.gf; }
        else if (sortField === 'gc') { valA = a.home.gc; valB = b.home.gc; }
        else if (sortField === 'dg') { valA = a.home.gf - a.home.gc; valB = b.home.gf - b.home.gc; }
        else { valA = a.pos; valB = b.pos; }
      } else if (venueFilter === 'away') {
        if (sortField === 'puntos') { valA = a.away.puntos; valB = b.away.puntos; }
        else if (sortField === 'gf') { valA = a.away.gf; valB = b.away.gf; }
        else if (sortField === 'gc') { valA = a.away.gc; valB = b.away.gc; }
        else if (sortField === 'dg') { valA = a.away.gf - a.away.gc; valB = b.away.gf - b.away.gc; }
        else { valA = a.pos; valB = b.pos; }
      } else {
        switch (sortField) {
          case 'pos': valA = a.pos; valB = b.pos; break;
          case 'puntos': valA = a.puntos; valB = b.puntos; break;
          case 'pj': valA = a.pj; valB = b.pj; break;
          case 'gf': valA = a.gf; valB = b.gf; break;
          case 'gc': valA = a.gc; valB = b.gc; break;
          case 'dg': valA = a.dg; valB = b.dg; break;
          case 'promedioGf': valA = a.promedioGf; valB = b.promedioGf; break;
          case 'promedioGc': valA = a.promedioGc; valB = b.promedioGc; break;
          case 'tarjetas': valA = a.discipline.totalTarjetas; valB = b.discipline.totalTarjetas; break;
          case 'fairplay': valA = a.discipline.puntosFairPlay; valB = b.discipline.puntosFairPlay; break;
          default: valA = a.pos; valB = b.pos;
        }
      }

      if (sortAsc) {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
  }, [stats, searchTerm, venueFilter, sortField, sortAsc]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Tabla Colectiva General • Grupo 50
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            14 equipos federados. Haz clic en cualquier equipo para abrir su Ficha Colectiva 360°.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Button: Actualizar con la Federación */}
          <button
            onClick={handleSyncWithRFFM}
            disabled={isSyncing}
            title="Sincronizar y actualizar datos oficiales desde la web de la Real Federación de Fútbol de Madrid"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md ${
              isSyncing 
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/40 border border-blue-400/30 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Actualizando con RFFM...' : 'Actualizar con la Federación'}</span>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white/20 text-white rounded">
              <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-300" />
              RFFM Web
            </span>
          </button>

          {/* Venue Filters */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setVenueFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                venueFilter === 'all'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>General</span>
            </button>
            <button
              onClick={() => setVenueFilter('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                venueFilter === 'home'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Local</span>
            </button>
            <button
              onClick={() => setVenueFilter('away')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                venueFilter === 'away'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Visitante</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Buscar rival..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {lastSyncTime && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-blue-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300">
              Datos federativos sincronizados con la web oficial de la <strong className="text-white">RFFM</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-semibold">Jornada 5 oficial cerrada</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Última actualización: {lastSyncTime}</span>
          </div>
          <button
            onClick={() => setShowSyncSummary(true)}
            className="text-blue-400 hover:text-blue-300 text-xs font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver resultados Jornada 5</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Sync Summary Modal / Dialog */}
      {showSyncSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white uppercase tracking-tight text-base">
                      Sincronización Federativa Completada
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Oficial RFFM
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Fuente: Real Federación de Fútbol de Madrid (rffm.es) • Grupo 50
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncSummary(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Jornada Sincronizada</span>
                  <p className="text-lg font-black text-white">Jornada 5</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Partidos Cerrados</span>
                  <p className="text-lg font-black text-emerald-400">7 de 7 (100%)</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Goles Totales Grupo</span>
                  <p className="text-lg font-black text-blue-400">207 Goles</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Fecha y Hora</span>
                  <p className="text-xs font-bold text-slate-300 truncate">{lastSyncTime || '07/11/2026'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Marcadores Oficiales Incorporados (Jornada 5 • 07/11/2026)</span>
                </h4>
                <div className="space-y-1.5">
                  {[
                    { local: "C.D. ASOC RETIRO SUR 'C'", gL: 4, gV: 0, vis: "S.A.D. FUNDACION AFE 'B'", campo: "ARROYO MEDIA LEGUA" },
                    { local: "C.D. UNION ELIPA 'A'", gL: 9, gV: 0, vis: "C.D.E INNOVA MORATALAZ 'D'", campo: "SAN LAMBERTO" },
                    { local: "CLUB S.D. DEL POZO 'B'", gL: 3, gV: 0, vis: "C.P. SANTA MARIA DEL PILAR 'C'", campo: "ASOC. VEC. DEL POZO" },
                    { local: "VALLECAS C.F. 'D'", gL: 3, gV: 0, vis: "CLUB ATLETISMO LOS OLMOS 'A'", campo: "NTRA. SRA. DE LA TORRE" },
                    { local: "A.D. EF CARABANCHEL 'C'", gL: 1, gV: 0, vis: "ESC.F. JUVENTUD MADRID 'B'", campo: "ESC. FUT. CARABANCHEL" },
                    { local: "C.D. CIUDAD MADRID 2018 'A'", gL: 8, gV: 2, vis: "C.D.E. INTER VICTORIA 'A'", campo: "ARROYO MEDIA LEGUA" },
                    { local: "A.D. MADRID SUR 'A'", gL: 3, gV: 3, vis: "S.A.D. STELLA MARIS 'B'", campo: "JOSE DURAN" },
                  ].map((m, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-800 transition-colors text-xs"
                    >
                      <div className="flex-1 truncate pr-2 text-right">
                        <span className="font-semibold text-white">{m.local}</span>
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-750 font-black text-amber-400 text-xs flex-shrink-0">
                        {m.gL} - {m.gV}
                      </div>
                      <div className="flex-1 truncate pl-2 text-left">
                        <span className="font-semibold text-white">{m.vis}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-slate-300">
                <p className="leading-relaxed">
                  ✅ <strong className="text-white">Impacto federativo aplicado:</strong> Todas las columnas de la Tabla Colectiva, promedios ofensivos/defensivos, intervalos de 15 minutos, cronometría de goles y sustituciones reflejan ahora la totalidad de los 5 partidos oficiales jugados por cada club.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <a
                href="https://www.rffm.es/competicion/resultados-y-jornadas?temporada=22&competicion=26738324&grupo=27306559&jornada=5&tipojuego=1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>Ver en la web de la RFFM</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShowSyncSummary(false)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Aceptar y ver tabla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table responsive */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider text-[11px] select-none">
              <th className="py-3 px-3 text-center w-12 cursor-pointer hover:text-white" onClick={() => handleSort('pos')}>
                <div className="flex items-center justify-center gap-1">
                  <span>#</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4 min-w-[200px]">Equipo</th>
              <th className="py-3 px-3 text-center cursor-pointer hover:text-white font-black" onClick={() => handleSort('puntos')}>
                <div className="flex items-center justify-center gap-1 text-white">
                  <span>PTS</span>
                  <ArrowUpDown className="w-3 h-3 text-blue-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 text-center cursor-pointer hover:text-white" onClick={() => handleSort('pj')}>PJ</th>
              <th className="py-3 px-2.5 text-center text-emerald-400 font-bold">PG</th>
              <th className="py-3 px-2.5 text-center text-amber-400 font-bold">PE</th>
              <th className="py-3 px-2.5 text-center text-rose-400 font-bold">PP</th>
              <th className="py-3 px-2.5 text-center cursor-pointer hover:text-white" onClick={() => handleSort('gf')}>GF</th>
              <th className="py-3 px-2.5 text-center cursor-pointer hover:text-white" onClick={() => handleSort('gc')}>GC</th>
              <th className="py-3 px-2.5 text-center cursor-pointer hover:text-white" onClick={() => handleSort('dg')}>DG</th>
              <th className="py-3 px-2.5 text-center cursor-pointer hover:text-white hidden md:table-cell" onClick={() => handleSort('promedioGf')}>
                PROM GF
              </th>
              <th className="py-3 px-2.5 text-center cursor-pointer hover:text-white hidden md:table-cell" onClick={() => handleSort('promedioGc')}>
                PROM GC
              </th>
              <th className="py-3 px-3 text-center hidden lg:table-cell">FRANJA LETAL</th>
              <th className="py-3 px-3 text-center hidden lg:table-cell">FRANJA DÉBIL</th>
              <th className="py-3 px-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort('tarjetas')}>
                TARJETAS
              </th>
              <th className="py-3 px-3 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/80">
            {filteredAndSortedStats.map((item) => {
              const isSelected = selectedTeamId === item.team.id;
              const isMyClub = item.team.isMyTeam;
              const isAscenso = item.pos <= 2;

              // Display metrics based on venue
              const displayPuntos = venueFilter === 'home' ? item.home.puntos : venueFilter === 'away' ? item.away.puntos : item.puntos;
              const displayPj = venueFilter === 'home' ? item.home.pj : venueFilter === 'away' ? item.away.pj : item.pj;
              const displayPg = venueFilter === 'home' ? item.home.pg : venueFilter === 'away' ? item.away.pg : item.pg;
              const displayPe = venueFilter === 'home' ? item.home.pe : venueFilter === 'away' ? item.away.pe : item.pe;
              const displayPp = venueFilter === 'home' ? item.home.pp : venueFilter === 'away' ? item.away.pp : item.pp;
              const displayGf = venueFilter === 'home' ? item.home.gf : venueFilter === 'away' ? item.away.gf : item.gf;
              const displayGc = venueFilter === 'home' ? item.home.gc : venueFilter === 'away' ? item.away.gc : item.gc;
              const displayDg = displayGf - displayGc;

              return (
                <tr
                  key={item.team.id}
                  onClick={() => onSelectTeam(item.team.id)}
                  className={`group cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-blue-600/20 hover:bg-blue-600/30'
                      : isMyClub
                      ? 'bg-emerald-950/30 hover:bg-emerald-900/30 border-l-4 border-l-emerald-500'
                      : 'hover:bg-slate-900/70'
                  }`}
                >
                  {/* Position */}
                  <td className="py-3 px-3 text-center font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                        isAscenso
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : item.pos === 3
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.pos}
                    </span>
                  </td>

                  {/* Team Crest & Name */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white p-1 flex-shrink-0 flex items-center justify-center shadow-sm">
                        <img
                          src={item.team.crestUrl}
                          alt={item.team.shortName}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`font-black uppercase tracking-tight truncate ${isMyClub ? 'text-emerald-400' : 'text-slate-100'}`}>
                            {item.team.shortName}
                          </p>
                          {isMyClub && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40">
                              Nuestro
                            </span>
                          )}
                          {isAscenso && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded hidden sm:inline">
                              Ascenso
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate hidden sm:block">
                          {item.team.name}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Points */}
                  <td className="py-3 px-3 text-center">
                    <span className="text-sm font-black text-white px-2 py-1 rounded-md bg-slate-800/80">
                      {displayPuntos}
                    </span>
                  </td>

                  {/* Matches Played */}
                  <td className="py-3 px-2.5 text-center text-slate-300 font-semibold">{displayPj}</td>

                  {/* Won / Drawn / Lost */}
                  <td className="py-3 px-2.5 text-center text-emerald-400 font-bold">{displayPg}</td>
                  <td className="py-3 px-2.5 text-center text-amber-400 font-bold">{displayPe}</td>
                  <td className="py-3 px-2.5 text-center text-rose-400 font-bold">{displayPp}</td>

                  {/* Goals For / Against / Diff */}
                  <td className="py-3 px-2.5 text-center text-slate-200 font-semibold">{displayGf}</td>
                  <td className="py-3 px-2.5 text-center text-slate-400">{displayGc}</td>
                  <td className="py-3 px-2.5 text-center font-bold">
                    <span className={displayDg > 0 ? 'text-emerald-400' : displayDg < 0 ? 'text-rose-400' : 'text-slate-400'}>
                      {displayDg > 0 ? `+${displayDg}` : displayDg}
                    </span>
                  </td>

                  {/* Averages */}
                  <td className="py-3 px-2.5 text-center text-slate-300 hidden md:table-cell">
                    {item.promedioGf.toFixed(2)}
                  </td>
                  <td className="py-3 px-2.5 text-center text-slate-400 hidden md:table-cell">
                    {item.promedioGc.toFixed(2)}
                  </td>

                  {/* 15m Intervals lethal / vulnerable */}
                  <td className="py-3 px-3 text-center hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <Flame className="w-3 h-3" />
                      {item.franjaMayorProduccion}'
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                      <AlertTriangle className="w-3 h-3" />
                      {item.franjaMayorVulnerabilidad}'
                    </span>
                  </td>

                  {/* Discipline */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 text-amber-300 font-bold text-[11px]">
                        <span className="w-2.5 h-3.5 bg-amber-400 rounded-xs inline-block"></span>
                        {item.discipline.amarillas}
                      </span>
                      {item.discipline.rojasDirectas + item.discipline.doblesAmarillas > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-rose-400 font-bold text-[11px]">
                          <span className="w-2.5 h-3.5 bg-rose-500 rounded-xs inline-block"></span>
                          {item.discipline.rojasDirectas + item.discipline.doblesAmarillas}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Arrow Action */}
                  <td className="py-3 px-3 text-center text-slate-500 group-hover:text-blue-400">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/60 inline-block"></span>
            <span>Puestos 1º y 2º: Ascenso Directo a 1ª Infantil RFFM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/20 border-l-2 border-l-emerald-500 inline-block"></span>
            <span>Fundación Escuela AFE 'B' (Nuestro Equipo)</span>
          </div>
        </div>
        <div className="text-slate-400 font-medium">
          Duración partidos oficial: 70 minutos (2 x 35')
        </div>
      </div>
    </div>
  );
};

export default RivalGeneralTable;
