import { ServiceType, ScheduleFrequency, DemandEstimation, FeasibilityCheck, Schedule, Line, Bus, City } from '../types';

export function getBusCapacity(serviceType: ServiceType): number {
  switch (serviceType) {
    case 'leito':
      return 28;
    case 'executivo':
      return 46;
    case 'convencional':
    default:
      return 42;
  }
}

export function getScheduleDemandEstimation(
  lineId: string,
  departureTime: string,
  frequency: ScheduleFrequency,
  _scheduleId?: string,
  customServiceType?: ServiceType,
  lines: Line[] = [],
  cities: City[] = []
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
    explanation = 'Elevada demanda de passageiros corporativos e conexões intermunicipais de início de expediente.';
  } else if (hour >= 17 && hour <= 19) {
    multiplier += 0.50;
    timeLabel = '⚡ Horário de Pico - Final de Tarde';
    explanation = 'Pico máximo de passageiros retornando do trabalho/estudo. Recomenda-se reforço de frota.';
  } else if (hour >= 11 && hour <= 13) {
    multiplier += 0.15;
    timeLabel = '🕒 Horário Intermediário (Almoço)';
    explanation = 'Fluxo constante de passageiros de negócios e turismo rápido. Ocupação mediana.';
  } else if (hour >= 23 || hour <= 4) {
    multiplier -= 0.35;
    timeLabel = '🌙 Horário Noturno / Corujão';
    explanation = 'Fluxo reduzido de passageiros. Perfil voltado para viagens de descanso ou conexões de longa distância.';
  } else {
    multiplier += 0.02;
    timeLabel = '🍃 Horário de Entre-pico';
    explanation = 'Estabilidade de decolagem de demanda. Passageiros de lazer e profissionais com flexibilidade.';
  }

  // Frequency adjustments
  if (frequency === 'seg-sex') {
    multiplier += 0.10;
    explanation += ' Maior propensão a estudantes e corporativo nos dias úteis.';
  } else if (frequency === 'fds') {
    multiplier += 0.25;
    explanation += ' Fluxo intenso de retorno familiar e lazer aos finais de semana.';
  } else if (frequency === 'semanal') {
    multiplier += 0.05;
    explanation += ' Viagem pontual para feiras de varejo ou retornos semanais.';
  }

  // City and vocation dynamics
  if (line && cities.length > 0) {
    const origin = cities.find(c => c.id === line.originCityId);
    const dest = cities.find(c => c.id === line.destinationCityId);
    if (origin && dest) {
      explanation += ` Conexão entre ${origin.name} (${origin.vocation}) e ${dest.name} (${dest.vocation}).`;
      
      // Business/Commuter link: Dormitório & Industrial/Comercial
      const isCommuterLine = 
        (origin.vocation === 'dormitorio' && (dest.vocation === 'industrial' || dest.vocation === 'comercial')) ||
        (dest.vocation === 'dormitorio' && (origin.vocation === 'industrial' || origin.vocation === 'comercial'));
      
      if (isCommuterLine) {
        if ((hour >= 6 && hour <= 8) || (hour >= 17 && hour <= 19)) {
          multiplier += 0.40;
          explanation += ' Demanda maciça de trabalhadores diários commuting entre a cidade dormitório e polos comerciais/industriais.';
        } else {
          multiplier -= 0.10;
          explanation += ' Fora de picos de deslocamento de trabalho a demanda reduz ligeiramente.';
        }
      }

      // Tourist flow
      if (origin.vocation === 'turistica' || dest.vocation === 'turistica') {
        if (frequency === 'fds') {
          multiplier += 0.35;
          explanation += ' Incremento severo de turistas aproveitando o final de semana na localidade turística.';
        } else {
          multiplier -= 0.05;
          explanation += ' Fluxo turístico estabilizado durante dias de semana.';
        }
      }

      // College mobility
      if (origin.vocation === 'universitaria' || dest.vocation === 'universitaria') {
        if (frequency === 'fds' || frequency === 'seg-sex') {
          multiplier += 0.20;
          explanation += ' Deslocamento intenso de estudantes universitários retornando às aulas ou residências familiares.';
        }
      }
      
      // Distance factor
      const dist = line.distance;
      if (dist > 300) {
        if (service === 'leito') {
          multiplier += 0.25;
          explanation += ' Rota de longa distância (>300Km) estimula alta adesão e conforto estendido no Leito.';
        } else {
          multiplier -= 0.10;
          explanation += ' Viagem longa gera menor apetite por convencional/executivo por conta do cansaço.';
        }
      } else {
        if (service === 'leito') {
          multiplier -= 0.15;
          explanation += ' Trajeto curto inibe a procura pela alta tarifa da cabine leito.';
        }
      }
    }
  }

  // Service modifier
  if (service === 'leito') {
    multiplier *= 0.85; 
  } else if (service === 'executivo') {
    multiplier *= 1.05;
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
      message: `Intervalo crítico! Há outra partida programada para ${closeTime} (menos de 30 min de intervalo), o que pode diluir a ocupação do trecho.`,
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
