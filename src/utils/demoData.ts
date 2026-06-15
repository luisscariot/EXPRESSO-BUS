import { City, Bus, Line, Schedule, PartnerCompany } from '../types';

export const DEMO_CITIES: City[] = [
  {
    id: 'c_sp',
    name: 'São Paulo',
    state: 'SP',
    country: 'Brasil',
    latitude: -23.5505,
    longitude: -46.6333,
    population: 12300000,
    attractiveness: 95,
    vocation: 'metropole',
    additionalInfo: 'Sede central e principal hub de conexões do leste.'
  },
  {
    id: 'c_rj',
    name: 'Rio de Janeiro',
    state: 'RJ',
    country: 'Brasil',
    latitude: -22.9068,
    longitude: -43.1729,
    population: 6748000,
    attractiveness: 98,
    vocation: 'turismo',
    additionalInfo: 'Terminal Novo Rio - Grande demanda turística e corporativa.'
  },
  {
    id: 'c_bh',
    name: 'Belo Horizonte',
    state: 'MG',
    country: 'Brasil',
    latitude: -19.9167,
    longitude: -43.9345,
    population: 2521000,
    attractiveness: 75,
    vocation: 'industrial',
    additionalInfo: 'Terminal Rodoviário Governador Israel Pinheiro.'
  },
  {
    id: 'c_cwb',
    name: 'Curitiba',
    state: 'PR',
    country: 'Brasil',
    latitude: -25.4290,
    longitude: -49.2671,
    population: 1948000,
    attractiveness: 80,
    vocation: 'metropole',
    additionalInfo: 'Terminal Rodoferroviário de Curitiba, conexões para o sul.'
  }
];

export const DEMO_PARTNERS: PartnerCompany[] = [
  {
    id: 'partner_sp_1',
    name: 'Viação Cometa (SP)',
    baseCityId: 'c_sp',
    fleetSize: 15,
    operationalAvailability: 'alta',
    models: ['Marcopolo Paradiso G8 1800 DD', 'Irizar i8']
  },
  {
    id: 'partner_rj_1',
    name: 'Expresso Catarinense (RJ)',
    baseCityId: 'c_rj',
    fleetSize: 10,
    operationalAvailability: 'media',
    models: ['Busscar Vissta Buss DD', 'Marcopolo Paradiso 1200 G7']
  },
  {
    id: 'partner_bh_1',
    name: 'Rápido Gontijo (BH)',
    baseCityId: 'c_bh',
    fleetSize: 12,
    operationalAvailability: 'alta',
    models: ['Marcopolo Paradiso 1200 G7', 'Busscar Vissta Buss 360']
  },
  {
    id: 'partner_cwb_1',
    name: 'União Santa Catarina (CWB)',
    baseCityId: 'c_cwb',
    fleetSize: 8,
    operationalAvailability: 'baixa',
    models: ['Comil Campione Invictus DD']
  }
];

export const DEMO_FLEET: Bus[] = [
  {
    id: 'bus_own_1',
    prefix: '1010',
    manufacturer: 'Marcopolo',
    model: 'Paradiso 1800 DD G8',
    year: 2024,
    capacity: 64,
    currentCityId: 'c_sp',
    status: 'disponivel',
    isPartner: false,
    serviceType: 'leito'
  },
  {
    id: 'bus_own_2',
    prefix: '2020',
    manufacturer: 'Comil',
    model: 'Campione Invictus DD',
    year: 2023,
    capacity: 62,
    currentCityId: 'c_rj',
    status: 'disponivel',
    isPartner: false,
    serviceType: 'executivo'
  },
  {
    id: 'bus_own_3',
    prefix: '3030',
    manufacturer: 'Busscar',
    model: 'Vissta Buss DD',
    year: 2022,
    capacity: 60,
    currentCityId: 'c_bh',
    status: 'reserva',
    isPartner: false,
    serviceType: 'convencional'
  },
  {
    id: 'bus_own_4',
    prefix: '4040',
    manufacturer: 'Marcopolo',
    model: 'Paradiso 1200 G7',
    year: 2021,
    capacity: 46,
    currentCityId: 'c_cwb',
    status: 'disponivel',
    isPartner: false,
    serviceType: 'convencional'
  },
  {
    id: 'bus_own_5',
    prefix: '5050',
    manufacturer: 'Irizar',
    model: 'Irizar i6S',
    year: 2023,
    capacity: 46,
    currentCityId: 'c_sp',
    status: 'em_manutencao',
    isPartner: false,
    serviceType: 'executivo'
  },
  {
    id: 'bus_own_6',
    prefix: '6060',
    manufacturer: 'CAIO',
    model: 'Giro 3600',
    year: 2020,
    capacity: 46,
    currentCityId: 'c_sp',
    status: 'disponivel',
    isPartner: false,
    serviceType: 'convencional'
  }
];

export const DEMO_LINES: Line[] = [
  {
    id: 'line_sp_rj',
    originCityId: 'c_sp',
    destinationCityId: 'c_rj',
    stops: ['São José dos Campos', 'Resende'],
    estimatedTime: 360, // 6 horas
    demand: 'alta',
    notes: 'Rota principal de alta receita operacional. Tráfego intenso pela Rodovia Presidente Dutra.',
    serviceType: 'executivo'
  },
  {
    id: 'line_sp_cwb',
    originCityId: 'c_sp',
    destinationCityId: 'c_cwb',
    stops: ['Registro'],
    estimatedTime: 300, // 5 horas
    demand: 'media',
    notes: 'Tráfego pela Régis Bittencourt. Sujeito a nevoeiros no topo da serra.',
    serviceType: 'leito'
  },
  {
    id: 'line_bh_rj',
    originCityId: 'c_bh',
    destinationCityId: 'c_rj',
    stops: ['Juiz de Fora', 'Petrópolis'],
    estimatedTime: 420, // 7 horas
    demand: 'alta',
    notes: 'Topografia sinuosa. Demanda estável durante todo o ano.',
    serviceType: 'convencional'
  },
  {
    id: 'line_cwb_sp',
    originCityId: 'c_cwb',
    destinationCityId: 'c_sp',
    stops: ['Registro'],
    estimatedTime: 300, // 5 horas
    demand: 'media',
    notes: 'Rota de retorno para o hub do sudeste.',
    serviceType: 'executivo'
  }
];

export const DEMO_SCHEDULES: Schedule[] = [
  {
    id: 'sched_1',
    lineId: 'line_sp_rj',
    departureTime: '08:00',
    frequency: 'diaria'
  },
  {
    id: 'sched_2',
    lineId: 'line_sp_rj',
    departureTime: '13:00',
    frequency: 'diaria'
  },
  {
    id: 'sched_3',
    lineId: 'line_sp_rj',
    departureTime: '23:00',
    frequency: 'diaria'
  },
  {
    id: 'sched_4',
    lineId: 'line_sp_cwb',
    departureTime: '10:00',
    frequency: 'seg-sex'
  },
  {
    id: 'sched_5',
    lineId: 'line_sp_cwb',
    departureTime: '21:30',
    frequency: 'diaria'
  },
  {
    id: 'sched_6',
    lineId: 'line_bh_rj',
    departureTime: '09:00',
    frequency: 'fds'
  },
  {
    id: 'sched_7',
    lineId: 'line_bh_rj',
    departureTime: '22:00',
    frequency: 'diaria'
  }
];
