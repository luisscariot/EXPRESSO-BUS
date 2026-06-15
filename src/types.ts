export interface Company {
  name: string;
  headquartersId: string | null;
  logoUrl?: string;
  isActive: boolean;
}

export type BusStatus = 'disponivel' | 'em_viagem' | 'em_manutencao' | 'reserva';

export interface Bus {
  id: string;
  prefix: string;
  manufacturer: string;
  model: string;
  year: number;
  capacity: number;
  currentCityId: string;
  status: BusStatus;
  isPartner: boolean;
  partnerCompanyId?: string;
  availableSince?: number; // Minutes epoch when it became available
  serviceType: ServiceType;
}

export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  attractiveness?: number; // 1-100 score representing travel appeal and size
  vocation?: 'metropole' | 'turismo' | 'industrial' | 'interior';
  additionalInfo?: string;
}

export type DemandLevel = 'baixa' | 'media' | 'alta';

export interface PartnerCompany {
  id: string;
  name: string;
  baseCityId: string;
  fleetSize: number;
  operationalAvailability: 'alta' | 'media' | 'baixa';
  models: string[];
}

export type ServiceType = 'convencional' | 'executivo' | 'leito';

export interface Line {
  id: string;
  originCityId: string;
  destinationCityId: string;
  stops: string[]; // name or cityId list
  estimatedTime: number; // in minutes
  demand: DemandLevel;
  notes?: string;
  serviceType: ServiceType;
}

export type ScheduleFrequency = 'diaria' | 'seg-sex' | 'fds' | 'semanal';

export interface Schedule {
  id: string;
  lineId: string;
  departureTime: string; // "HH:MM"
  frequency: ScheduleFrequency;
  serviceType?: ServiceType;
}

export type TripStatus = 'programada' | 'em_curso' | 'concluida' | 'cancelada';

export interface IntermediateStopDetail {
  cityName: string;
  boarded: number;
  deboarded: number;
}

export interface Trip {
  id: string;
  lineId: string;
  scheduleId?: string;
  busId: string; // can be own bus index or partner bus index
  isPartnerTrip: boolean;
  partnerCompanyId?: string;
  departureTime: string; // HH:MM
  departureTimestamp: number; // simulated epoch count or real timestamp
  estimatedArrivalTimestamp: number;
  progress: number; // 0 to 100
  status: TripStatus;
  passengerCount: number;
  originalPassengerCount?: number;
  stopDetails?: IntermediateStopDetail[];
  isTransfer?: boolean;
  transferOriginCityId?: string;
  transferDestCityId?: string;
  transferDuration?: number;
  isExtraTrip?: boolean;
  categoryMismatch?: boolean;
  categoryMismatchAlert?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string; // HH:MM
  type: 'info' | 'warning' | 'success' | 'alert' | 'error';
  message: string;
}
