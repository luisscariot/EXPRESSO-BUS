import { ServiceType, ScheduleFrequency, DemandEstimation, FeasibilityCheck, Schedule, Line, Bus } from '../types';

export function getBusCapacity(serviceType: ServiceType): number {
  switch (serviceType) {
    case 'leito':
      return 28;
    case 'executivo':
      return 38;
    case 'convencional':
    default:
      return 46;
  }
}

export function getScheduleDemandEstimation(
  lineId: string,
  departureTime: string,
  frequency: ScheduleFrequency,
  _scheduleId?: string,
  customServiceType?: ServiceType,
  lines: Line[] = []
): DemandEstimation | null {
  const line = lines.find((l) => l.id === lineId);
  if (!line && lines.length > 0) return null;

  const service = customServiceType || line?.serviceType || 'convencional';
  const capacity = getBusCapacity(service);

  // Parse departure hour
  const parts = departureTime.split(':');
  if (parts.length !== 2) return null;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  let multiplier = 1.0;
  let timeLabel = '';
  let explanation = '';

  // Peak times
  if (hour >= 6 && hour <= 8) {
    multiplier += 0.45;
    timeLabel = '⚡ Horário de Pico - Manhã';
    explanation = 'Elevada demanda de passageiros corporativos e conexões intermunicipais de início do expediente.';
  } else if (hour >= 17 && hour <= 19) {
    multiplier += 0.50;
    timeLabel = '⚡ Horário de Pico - Final de Tarde';
    explanation = 'Pico máximo de passageiros retornando do trabalho/estudo. Recomenda-se reforço ou classe executiva.';
  } else if (hour >= 11 && hour <= 13) {
    multiplier += 0.15;
    timeLabel = '🕒 Horário Intermediário (Almoço)';
    explanation = 'Fluxo constante de passageiros de negócios e turismo rápido. Ocupação mediana de assentos.';
  } else if (hour >= 23 || hour <= 4) {
    multiplier -= 0.35;
    timeLabel = '🌙 Horário Noturno / Corujão';
    explanation = 'Fluxo reduzido de passageiros. Perfil voltado para viagens de descanso ou conexões de longa distância.';
  } else {
    multiplier += 0.02;
    timeLabel = '🍃 Horário de Entre-pico';
    explanation = 'Estabilidade de demanda. Passageiros de lazer, profissionais com horários flexíveis e idosos.';
  }

  // Frequency adjustments
  if (frequency === 'seg-sex') {
    multiplier += 0.10;
    explanation += ' Maior propensão a viagens de negócios e estudantes universitários.';
  } else if (frequency === 'fds') {
    multiplier += 0.25;
    explanation += ' Fluxo intenso de retorno familiar, lazer e turismo de fim de semana.';
  } else if (frequency === 'semanal') {
    multiplier += 0.05;
    explanation += ' Viagens organizadas pontuais ou de pequenos comerciantes locais.';
  }

  // Service modifier
  if (service === 'leito') {
    // Premium service - higher load factor but less total volume
    multiplier *= 0.85; 
    explanation += ' Categoria Leito atrai clientes corporativos e de alta renda que exigem máximo repouso.';
  } else if (service === 'executivo') {
    multiplier *= 1.05;
    explanation += ' Excelente custo-benefício que equilibra conforto e preço, ideal para viagens intermunicipais.';
  }

  // Calculate passenger estimates
  const baseAvg = Math.round(capacity * 0.62 * multiplier);
  let pMin = Math.round(baseAvg * 0.8);
  let pMax = Math.round(baseAvg * 1.15);

  if (pMin < 3) pMin = 3;
  if (pMax > capacity) pMax = capacity;
  if (pMin > pMax) pMin = Math.round(pMax * 0.75);

  const occupancyRate = Math.min(100, Math.round(( (pMin + pMax) / 2 / capacity) * 100));

  return {
    pMin,
    pMax,
    maxCapacity: capacity,
    occupancyRate,
    timeLabel,
    explanation,
  };
}

export function checkScheduleFeasibility(
  schedule: Schedule,
  _line: Line,
  allSchedules: Schedule[] = [],
  _allLines: Line[] = [],
  allBuses: Bus[] = []
): FeasibilityCheck {
  // Check if same line has another departure too close
  const otherSameLineScheds = allSchedules.filter(
    (s) => s.id !== schedule.id && s.lineId === schedule.lineId
  );

  const parseToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
    return h * 60 + m;
  };

  const currentMinutes = parseToMinutes(schedule.departureTime);

  let tooCloseConflict = false;
  let closeTime = '';

  for (const s of otherSameLineScheds) {
    const sMinutes = parseToMinutes(s.departureTime);
    const diff = Math.abs(currentMinutes - sMinutes);
    if (diff < 30) {
      tooCloseConflict = true;
      closeTime = s.departureTime;
      break;
    }
  }

  if (tooCloseConflict) {
    return {
      level: 'warning',
      message: `Intervalo crítico! Há outra partida programada para ${closeTime} (menos de 30 min de intervalo), o que pode diluir o faturamento do trecho.`,
    };
  }

  // Check if there is an available bus with the correct service type
  const matchingBuses = allBuses.filter(
    (b) => b.serviceType === schedule.serviceType && b.status === 'disponivel'
  );

  if (matchingBuses.length === 0 && allBuses.length > 0) {
    return {
      level: 'info',
      message: `Alerta operacional: Nenhum ônibus da categoria "${schedule.serviceType.toUpperCase()}" está registrado como atualmente disponível.`,
    };
  }

  // Success state
  return {
    level: 'success',
    message: 'Horário viável. Capacidade operacional balanceada e demanda em conformidade com o trecho.',
  };
}
