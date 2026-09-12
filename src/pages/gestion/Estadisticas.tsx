import React, { useState, useEffect } from 'react';
import { CLUB_TEAMS } from '@/types';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  Activity, 
  TrendingUp, 
  Users, 
  Award, 
  ShieldAlert,
  Clock,
  Zap,
  Shield,
  Target,
  Flag,
  AlertTriangle,
  ArrowUpDown,
  Download,
  Search,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TeamPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
}

interface MatchPlayerStat {
  playerId: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
  posicionActiva?: string;
  stats_por_posicion?: Record<string, any>;
  titular?: boolean;
  suplente?: boolean;
  minutos?: number;
  tarjetas_amarillas?: number;
  tarjetas_rojas?: number;
  goles_metidos?: number;
  asistencias?: number;
  goles_encajados?: number;
  perdidas_balon?: number;
  recuperaciones_balon?: number;
  corners_favor?: number;
  corners_contra?: number;
  faltas_favor?: number;
  faltas_contra?: number;
}

interface Match {
  id: string;
  rival: string;
  fecha: string;
  hora: string;
  tipo?: 'Local' | 'Visitante';
  competicion?: string;
  estado: string;
  goles_favor?: number;
  goles_contra?: number;
  estadisticas?: {
    jugadoras_stats?: MatchPlayerStat[];
    totales_equipo?: {
      recuperaciones_balon?: number;
      perdidas_balon?: number;
      corners_favor?: number;
      corners_contra?: number;
      faltas_favor?: number;
      faltas_contra?: number;
      goles_favor?: number;
      goles_contra?: number;
      asistencias?: number;
      tarjetas_amarillas?: number;
      tarjetas_rojas?: number;
    };
  };
}

interface AggregatedPlayerStat {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
  partidosJugados: number;
  titularidades: number;
  minutos: number;
  goles: number;
  asistencias: number;
  goles_encajados: number;
  recuperaciones: number;
  perdidas: number;
  balanceBalon: number;
  amarillas: number;
  rojas: number;
  corners_favor: number;
  corners_contra: number;
  faltas_favor: number;
  faltas_contra: number;
}

