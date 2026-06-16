import { City, Bus, Line, Schedule, CompletedTrip } from '../types';

export function generateDemoData(companyId: string): {
  cities: City[];
  buses: Bus[];
  lines: Line[];
  schedules: Schedule[];
  completedTrips: CompletedTrip[];
} {
  // 1. Generate standard cities
  const cities: City[] = [
    { id: `city-1-${companyId}`, name: 'São Paulo', state: 'SP', code: 'SPO', companyId },
    { id: `city-2-${companyId}`, name: 'Rio de Janeiro', state: 'RJ', code: 'RIO', companyId },
    { id: `city-3-${companyId}`, name: 'Belo Horizonte', state: 'MG', code: 'BHZ', companyId },
    { id: `city-4-${companyId}`, name: 'Campinas', state: 'SP', code: 'CPQ', companyId },
    { id: `city-5-${companyId}`, name: 'Curitiba', state: 'PR', code: 'CWB', companyId },
  ];

  // 2. Generate standard fleet (buses)
  const buses: Bus[] = [
    { id: `bus-1-${companyId}`, plate: 'ABC-1D23', model: 'Marcopolo Paradiso G8 1200', capacity: 46, serviceType: 'convencional', companyId, status: 'disponivel' },
    { id: `bus-2-${companyId}`, plate: 'XYZ-9F87', model: 'Marcopolo Paradiso G8 1850 DD', capacity: 38, serviceType: 'executivo', companyId, status: 'disponivel' },
    { id: `bus-3-${companyId}`, plate: 'OPS-2W34', model: 'Irizar i8 Premium Coach', capacity: 28, serviceType: 'leito', companyId, status: 'disponivel' },
    { id: `bus-4-${companyId}`, plate: 'COM-4X56', model: 'Comil Invictus DD', capacity: 46, serviceType: 'convencional', companyId, status: 'em_viagem' },
    { id: `bus-5-${companyId}`, plate: 'LTU-7Y19', model: 'Marcopolo Paradiso G8 Leito', capacity: 28, serviceType: 'leito', companyId, status: 'manutencao' },
  ];

  // 3. Generate standard lines (origin - destination)
  const lines: Line[] = [
    {
      id: `line-1-${companyId}`,
      originCityId: cities[0].id, // São Paulo
      destinationCityId: cities[1].id, // Rio de Janeiro
      distance: 435,
      duration: 360, // 6 hours
      serviceType: 'executivo',
      companyId,
    },
    {
      id: `line-2-${companyId}`,
      originCityId: cities[0].id, // São Paulo
      destinationCityId: cities[3].id, // Campinas
      distance: 98,
      duration: 80, // 1h 20m
      serviceType: 'convencional',
      companyId,
    },
    {
      id: `line-3-${companyId}`,
      originCityId: cities[0].id, // São Paulo
      destinationCityId: cities[2].id, // Belo Horizonte
      distance: 586,
      duration: 480, // 8 hours
      serviceType: 'leito',
      companyId,
    },
  ];

  // 4. Generate standard operational schedules
  const schedules: Schedule[] = [
    // SP - Rio
    { id: `sched-1-${companyId}`, lineId: lines[0].id, departureTime: '07:30', frequency: 'diaria', serviceType: 'executivo', companyId },
    { id: `sched-2-${companyId}`, lineId: lines[0].id, departureTime: '13:00', frequency: 'seg-sex', serviceType: 'executivo', companyId },
    { id: `sched-3-${companyId}`, lineId: lines[0].id, departureTime: '18:15', frequency: 'diaria', serviceType: 'leito', companyId },

    // SP - Campinas (Frequent commuters)
    { id: `sched-4-${companyId}`, lineId: lines[1].id, departureTime: '06:00', frequency: 'seg-sex', serviceType: 'convencional', companyId },
    { id: `sched-5-${companyId}`, lineId: lines[1].id, departureTime: '08:30', frequency: 'diaria', serviceType: 'convencional', companyId },
    { id: `sched-6-${companyId}`, lineId: lines[1].id, departureTime: '17:30', frequency: 'seg-sex', serviceType: 'convencional', companyId },

    // SP - BH
    { id: `sched-7-${companyId}`, lineId: lines[2].id, departureTime: '22:30', frequency: 'diaria', serviceType: 'leito', companyId },
    { id: `sched-8-${companyId}`, lineId: lines[2].id, departureTime: '08:00', frequency: 'fds', serviceType: 'executivo', companyId },
  ];

  // 5. Generate past completed trips (histórico para análise)
  const completedTrips: CompletedTrip[] = [];
  const daysOfHistory = 6;
  const today = new Date();

  for (let i = 1; i <= daysOfHistory; i++) {
    const dateObj = new Date();
    dateObj.setDate(today.getDate() - i);
    const dateString = dateObj.toISOString().split('T')[0];

    // For each schedule, simulate a random passenger load and financial metrics
    schedules.forEach((sch, idx) => {
      // Modify based on service and index to give realistic variation
      let cap = 46;
      if (sch.serviceType === 'executivo') cap = 38;
      if (sch.serviceType === 'leito') cap = 28;

      const basePax = Math.round(cap * (0.55 + Math.random() * 0.4));
      const passengerCount = Math.min(cap, Math.max(8, basePax));
      const occupancyRate = Math.round((passengerCount / cap) * 100);

      // Simple ticket price estimations (SP-Rio: Exec = R$ 120, Campinas: Conv = R$ 38, SP-BH: Leito = R$ 240)
      let ticketPrice = 45;
      if (sch.lineId === lines[0].id) {
        ticketPrice = sch.serviceType === 'leito' ? 190 : 130;
      } else if (sch.lineId === lines[1].id) {
        ticketPrice = 38;
      } else if (sch.lineId === lines[2].id) {
        ticketPrice = sch.serviceType === 'leito' ? 245 : 160;
      }

      const revenue = passengerCount * ticketPrice;

      // Assign an available bus randomly
      const matchingBuses = buses.filter((b) => b.serviceType === sch.serviceType);
      const chosenBus = matchingBuses[idx % matchingBuses.length] || buses[0];

      completedTrips.push({
        id: `trip-completed-${i}-${idx}-${companyId}`,
        scheduleId: sch.id,
        lineId: sch.lineId,
        busId: chosenBus.id,
        departureTime: sch.departureTime,
        date: dateString,
        passengerCount,
        revenue,
        occupancyRate,
        companyId,
      });
    });
  }

  return {
    cities,
    buses,
    lines,
    schedules,
    completedTrips,
  };
}
