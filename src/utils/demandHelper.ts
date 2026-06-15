import { City, Line, DemandLevel } from '../types';

// Standard Portuguese weekdays
export const WEEKDAYS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

export function getDayOfWeekName(day: number): string {
  const index = ((day - 1) % 7);
  return WEEKDAYS[index];
}

export function getDayOfWeekIndex(day: number): number {
  return ((day - 1) % 7); // 0 = Mon, 6 = Sun
}

/**
 * Calculates demand multiplier based on line cities, day of the week, and city vocation.
 */
export function getDemandMultiplier(day: number, line: Line, originCity?: City, destCity?: City): {
  multiplier: number;
  seasonalityType: string;
  explanation: string;
} {
  const dayIndex = getDayOfWeekIndex(day); // 0 (Mon) to 6 (Sun)
  
  // Base day multiplier
  // Friday (4) and Sunday (6) are peak days
  // Saturday (5) and Monday (0) are medium-high
  // Mid-week (Tue 1, Wed 2, Thu 3) are lower
  let dayFactor = 1.0;
  if (dayIndex === 4) { // Friday
    dayFactor = 1.45;
  } else if (dayIndex === 6) { // Sunday
    dayFactor = 1.55;
  } else if (dayIndex === 5) { // Saturday
    dayFactor = 1.15;
  } else if (dayIndex === 0) { // Monday
    dayFactor = 1.10;
  } else { // Tue, Wed, Thu
    dayFactor = 0.80;
  }

  // Adjust for region seasonality (Vocation of origin and destination)
  let vocationFactor = 1.0;
  let explanation = "Fluxo normal de passageiros para o meio de semana.";
  let seasonalityType = "Padrão Semanal";

  const oVocation = originCity?.vocation || 'metropole';
  const dVocation = destCity?.vocation || 'metropole';

  if (oVocation === 'turismo' || dVocation === 'turismo') {
    seasonalityType = "Sazonalidade Turística";
    if (dayIndex === 4 || dayIndex === 5 || dayIndex === 6) { // Fri, Sat, Sun
      vocationFactor = 1.35;
      explanation = "Alta de lazer: Rotas conectando polos turísticos registram forte aumento no fim de semana.";
    } else {
      vocationFactor = 0.70;
      explanation = "Retração de lazer: Menor apelo turístico em dias úteis do meio de semana.";
    }
  } else if (oVocation === 'metropole' && dVocation === 'metropole') {
    seasonalityType = "Sazonalidade Comercial";
    if (dayIndex === 0 || dayIndex === 4) { // Mon, Fri
      vocationFactor = 1.25;
      explanation = "Pico corporativo: Deslocamento massivo de trabalhadores e reuniões no início e fim de semana útil.";
    } else if (dayIndex === 5 || dayIndex === 6) { // Sat, Sun
      vocationFactor = 0.85;
      explanation = "Refluxo comercial: Centros empresariais com baixas conexões nos fins de semana.";
    }
  } else if (oVocation === 'industrial' || dVocation === 'industrial') {
    seasonalityType = "Sazonalidade Industrial";
    if (dayIndex >= 0 && dayIndex <= 4) { // Mon to Fri
      vocationFactor = 1.15;
      explanation = "Fluxo industrial: Conexões normais de negócios de segunda a sexta-feira.";
    } else {
      vocationFactor = 0.65;
      explanation = "Fim de semana industrial: Paradas de produção reduzem drasticamente as viagens corporativas.";
    }
  } else if (oVocation === 'interior' || dVocation === 'interior') {
    seasonalityType = "Sazonalidade Familiar";
    if (dayIndex === 4 || dayIndex === 6) { // Fri, Sun
      vocationFactor = 1.30;
      explanation = "Regresso familiar: Deslocamento expressivo de estudantes e residentes retornando ao acolhimento familiar.";
    } else {
      vocationFactor = 0.80;
      explanation = "Fluxo de interior padrão: Movimentação regular local durante os dias úteis.";
    }
  }

  const finalMultiplier = dayFactor * vocationFactor;
  
  if (dayIndex === 4) {
    explanation = `${explanation} (Alta demanda de Sexta-feira)`;
  } else if (dayIndex === 6) {
    explanation = `${explanation} (Pico de Domingo)`;
  }

  return {
    multiplier: finalMultiplier,
    seasonalityType,
    explanation
  };
}

