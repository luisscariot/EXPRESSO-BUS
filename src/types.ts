export type ServiceType = 'convencional' | 'executivo' | 'leito';
export type ScheduleFrequency = 'diaria' | 'seg-sex' | 'fds' | 'semanal';

export interface Company {
  id: string;
  name: string;
  code: string;
  ownerUid: string;
  createdAt: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  code: string;
  companyId: string;
  distanceToHub: number; // Distance in km to capital or main regional hub
  vocation: 'industrial' | 'turistica' | 'universitaria' | 'comercial' | 'dormitorio';
}

export interface Bus {
  id: string;
  plate: string;
  model: string;
  capacity: number;
  serviceType: ServiceType;
  companyId: string;
  status: 'disponivel' | 'em_viagem' | 'manutencao';
}

export interface Line {
  id: string;
  originCityId: string;
  destinationCityId: string;
  distance: number; // in km
  duration: number; // in minutes
  serviceType: ServiceType;
  companyId: string;
}

export interface Schedule {
  id: string;
  lineId: string;
  departureTime: string; // "HH:MM"
  frequency: ScheduleFrequency;
  serviceType: ServiceType;
  companyId: string;
}

export interface CompletedTrip {
  id: string;
  scheduleId: string;
  lineId: string;
  busId: string;
  departureTime: string;
  date: string; // YYYY-MM-DD
  passengerCount: number;
  revenue: number;
  occupancyRate: number;
  companyId: string;
}

// Interface for Demand Projections
export interface DemandEstimation {
  pMin: number;
  pMax: number;
  maxCapacity: number;
  occupancyRate: number;
  timeLabel: string;
  explanation: string;
}

// Interface for schedule Feasibility
export interface FeasibilityCheck {
  level: 'success' | 'info' | 'warning';
  message: string;
}
