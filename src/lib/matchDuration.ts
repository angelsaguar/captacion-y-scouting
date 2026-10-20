export interface MatchDurationConfig {
  totalMinutes: number;
  halfMinutes: number;
  categoryName: string;
  partsLabel: string;
}

/**
 * Returns the official match duration in minutes based on category/team:
 * - Infantil (Infantil A, B, C): 70 minutos (2 partes de 35 minutos)
 * - Cadete (Cadete A, B): 80 minutos (2 partes de 40 minutos)
 * - Juvenil y Senior (Juvenil A, B, Senior Femenino, Senior Masculino): 90 minutos (2 partes de 45 minutos)
 * - Default / Fallback: 90 minutos (2 partes de 45 minutos)
 */
export function getCategoryMatchDuration(teamOrCategory?: string): MatchDurationConfig {
  const normalized = (teamOrCategory || '').toUpperCase().trim();

  // Infantil: 70 min (2 x 35 min)
  if (normalized.includes('INFANTIL')) {
    return {
      totalMinutes: 70,
      halfMinutes: 35,
      categoryName: 'Infantil',
      partsLabel: '2 partes de 35 min (70 min)'
    };
  }

  // Cadete: 80 min (2 x 40 min)
  if (normalized.includes('CADETE')) {
    return {
      totalMinutes: 80,
      halfMinutes: 40,
      categoryName: 'Cadete',
      partsLabel: '2 partes de 40 min (80 min)'
    };
  }

  // Alevín: 60 min (2 x 30 min)
  if (normalized.includes('ALEVIN') || normalized.includes('ALEVÍN')) {
    return {
      totalMinutes: 60,
      halfMinutes: 30,
      categoryName: 'Alevín',
      partsLabel: '2 partes de 30 min (60 min)'
    };
  }

  // Benjamín / Prebenjamín: 50 min (2 x 25 min)
  if (
    normalized.includes('BENJAMIN') || 
    normalized.includes('BENJAMÍN') || 
    normalized.includes('PREBENJAMIN') || 
    normalized.includes('PREBENJAMÍN') || 
    normalized.includes('PRE BENJAMIN')
  ) {
    return {
      totalMinutes: 50,
      halfMinutes: 25,
      categoryName: 'Benjamín',
      partsLabel: '2 partes de 25 min (50 min)'
    };
  }

  // Juvenil y Senior (y fútbol 11 estándar): 90 min (2 x 45 min)
  const isJuvenil = normalized.includes('JUVENIL');
  const isSenior = normalized.includes('SENIOR');
  const catName = isJuvenil ? 'Juvenil' : isSenior ? 'Senior' : 'Fútbol 11';

  return {
    totalMinutes: 90,
    halfMinutes: 45,
    categoryName: catName,
    partsLabel: '2 partes de 45 min (90 min)'
  };
}