export function calculateProjectedPassengers(
  day: number,
  line: Line,
  originCity?: City,
  destCity?: City,
  seedString: string = "default"
): number {
  const hash = getSimpleHash(`${day}-${line.id}-${seedString}`);
  const randomFactor = 0.88 + (hash % 24) / 100; // random multiplier between 0.88 and 1.12
  
  let baseCount = 12;
  if (line.demand === 'alta') {
    baseCount = 33;
  } else if (line.demand === 'media') {
    baseCount = 23;
  } else {
    baseCount = 13;
  }

  const { multiplier } = getDemandMultiplier(day, line, originCity, destCity);
  
  const finalProjected = Math.round(baseCount * multiplier * randomFactor);
  return Math.max(5, finalProjected);
}

function getSimpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface IntermediateStopDetail {
  cityName: string;
  boarded: number;
  deboarded: number;
}

export function generateStopDetails(
  day: number,
  line: Line,
  cities: City[],
  initialPassengers: number,
  busCapacity: number
): IntermediateStopDetail[] {
  const lineStops = line.stops || [];
  if (lineStops.length === 0) return [];

  let currentOnboard = initialPassengers;
  const details: IntermediateStopDetail[] = [];
  const dayOfWeekIdx = getDayOfWeekIndex(day);

  lineStops.forEach((stopName) => {
    const stopCity = cities.find((c) => c.name.toLowerCase() === stopName.toLowerCase());
    const stopVocation = stopCity?.vocation || 'metropole';
    const stopAttractiveness = stopCity?.attractiveness || 50;

    // --- Deboarding Interest Calculation ---
    // Base deboarding rate is 15% to 25% of current onboard
    let deboardRate = 0.15 + (stopAttractiveness / 1000); // 0.15 to 0.25 based on attractiveness

    // Adjust by vocation & day relevance
    if (stopVocation === 'turismo' && (dayOfWeekIdx === 4 || dayOfWeekIdx === 5)) { // Fri, Sat
      deboardRate += 0.15; // High deboarding for weekend tourists
    } else if (stopVocation === 'metropole' && (dayOfWeekIdx === 0 || dayOfWeekIdx === 4)) { // Mon, Fri
      deboardRate += 0.10; // Commuters getting off at major hub
    } else if (stopVocation === 'interior' && (dayOfWeekIdx === 4 || dayOfWeekIdx === 6)) { // Fri, Sun
      deboardRate += 0.12; // Family members returning home
    }

    // Deboard count is a fraction of current passengers, capped by current capacity
    let deboarded = Math.round(currentOnboard * Math.min(0.5, deboardRate));
    // Ensure we don't deboard everyone, and leave some unless passenger count is very low
    deboarded = Math.min(Math.max(0, currentOnboard - 2), deboarded);
    if (deboarded < 0) deboarded = 0;

    currentOnboard -= deboarded;

    // --- Boarding Interest Calculation ---
    // Base boarding capacity: how many people WANT to board
    let baseBoardingCount = 5;
    if (stopAttractiveness > 75) {
      baseBoardingCount = 14;
    } else if (stopAttractiveness > 50) {
      baseBoardingCount = 9;
    }

    // Adjust by vocation & day relevance
    let boardingMultiplier = 1.0;
    if (stopVocation === 'turismo') {
      if (dayOfWeekIdx === 6) { // Sunday tourist returning
        boardingMultiplier = 1.70;
      } else if (dayOfWeekIdx === 4 || dayOfWeekIdx === 5) {
        boardingMultiplier = 0.60;
      }
    } else if (stopVocation === 'metropole') {
      if (dayOfWeekIdx === 0 || dayOfWeekIdx === 4) {
        boardingMultiplier = 1.40;
      }
    } else if (stopVocation === 'interior') {
      if (dayOfWeekIdx === 6) { // Sun evening returns to metropoles
        boardingMultiplier = 1.60;
      }
    } else if (stopVocation === 'industrial') {
      if (dayOfWeekIdx >= 0 && dayOfWeekIdx <= 4) {
        boardingMultiplier = 1.25;
      } else {
        boardingMultiplier = 0.40;
      }
    }

    let passengersWantToBoard = Math.round(baseBoardingCount * boardingMultiplier);
    // Add some small pseudo-random variation
    const seed = getSimpleHash(`${line.id}-${stopName}-${day}`);
    passengersWantToBoard += (seed % 5) - 2;
    if (passengersWantToBoard < 1) passengersWantToBoard = 1;

    // Board count is capped by vacant seats
    const vacantSeats = Math.max(0, busCapacity - currentOnboard);
    const boarded = Math.min(vacantSeats, passengersWantToBoard);

    currentOnboard += boarded;

    details.push({
      cityName: stopName,
      boarded,
      deboarded
    });
  });

  return details;
}
