import React from 'react';
import { ShieldCheck, ExternalLink, RefreshCw, AlertCircle, Calendar, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RivalAttributionBannerProps {
  onRefresh?: () => void;
  onOpenSyncModal?: () => void;
  dataVersion?: number;
}

export const RivalAttributionBanner: React.FC<RivalAttributionBannerProps> = ({
  onRefresh,
  onOpenSyncModal,
  dataVersion
}) => {
  const activeJornada = typeof window !== 'undefined' ? (Number(localStorage.getItem('rffm_g50_synced_jornadas')) || 4) : 4;
  const lastSyncTime = typeof window !== 'undefined' ? (localStorage.getItem('rffm_g50_last_sync_time') || '') : '';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Attribution & Official Source */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                RFFM OFICIAL • 2ª INFANTIL GRUPO 50
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Temporada 2026-2027
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Privacidad: Estadísticas Colectivas 100%
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight mt-1">
              Estadísticas Colectivas de Rivales • Competición 26738324 / Grupo 27306559
            </h2>
            <p className="text-xs text-slate-400">
              Fuente de datos oficial:{' '}
              <a
                href={`https://www.rffm.es/competicion/resultados-y-jornadas?temporada=22&competicion=26738324&grupo=27306559&jornada=${activeJornada}&tipojuego=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-medium inline-flex items-center gap-1 ml-0.5"
              >
                Real Federación de Fútbol de Madrid (rffm.es)
                <ExternalLink className="w-3 h-3 inline" />
              </a>
              {' '}• Última sincronización federativa:{' '}
              <span className="text-slate-200 font-semibold">
                {activeJornada >= 5 
                  ? `Jornada ${activeJornada} cerrada y oficial (RFFM al día)${lastSyncTime ? ` • ${lastSyncTime}` : ''}`
                  : 'Jornada 4 cerrada / Jornada 5 disponible para sincronizar'}
              </span>.
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenSyncModal && (
            <Button
              onClick={onOpenSyncModal}
              variant="outline"
              size="sm"
              className="border-slate-800 hover:bg-slate-800/80 text-slate-300 hover:text-white text-xs font-semibold rounded-xl gap-1.5 h-9"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Gestión de Datos</span>
            </Button>
          )}

          <a
            href="https://www.rffm.es/competicion/resultados-y-jornadas?temporada=22&competicion=26738324&grupo=27306559&jornada=4&tipojuego=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 h-9 rounded-xl transition-colors shadow-md shadow-blue-900/30"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Web RFFM</span>
          </a>
        </div>
      </div>

      {/* Compliance / Methodology Notice */}
      <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-2.5 px-3 flex items-center gap-2.5 text-[11px] text-slate-400">
        <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <p className="leading-tight">
          <strong className="text-slate-200 font-semibold">Alcance y Protección de Datos:</strong> Todas las métricas mostradas corresponden exclusivamente al rendimiento grupal de los equipos. No se recogen, almacenan ni publican nombres, dorsales ni eventos individuales de menores. Los tiempos de juego corresponden a partidos oficiales de 70 minutos (2 partes de 35 min).
        </p>
      </div>
    </div>
  );
};

export default RivalAttributionBanner;
