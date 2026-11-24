export type RffmParams = {
  temporada: string;
  competicion: string;
  grupo: string;
  tipojuego: string;
};

export function validateRffmParams(params: RffmParams): string | null {
  if (!/^\d{1,3}$/.test(params.temporada)) return "Parámetro temporada no válido.";
  if (!/^\d{1,12}$/.test(params.competicion)) return "Parámetro competicion no válido.";
  if (!/^\d{1,12}$/.test(params.grupo)) return "Parámetro grupo no válido.";
  if (!/^[123]$/.test(params.tipojuego)) return "Parámetro tipojuego no válido.";
  return null;
}

export function validateRffmJornada(value: string): string | null {
  if (!/^\d{1,2}$/.test(value) || Number(value) < 1 || Number(value) > 60) {
    return "Parámetro jornada no válido.";
  }
  return null;
}

export function validateRffmActaCode(value: string): string | null {
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(value)) return "Parámetro codacta no válido.";
  return null;
}

export function validateRffmTeamName(value: string): string | null {
  if (value.length > 80) return "Parámetro teamName supera el máximo de 80 caracteres.";
  return null;
}

export function validateRffmCalendarUrl(value: string): string | null {
  if (value.length > 2048) return "La URL del calendario supera el máximo de 2048 caracteres.";
  return null;
}
