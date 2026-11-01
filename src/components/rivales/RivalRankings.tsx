import React from 'react';
import { TeamCollectiveStats } from '@/types/rivals';
import { 
  Flame, 
  ShieldCheck, 
  Zap, 
  Smile, 
  TrendingUp, 
  Award,
  ChevronRight
} from 'lucide-react';

interface RivalRankingsProps {
  stats: TeamCollectiveStats[];
  onSelectTeam: (teamId: string) => void;
}

export const RivalRankings: React.FC<RivalRankingsProps> = ({ stats, onSelectTeam }) => {
  // 1. Top Ataque (Most GF, then best average)
  const topAtaque = [...stats].sort((a, b) => b.gf - a.gf || b.promedioGf - a.promedioGf).slice(0, 5);

  // 2. Top Defensa / Muralla (Least GC, then most clean sheets)
  const topDefensa = [...stats].sort((a, b) => a.gc - b.gc || b.porteriasCero - a.porteriasCero).slice(0, 5);

  // 3. Eficacia de Puntos (% puntos sobre disputados)
  const topEficacia = [...stats].map(s => {
    const maxPuntos = s.pj * 3;
    const eficacia = maxPuntos > 0 ? (s.puntos / maxPuntos) * 100 : 0;
    return { ...s, eficacia };
  }).sort((a, b) => b.eficacia - a.eficacia || b.dg - a.dg).slice(0, 5);

  // 4. Fair Play Colectivo (Lowest card penalty points)
  const topFairPlay = [...stats].sort((a, b) => a.discipline.puntosFairPlay - b.discipline.puntosFairPlay).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            Rankings Colectivos Destacados • Grupo 50
          </h3>
          <p className="text-xs text-slate-400">
            Comparativa de los mejores registros en ataque, solidez defensiva, efectividad y deportividad.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Top Ataque */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Flame className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Potencia Ofensiva</h4>
              </div>
              <span className="text-[10px] font-bold uppercase text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
                Goles / PJ
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {topAtaque.map((item, idx) => (
                <div
                  key={item.team.id}
                  onClick={() => onSelectTeam(item.team.id)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                    item.team.isMyTeam
                      ? 'bg-emerald-950/40 border border-emerald-500/40'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center text-xs font-black text-slate-400">
                      {idx + 1}º
                    </span>
                    <img
                      src={item.team.crestUrl}
                      alt={item.team.shortName}
                      className="w-5 h-5 object-contain rounded bg-white p-0.5 flex-shrink-0"
                    />
                    <span className={`text-xs font-bold truncate ${item.team.isMyTeam ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {item.team.shortName}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black text-white">{item.gf} GF</span>
                    <span className="text-[10px] text-slate-500 block">({item.promedioGf.toFixed(1)}/p)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Máx: {topAtaque[0]?.gf} goles ({topAtaque[0]?.team.shortName})</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </div>
        </div>

        {/* Card 2: Muralla Defensiva */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Muralla Defensiva</h4>
              </div>
              <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                Menos GC
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {topDefensa.map((item, idx) => (
                <div
                  key={item.team.id}
                  onClick={() => onSelectTeam(item.team.id)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                    item.team.isMyTeam
                      ? 'bg-emerald-950/40 border border-emerald-500/40'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center text-xs font-black text-slate-400">
                      {idx + 1}º
                    </span>
                    <img
                      src={item.team.crestUrl}
                      alt={item.team.shortName}
                      className="w-5 h-5 object-contain rounded bg-white p-0.5 flex-shrink-0"
                    />
                    <span className={`text-xs font-bold truncate ${item.team.isMyTeam ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {item.team.shortName}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black text-emerald-400">{item.gc} GC</span>
                    <span className="text-[10px] text-slate-500 block">{item.porteriasCero} port. 0</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Mín: {topDefensa[0]?.gc} goles encajados</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </div>
        </div>

        {/* Card 3: Eficacia de Puntos */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Eficacia Puntos</h4>
              </div>
              <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                % Rendimiento
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {topEficacia.map((item, idx) => (
                <div
                  key={item.team.id}
                  onClick={() => onSelectTeam(item.team.id)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                    item.team.isMyTeam
                      ? 'bg-emerald-950/40 border border-emerald-500/40'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center text-xs font-black text-slate-400">
                      {idx + 1}º
                    </span>
                    <img
                      src={item.team.crestUrl}
                      alt={item.team.shortName}
                      className="w-5 h-5 object-contain rounded bg-white p-0.5 flex-shrink-0"
                    />
                    <span className={`text-xs font-bold truncate ${item.team.isMyTeam ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {item.team.shortName}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black text-white">{item.eficacia.toFixed(0)}%</span>
                    <span className="text-[10px] text-slate-500 block">{item.puntos} de {item.pj * 3} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between items-center">
            <span>2 equipos con 100% efectividad</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </div>
        </div>

        {/* Card 4: Fair Play Colectivo */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Smile className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Fair Play Colectivo</h4>
              </div>
              <span className="text-[10px] font-bold uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                Deportividad
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {topFairPlay.map((item, idx) => (
                <div
                  key={item.team.id}
                  onClick={() => onSelectTeam(item.team.id)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                    item.team.isMyTeam
                      ? 'bg-emerald-950/40 border border-emerald-500/40'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center text-xs font-black text-slate-400">
                      {idx + 1}º
                    </span>
                    <img
                      src={item.team.crestUrl}
                      alt={item.team.shortName}
                      className="w-5 h-5 object-contain rounded bg-white p-0.5 flex-shrink-0"
                    />
                    <span className={`text-xs font-bold truncate ${item.team.isMyTeam ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {item.team.shortName}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black text-purple-300">{item.discipline.puntosFairPlay} pts</span>
                    <span className="text-[10px] text-slate-500 block">{item.discipline.totalTarjetas} tarjetas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Criterio: 1 pt amarilla, 3 doble, 5 roja</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default RivalRankings;