export default function Estadisticas() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [activeTab, setActiveTab] = useState<'resumen' | 'juego' | 'tabla' | 'asistencia'>('resumen');
  
  // Data states
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [positionData, setPositionData] = useState<any[]>([]);
  const [matchData, setMatchData] = useState<any[]>([]);
  const [matchStatsTimeline, setMatchStatsTimeline] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [sessionTrendData, setSessionTrendData] = useState<any[]>([]);
  const [playerAttendanceRank, setPlayerAttendanceRank] = useState<any[]>([]);
  const [playerMatchParticipationRank, setPlayerMatchParticipationRank] = useState<any[]>([]);
  
  // Custom derived states for full player stats
  const [playerMinutesData, setPlayerMinutesData] = useState<any[]>([]);
  const [goalscorers, setGoalscorers] = useState<AggregatedPlayerStat[]>([]);
  const [topAssists, setTopAssists] = useState<AggregatedPlayerStat[]>([]);
  const [topRecuperadoras, setTopRecuperadoras] = useState<AggregatedPlayerStat[]>([]);
  const [topPerdidas, setTopPerdidas] = useState<AggregatedPlayerStat[]>([]);
  const [cardsData, setCardsData] = useState<AggregatedPlayerStat[]>([]);
  const [goalkeepersConceded, setGoalkeepersConceded] = useState<AggregatedPlayerStat[]>([]);
  const [masterPlayerStats, setMasterPlayerStats] = useState<AggregatedPlayerStat[]>([]);

  // Table filter and sort states
  const [tableSearch, setTableSearch] = useState('');
  const [tablePositionFilter, setTablePositionFilter] = useState('TODAS');
  const [sortField, setSortField] = useState<keyof AggregatedPlayerStat>('goles');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [overallStats, setOverallStats] = useState({
    avgGoalsScored: 0,
    avgGoalsConceded: 0,
    totalGoalsScored: 0,
    totalGoalsConceded: 0,
    totalAsistencias: 0,
    totalRecuperaciones: 0,
    totalPerdidas: 0,
    totalCornersFavor: 0,
    totalCornersContra: 0,
    totalFaltasFavor: 0,
    totalFaltasContra: 0,
    totalAmarillas: 0,
    totalRojas: 0,
    attendanceRate: 0,
    totalGames: 0,
    matchParticipationRate: 0
  });

  const loadAllData = () => {
    // 1. Fetch Players
    const rosterKey = `team_roster_${selectedTeam}`;
    const savedRoster = localStorage.getItem(rosterKey);
    const playersList: TeamPlayer[] = savedRoster ? JSON.parse(savedRoster) : [];
    setTotalPlayers(playersList.length);

    // Derive position distribution
    const positions: Record<string, number> = {};
    playersList.forEach(p => {
      positions[p.posicion] = (positions[p.posicion] || 0) + 1;
    });
    const posChartData = Object.entries(positions).map(([name, value]) => ({ name, value }));
    setPositionData(posChartData);

    // 2. Fetch Matches
    const matchesKey = `team_matches_${selectedTeam}`;
    const savedMatches = localStorage.getItem(matchesKey);
    const matchesList: Match[] = savedMatches ? JSON.parse(savedMatches) : [];
    
    // Consider games that are Finalized or have stats recorded
    const gamesWithData = matchesList.filter(m => 
      m.estado === 'Finalizado' || 
      (m.estadisticas?.jugadoras_stats && m.estadisticas.jugadoras_stats.length > 0) ||
      (m.estadisticas?.totales_equipo && (m.estadisticas.totales_equipo.recuperaciones_balon || 0) > 0)
    );

    const goalsChartData = gamesWithData.map((m, i) => ({
      name: `P${i + 1} (${m.rival.substring(0, 6)})`,
      GolesFavor: m.goles_favor ?? (m.estadisticas?.totales_equipo?.goles_favor ?? 0),
      GolesContra: m.goles_contra ?? (m.estadisticas?.totales_equipo?.goles_contra ?? 0)
    })).reverse();
    setMatchData(goalsChartData);

    // Match stats timeline (Recuperaciones, Perdidas, Corners, Faltas)
    const statsTimelineData = gamesWithData.map((m, i) => {
      const stats = m.estadisticas?.jugadoras_stats || [];
      const rec = m.estadisticas?.totales_equipo?.recuperaciones_balon ?? stats.reduce((a, b) => a + (b.recuperaciones_balon || 0), 0);
      const per = m.estadisticas?.totales_equipo?.perdidas_balon ?? stats.reduce((a, b) => a + (b.perdidas_balon || 0), 0);
      const cf = m.estadisticas?.totales_equipo?.corners_favor ?? stats.reduce((a, b) => a + (b.corners_favor || 0), 0);
      const cc = m.estadisticas?.totales_equipo?.corners_contra ?? stats.reduce((a, b) => a + (b.corners_contra || 0), 0);
      const ff = m.estadisticas?.totales_equipo?.faltas_favor ?? stats.reduce((a, b) => a + (b.faltas_favor || 0), 0);
      const fc = m.estadisticas?.totales_equipo?.faltas_contra ?? stats.reduce((a, b) => a + (b.faltas_contra || 0), 0);

      return {
        name: `P${i + 1} (${m.rival.substring(0, 5)})`,
        Recuperaciones: rec,
        Perdidas: per,
        CornersFavor: cf,
        CornersContra: cc,
        FaltasFavor: ff,
        FaltasContra: fc
      };
    }).reverse();
    setMatchStatsTimeline(statsTimelineData);

    // Accumulate player-specific detailed stats
    const accumulatedStats: Record<string, AggregatedPlayerStat> = {};

    // Initialize with all current roster players
    playersList.forEach(p => {
      accumulatedStats[p.id] = {
        id: p.id,
        nombre: p.nombre,
        apellidos: p.apellidos,
        dorsal: p.dorsal,
        posicion: p.posicion,
        partidosJugados: 0,
        titularidades: 0,
        minutos: 0,
        goles: 0,
        asistencias: 0,
        goles_encajados: 0,
        recuperaciones: 0,
        perdidas: 0,
        balanceBalon: 0,
        amarillas: 0,
        rojas: 0,
        corners_favor: 0,
        corners_contra: 0,
        faltas_favor: 0,
        faltas_contra: 0
      };
    });

    let teamRecuperaciones = 0;
    let teamPerdidas = 0;
    let teamCornersFavor = 0;
    let teamCornersContra = 0;
    let teamFaltasFavor = 0;
    let teamFaltasContra = 0;
    let teamAmarillas = 0;
    let teamRojas = 0;
    let teamAsistencias = 0;
    let totalGoalsScored = 0;
    let totalGoalsConceded = 0;

    // Populate from finished match stats
    gamesWithData.forEach(m => {
      const matchGolesF = m.goles_favor ?? (m.estadisticas?.totales_equipo?.goles_favor ?? 0);
      const matchGolesC = m.goles_contra ?? (m.estadisticas?.totales_equipo?.goles_contra ?? 0);
      totalGoalsScored += matchGolesF;
      totalGoalsConceded += matchGolesC;

      const teamTotals = m.estadisticas?.totales_equipo;
      if (teamTotals) {
        teamRecuperaciones += teamTotals.recuperaciones_balon || 0;
        teamPerdidas += teamTotals.perdidas_balon || 0;
        teamCornersFavor += teamTotals.corners_favor || 0;
        teamCornersContra += teamTotals.corners_contra || 0;
        teamFaltasFavor += teamTotals.faltas_favor || 0;
        teamFaltasContra += teamTotals.faltas_contra || 0;
        teamAmarillas += teamTotals.tarjetas_amarillas || 0;
        teamRojas += teamTotals.tarjetas_rojas || 0;
        teamAsistencias += teamTotals.asistencias || 0;
      }

      const stats = m.estadisticas?.jugadoras_stats;
      if (stats && Array.isArray(stats)) {
        stats.forEach((st: MatchPlayerStat) => {
          if (!accumulatedStats[st.playerId]) {
            accumulatedStats[st.playerId] = {
              id: st.playerId,
              nombre: st.nombre || 'Jugadora',
              apellidos: st.apellidos || '',
              dorsal: st.dorsal || '',
              posicion: st.posicion || 'Campo',
              partidosJugados: 0,
              titularidades: 0,
              minutos: 0,
              goles: 0,
              asistencias: 0,
              goles_encajados: 0,
              recuperaciones: 0,
              perdidas: 0,
              balanceBalon: 0,
              amarillas: 0,
              rojas: 0,
              corners_favor: 0,
              corners_contra: 0,
              faltas_favor: 0,
              faltas_contra: 0
            };
          }

          const pStat = accumulatedStats[st.playerId];
          if ((st.minutos && st.minutos > 0) || st.titular || st.suplente) {
            pStat.partidosJugados += 1;
          }
          if (st.titular) {
            pStat.titularidades += 1;
          }
          pStat.minutos += st.minutos || 0;
          pStat.goles += st.goles_metidos || 0;
          pStat.asistencias += st.asistencias || 0;
          pStat.goles_encajados += st.goles_encajados || 0;
          pStat.recuperaciones += st.recuperaciones_balon || 0;
          pStat.perdidas += st.perdidas_balon || 0;
          pStat.balanceBalon = pStat.recuperaciones - pStat.perdidas;
          pStat.amarillas += st.tarjetas_amarillas || 0;
          pStat.rojas += st.tarjetas_rojas || 0;
          pStat.corners_favor += st.corners_favor || 0;
          pStat.corners_contra += st.corners_contra || 0;
          pStat.faltas_favor += st.faltas_favor || 0;
          pStat.faltas_contra += st.faltas_contra || 0;
        });
      }
    });

    const accumulatedList = Object.values(accumulatedStats);
    setMasterPlayerStats(accumulatedList);

    // Filter, sort and map for minutes played chart
    const minChartData = accumulatedList
      .map(p => ({
        name: p.nombre,
        Minutos: p.minutos
      }))
      .sort((a, b) => b.Minutos - a.Minutos);
    setPlayerMinutesData(minChartData);

    // Rankings
    setGoalscorers(accumulatedList.filter(p => p.goles > 0).sort((a, b) => b.goles - a.goles));
    setTopAssists(accumulatedList.filter(p => p.asistencias > 0).sort((a, b) => b.asistencias - a.asistencias));
    setTopRecuperadoras(accumulatedList.filter(p => p.recuperaciones > 0).sort((a, b) => b.recuperaciones - a.recuperaciones));
    setTopPerdidas(accumulatedList.filter(p => p.perdidas > 0).sort((a, b) => b.perdidas - a.perdidas));
    setCardsData(accumulatedList.filter(p => p.amarillas > 0 || p.rojas > 0).sort((a, b) => (b.amarillas + b.rojas * 2) - (a.amarillas + a.rojas * 2)));
    setGoalkeepersConceded(accumulatedList.filter(p => p.posicion === 'PORTERO').sort((a, b) => a.goles_encajados - b.goles_encajados));
    
    // 3. Fetch Sessions (Attendance)
    const sessionsKey = `team_sessions_${selectedTeam}`;
    const savedSessions = localStorage.getItem(sessionsKey);
    const sessionsList: any[] = savedSessions ? JSON.parse(savedSessions) : [];

    let totalAttendanceRecords = 0;
    let presentRecords = 0;
    const statusCounts: Record<string, number> = {
      Presente: 0,
      Retraso: 0,
      'No Justificó': 0,
      Justificado: 0,
      Lesionado: 0
    };

    sessionsList.forEach(s => {
      s.records?.forEach((r: any) => {
        totalAttendanceRecords++;
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        if (r.status === 'Presente' || r.status === 'Retraso') {
          presentRecords++;
        }
      });
    });

    const attChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    setAttendanceData(attChartData);

    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
      : 0;

    // Attendance Trend by session
    const trend = sessionsList
      .map((s: any) => {
        const total = s.records?.length || 0;
        const present = s.records?.filter((r: any) => r.status === 'Presente' || r.status === 'Retraso').length || 0;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        return {
          fecha: s.fecha ? s.fecha.split('-').slice(1).join('/') : '',
          Asistencia: rate,
          tipo: s.tipo
        };
      })
      .reverse();
    setSessionTrendData(trend);

    // Player attendance rankings
    const playerAttendanceMap: Record<string, { nombre: string; total: number; present: number }> = {};
    playersList.forEach(p => {
      playerAttendanceMap[p.id] = { nombre: p.nombre + ' ' + (p.apellidos ? p.apellidos.substring(0, 1) + '.' : ''), total: 0, present: 0 };
    });
    sessionsList.forEach((s: any) => {
      s.records?.forEach((r: any) => {
        if (playerAttendanceMap[r.playerId]) {
          playerAttendanceMap[r.playerId].total += 1;
          if (r.status === 'Presente' || r.status === 'Retraso') {
            playerAttendanceMap[r.playerId].present += 1;
          }
        }
      });
    });
    const playerAttendanceRankList = Object.values(playerAttendanceMap)
      .map(st => ({
        name: st.nombre,
        Asistencia: st.total > 0 ? Math.round((st.present / st.total) * 100) : 0
      }))
      .sort((a, b) => b.Asistencia - a.Asistencia);
    setPlayerAttendanceRank(playerAttendanceRankList);

    // Match participation ranking
    const matchParticipationMap: Record<string, { nombre: string; total: number; played: number }> = {};
    playersList.forEach(p => {
      matchParticipationMap[p.id] = { nombre: p.nombre + ' ' + (p.apellidos ? p.apellidos.substring(0, 1) + '.' : ''), total: gamesWithData.length, played: 0 };
    });

    gamesWithData.forEach(m => {
      const stats = m.estadisticas?.jugadoras_stats;
      if (stats && Array.isArray(stats)) {
        stats.forEach((st: any) => {
          if (matchParticipationMap[st.playerId]) {
            if ((st.minutos && st.minutos > 0) || st.titular || st.suplente) {
              matchParticipationMap[st.playerId].played += 1;
            }
          }
        });
      }
    });

    const playerMatchRankList = Object.values(matchParticipationMap)
      .map(st => ({
        name: st.nombre,
        Participacion: st.total > 0 ? Math.round((st.played / st.total) * 100) : 0
      }))
      .sort((a, b) => b.Participacion - a.Participacion);
    setPlayerMatchParticipationRank(playerMatchRankList);

    const sumMatchPart = playerMatchRankList.reduce((acc, curr) => acc + curr.Participacion, 0);
    const avgMatchParticipation = playerMatchRankList.length > 0 ? Math.round(sumMatchPart / playerMatchRankList.length) : 0;

    setOverallStats({
      avgGoalsScored: gamesWithData.length > 0 ? parseFloat((totalGoalsScored / gamesWithData.length).toFixed(1)) : 0,
      avgGoalsConceded: gamesWithData.length > 0 ? parseFloat((totalGoalsConceded / gamesWithData.length).toFixed(1)) : 0,
      totalGoalsScored,
      totalGoalsConceded,
      totalAsistencias: teamAsistencias,
      totalRecuperaciones: teamRecuperaciones,
      totalPerdidas: teamPerdidas,
      totalCornersFavor: teamCornersFavor,
      totalCornersContra: teamCornersContra,
      totalFaltasFavor: teamFaltasFavor,
      totalFaltasContra: teamFaltasContra,
      totalAmarillas: teamAmarillas,
      totalRojas: teamRojas,
      attendanceRate,
      totalGames: gamesWithData.length,
      matchParticipationRate: avgMatchParticipation
    });
  };

  useEffect(() => {
    loadAllData();

    const handleUpdate = () => {
      loadAllData();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('lapoveda_matches_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('lapoveda_matches_updated', handleUpdate);
    };
  }, [selectedTeam]);

  // Export table to CSV
  const handleExportCSV = () => {
    if (masterPlayerStats.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = ['Dorsal', 'Nombre', 'Apellidos', 'Posición', 'PJ', 'Titular', 'Minutos', 'Goles F', 'Asistencias', 'Goles C', 'Recuperaciones', 'Pérdidas', 'Balance', 'Amarillas', 'Rojas', 'Córners F', 'Córners C', 'Faltas F', 'Faltas C'];
    const rows = masterPlayerStats.map(p => [
      p.dorsal || '',
      `"${p.nombre}"`,
      `"${p.apellidos}"`,
      p.posicion,
      p.partidosJugados,
      p.titularidades,
      p.minutos,
      p.goles,
      p.asistencias,
      p.goles_encajados,
      p.recuperaciones,
      p.perdidas,
      p.balanceBalon,
      p.amarillas,
      p.rojas,
      p.corners_favor,
      p.corners_contra,
      p.faltas_favor,
      p.faltas_contra
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `estadisticas_${selectedTeam.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Estadísticas exportadas a CSV con éxito');
  };

  // Sort handler
  const handleSort = (field: keyof AggregatedPlayerStat) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filtered & Sorted master table
  const filteredAndSortedPlayers = masterPlayerStats
    .filter(p => {
      const matchSearch = `${p.nombre} ${p.apellidos} ${p.dorsal}`.toLowerCase().includes(tableSearch.toLowerCase());
      const matchPos = tablePositionFilter === 'TODAS' || p.posicion === tablePositionFilter;
      return matchSearch && matchPos;
    })
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#a855f7', '#6366f1'];

  return (
    <div className="space-y-6">
      {/* Top Header & Team Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-3xl shadow-xl">
        <div className="w-full sm:w-auto flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Equipo Activo</label>
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-slate-950 text-white font-bold text-sm border border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
          >
            {CLUB_TEAMS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'resumen'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Resumen & KPIs</span>
          </button>

          <button
            onClick={() => setActiveTab('juego')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'juego'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-200" />
            <span>Juego & Acciones</span>
          </button>

          <button
            onClick={() => setActiveTab('tabla')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tabla'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tabla de Jugadoras</span>
          </button>

          <button
            onClick={() => setActiveTab('asistencia')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'asistencia'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Asistencias</span>
          </button>
        </div>
      </div>

      {/* KPI Stats blocks (Always visible highlights) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* KPI 1: Goles Favor */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Goles a Favor</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-emerald-400">{overallStats.totalGoalsScored}</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">{overallStats.avgGoalsScored} por partido</p>
          </div>
        </div>

        {/* KPI 2: Goles Contra */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Goles en Contra</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-red-400">{overallStats.totalGoalsConceded}</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">{overallStats.avgGoalsConceded} por partido</p>
          </div>
        </div>

        {/* KPI 3: Recuperaciones */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Recuperaciones</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-cyan-300">{overallStats.totalRecuperaciones}</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Balones robados</p>
          </div>
        </div>

        {/* KPI 4: Pérdidas */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Pérdidas Balón</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-amber-300">{overallStats.totalPerdidas}</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Total entregas perdidas</p>
          </div>
        </div>

        {/* KPI 5: Córners Favor / Contra */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Córners (F / C)</span>
            <Flag className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-xl font-black text-white">
              <span className="text-blue-400">{overallStats.totalCornersFavor}</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-red-400">{overallStats.totalCornersContra}</span>
            </h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Saques de esquina</p>
          </div>
        </div>

        {/* KPI 6: Faltas Prov / Com */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Faltas (F / C)</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h4 className="text-xl font-black text-white">
              <span className="text-purple-400">{overallStats.totalFaltasFavor}</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-amber-400">{overallStats.totalFaltasContra}</span>
            </h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Provocadas / Cometidas</p>
          </div>
        </div>
      </div>

      {/* TAB 1: RESUMEN GENERAL & KPIS */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Performance Timeline Goals */}
          <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
            <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span>Goles a Favor vs Contra (Evolución)</span>
            </h5>

            <div className="h-72 w-full text-xs">
              {matchData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={matchData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    <Legend />
                    <Line type="monotone" dataKey="GolesFavor" stroke="#10b981" activeDot={{ r: 8 }} name="Goles Favor" strokeWidth={3} />
                    <Line type="monotone" dataKey="GolesContra" stroke="#ef4444" name="Goles Contra" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase">
                  Registra estadísticas de partidos para ver la evolución
                </div>
              )}
            </div>
          </div>

          {/* Chart: Minutos Jugados */}
          <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
            <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Minutos Jugados por Jugadora</span>
            </h5>

            <div className="h-72 w-full text-xs">
              {playerMinutesData.some(p => p.Minutos > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={playerMinutesData.filter(p => p.Minutos > 0).slice(0, 10)} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" angle={-15} textAnchor="end" interval={0} />
                    <YAxis stroke="#64748b" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    <Bar dataKey="Minutos" fill="#10b981" radius={[8, 8, 0, 0]} name="Minutos" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase text-center p-4">
                  No hay registros de minutos jugados aún
                </div>
              )}
            </div>
          </div>

          {/* Ranking Goleadoras */}
          <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
            <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Ranking de Goleadoras</span>
            </h5>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {goalscorers.length > 0 ? (
                goalscorers.map((p, index) => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full font-black text-[10px] ${
                        index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-400/30' :
                        index === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-800/30' :
                        'bg-slate-900 text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white text-xs block">{p.nombre} {p.apellidos}</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Dorsal {p.dorsal} • {p.posicion}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400">{p.goles}</span>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase block">Goles</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-600 italic text-center py-8">No se han registrado goles aún.</p>
              )}
            </div>
          </div>

          {/* Ranking Asistencias */}
          <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
            <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Máximas Asistentes de Gol</span>
            </h5>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {topAssists.length > 0 ? (
                topAssists.map((p, index) => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full font-black text-[10px] ${
                        index === 0 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                        index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-400/30' :
                        index === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-800/30' :
                        'bg-slate-900 text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white text-xs block">{p.nombre} {p.apellidos}</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Dorsal {p.dorsal} • {p.posicion}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-cyan-400">{p.asistencias}</span>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase block">Asistencias</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-600 italic text-center py-8">No se han registrado asistencias aún.</p>
              )}
            </div>
          </div>

          {/* Tarjetas & Disciplina */}
          <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
            <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>Control Disciplinario y Tarjetas</span>
            </h5>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {cardsData.length > 0 ? (
                cardsData.map((p) => {
                  const hasSuspensionWarning = p.amarillas >= 4;
                  return (
                    <div 
                      key={p.id} 
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        hasSuspensionWarning 
                          ? 'bg-red-500/10 border-red-500/40 text-white' 
                          : 'bg-slate-950/40 border-slate-850'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-white text-xs block uppercase">{p.nombre} {p.apellidos}</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Dorsal {p.dorsal} • {p.posicion}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-3.5 bg-amber-400 rounded-sm inline-block shadow-sm" />
                          <span className="text-xs font-black text-white">{p.amarillas}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-3.5 bg-red-600 rounded-sm inline-block shadow-sm" />
                          <span className="text-xs font-black text-white">{p.rojas}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-600 italic text-center py-8">No se han registrado tarjetas.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: JUEGO & ACCIONES TÁCTICAS (Recuperaciones, Pérdidas, Córners, Faltas) */}
      {activeTab === 'juego' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart: Recuperaciones vs Pérdidas Evolución */}
            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
              <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Balance de Posesión: Recuperaciones vs Pérdidas</span>
              </h5>

              <div className="h-72 w-full text-xs">
                {matchStatsTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={matchStatsTimeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Legend />
                      <Bar dataKey="Recuperaciones" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Recuperaciones" />
                      <Bar dataKey="Perdidas" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Pérdidas" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase text-center p-4">
                    Registra estadísticas de recuperaciones y pérdidas en la sección de Partidos
                  </div>
                )}
              </div>
            </div>

            {/* Chart: Córners y Faltas */}
            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
              <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Flag className="w-4 h-4 text-blue-400" />
                <span>Evolución Córners y Faltas</span>
              </h5>

              <div className="h-72 w-full text-xs">
                {matchStatsTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={matchStatsTimeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Legend />
                      <Line type="monotone" dataKey="CornersFavor" stroke="#3b82f6" strokeWidth={2.5} name="Córners Favor" />
                      <Line type="monotone" dataKey="CornersContra" stroke="#ef4444" strokeWidth={2} name="Córners Contra" />
                      <Line type="monotone" dataKey="FaltasFavor" stroke="#a855f7" strokeWidth={2} name="Faltas Favor" />
                      <Line type="monotone" dataKey="FaltasContra" stroke="#eab308" strokeWidth={2} name="Faltas Contra" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase text-center p-4">
                    Registra córners y faltas en cada partido
                  </div>
                )}
              </div>
            </div>

            {/* Ranking Top Recuperadoras */}
            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
              <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Top Recuperadoras de Balón</span>
              </h5>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {topRecuperadoras.length > 0 ? (
                  topRecuperadoras.slice(0, 8).map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full font-black text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white text-xs block">{p.nombre} {p.apellidos}</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Dorsal {p.dorsal} • {p.posicion}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-cyan-400">{p.recuperaciones}</span>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase block">Balones Robados</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-600 italic text-center py-8">No hay recuperaciones registradas aún.</p>
                )}
              </div>
            </div>

            {/* Ranking Pérdidas de Balón */}
            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
              <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Control de Pérdidas de Balón</span>
              </h5>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {topPerdidas.length > 0 ? (
                  topPerdidas.slice(0, 8).map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full font-black text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white text-xs block">{p.nombre} {p.apellidos}</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Dorsal {p.dorsal} • {p.posicion}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-amber-400">{p.perdidas}</span>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase block">Pérdidas</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-600 italic text-center py-8">No hay pérdidas de balón registradas aún.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: TABLA MAESTRA DE JUGADORAS (All 10 statistics in single sortable matrix) */}
      {activeTab === 'tabla' && (
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h5 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-indigo-400" />
                <span>Matriz Detallada de Estadísticas de Jugadoras</span>
              </h5>
              <p className="text-xs text-slate-400">
                Haz clic en cualquier columna para ordenar ascendentemente o descendentemente
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Search input */}
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar jugadora..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="bg-slate-950 text-white text-xs rounded-xl pl-8 pr-3 py-2 border border-slate-800 w-full focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Position Filter */}
              <select
                value={tablePositionFilter}
                onChange={(e) => setTablePositionFilter(e.target.value)}
                className="bg-slate-950 text-white text-xs rounded-xl px-3 py-2 border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="TODAS">Todas las Posiciones</option>
                <option value="PORTERO">Porteras</option>
                <option value="DEFENSA">Defensas</option>
                <option value="MEDIO">Centrocampistas</option>
                <option value="DELANTERO">Delanteras</option>
              </select>

              {/* Export CSV Button */}
              <Button
                onClick={handleExportCSV}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/90 text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                  <th onClick={() => handleSort('dorsal')} className="p-3 cursor-pointer hover:text-white">
                    <div className="flex items-center gap-1">
                      <span>Dorsal</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('nombre')} className="p-3 cursor-pointer hover:text-white">
                    <div className="flex items-center gap-1">
                      <span>Jugadora</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('posicion')} className="p-3 cursor-pointer hover:text-white">
                    <div className="flex items-center gap-1">
                      <span>Posición</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('partidosJugados')} className="p-3 text-center cursor-pointer hover:text-white">
                    <div className="flex items-center justify-center gap-1">
                      <span>PJ</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('minutos')} className="p-3 text-center cursor-pointer hover:text-white">
                    <div className="flex items-center justify-center gap-1">
                      <span>Min</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('goles')} className="p-3 text-center cursor-pointer text-emerald-400 hover:text-emerald-300">
                    <div className="flex items-center justify-center gap-1">
                      <span>Gol F</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('asistencias')} className="p-3 text-center cursor-pointer text-cyan-400 hover:text-cyan-300">
                    <div className="flex items-center justify-center gap-1">
                      <span>Asist</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('goles_encajados')} className="p-3 text-center cursor-pointer text-red-400 hover:text-red-300">
                    <div className="flex items-center justify-center gap-1">
                      <span>Gol C</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('recuperaciones')} className="p-3 text-center cursor-pointer text-cyan-400 hover:text-cyan-300">
                    <div className="flex items-center justify-center gap-1">
                      <span>Recup</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('perdidas')} className="p-3 text-center cursor-pointer text-amber-400 hover:text-amber-300">
                    <div className="flex items-center justify-center gap-1">
                      <span>Pérd</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('balanceBalon')} className="p-3 text-center cursor-pointer hover:text-white">
                    <div className="flex items-center justify-center gap-1">
                      <span>Balance</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('corners_favor')} className="p-3 text-center cursor-pointer text-blue-400 hover:text-blue-300">
                    <div className="flex items-center justify-center gap-1">
                      <span>Córner F/C</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('faltas_favor')} className="p-3 text-center cursor-pointer text-purple-400 hover:text-purple-300">
                    <div className="flex items-center justify-center gap-1">
                      <span>Faltas F/C</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('amarillas')} className="p-3 text-center cursor-pointer hover:text-white">
                    <div className="flex items-center justify-center gap-1">
                      <span>Tarj (A/R)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredAndSortedPlayers.length > 0 ? (
                  filteredAndSortedPlayers.map((p) => {
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-extrabold text-slate-300">#{p.dorsal || '-'}</td>
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          {p.nombre} {p.apellidos}
                        </td>
                        <td className="p-3">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                            p.posicion === 'PORTERO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            p.posicion === 'DEFENSA' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            p.posicion === 'MEDIO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {p.posicion}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-300">{p.partidosJugados}</td>
                        <td className="p-3 text-center font-bold text-slate-300">{p.minutos}'</td>
                        <td className="p-3 text-center font-black text-emerald-400">{p.goles}</td>
                        <td className="p-3 text-center font-black text-cyan-400">{p.asistencias}</td>
                        <td className="p-3 text-center font-black text-red-400">{p.goles_encajados}</td>
                        <td className="p-3 text-center font-black text-cyan-400">{p.recuperaciones}</td>
                        <td className="p-3 text-center font-black text-amber-400">{p.perdidas}</td>
                        <td className="p-3 text-center font-black">
                          <span className={p.balanceBalon > 0 ? 'text-cyan-400' : p.balanceBalon < 0 ? 'text-amber-400' : 'text-slate-400'}>
                            {p.balanceBalon > 0 ? `+${p.balanceBalon}` : p.balanceBalon}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-300">
                          <span className="text-blue-400">{p.corners_favor}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-red-400">{p.corners_contra}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-300">
                          <span className="text-purple-400">{p.faltas_favor}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-amber-400">{p.faltas_contra}</span>
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span className="text-amber-400">{p.amarillas}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-red-500">{p.rojas}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-slate-500 italic">
                      No se encontraron jugadoras que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ASISTENCIA A ENTRENAMIENTOS */}
      {activeTab === 'asistencia' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 2: Attendance breakdown pie chart */}
          <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
            <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Distribución de Asistencia a Entrenamientos</span>
            </h5>

            <div className="h-72 w-full flex flex-col sm:flex-row items-center justify-center text-xs">
              {overallStats.attendanceRate > 0 ? (
                <>
                  <div className="w-full sm:w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendanceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {attendanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="w-full sm:w-1/2 space-y-2 px-4">
                    {attendanceData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-slate-400 font-semibold">{entry.name}</span>
                        </div>
                        <span className="font-bold text-white">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase">
                  Registra asistencia diaria para graficar
                </div>
              )}
            </div>
          </div>

          {/* Tendencia de Asistencia por Sesión */}
          <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
            <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span>Tendencia de Asistencia (% por Sesión)</span>
            </h5>

            <div className="h-72 w-full text-xs">
              {sessionTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sessionTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="fecha" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    <Line type="monotone" dataKey="Asistencia" stroke="#a855f7" strokeWidth={3} activeDot={{ r: 8 }} name="Asistencia %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase text-center p-4">
                  Registra sesiones para ver la tendencia histórica
                </div>
              )}
            </div>
          </div>

          {/* Ranking Asistencia Jugadoras */}
          <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4 lg:col-span-2">
            <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Asistencia a Entrenamientos por Jugadora (%)</span>
            </h5>

            <div className="h-72 w-full text-xs">
              {playerAttendanceRank.some(p => p.Asistencia > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={playerAttendanceRank.slice(0, 15)} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" angle={-15} textAnchor="end" interval={0} />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    <Bar dataKey="Asistencia" fill="#10b981" radius={[8, 8, 0, 0]} name="Asistencia Entrenos %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase text-center p-4">
                  No hay registros de asistencia.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
