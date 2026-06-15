import { PartnerCompany, City, Bus, Line, Schedule } from '../types';

export const MANUFACTURERS = ['Marcopolo', 'Busscar', 'Comil', 'Irizar', 'CAIO'];

export const MODELS_BY_MANUFACTURER: Record<string, { name: string; capacity: number }[]> = {
  Marcopolo: [
    { name: 'Paradiso 1800 DD G8', capacity: 64 },
    { name: 'Paradiso 1200 G7', capacity: 46 },
    { name: 'Viaggio 1050', capacity: 42 },
    { name: 'Audace 800', capacity: 40 },
  ],
  Busscar: [
    { name: 'Vissta Buss DD', capacity: 60 },
    { name: 'Vissta Buss 360', capacity: 46 },
    { name: 'El Buss 320', capacity: 44 },
  ],
  Comil: [
    { name: 'Campione Invictus DD', capacity: 62 },
    { name: 'Campione Invictus 1200', capacity: 48 },
    { name: 'Campione 3.25', capacity: 42 },
  ],
  Irizar: [
    { name: 'Irizar i8', capacity: 56 },
    { name: 'Irizar i6S', capacity: 46 },
  ],
  CAIO: [
    { name: 'Solar 3400', capacity: 44 },
    { name: 'Giro 3600', capacity: 46 },
  ]
};

const PARTNER_PREFIXES = ['Viação', 'Expresso', 'Rápido', 'Auto Viação', 'Norte', 'Sul', 'União', 'Transtur'];
const PARTNER_SUFFIXES = ['Sul', 'Mar', 'Vale', 'Serra', 'Central', 'Brasil', 'Real', 'Express'];

export function generatePartnerCompany(city: City): PartnerCompany {
  const prefix = PARTNER_PREFIXES[Math.floor(Math.random() * PARTNER_PREFIXES.length)];
  const suffix = PARTNER_SUFFIXES[Math.floor(Math.random() * PARTNER_SUFFIXES.length)];
  
  // Decide a cool randomized name
  let name = '';
  if (Math.random() > 0.5) {
    name = `${prefix} ${city.name}`;
  } else {
    name = `${prefix} ${suffix}`;
  }
  
  // Clean potential duplicate words standard
  name = name.replace(`${city.name} ${city.name}`, city.name);

  const availibilities: ('alta' | 'media' | 'baixa')[] = ['alta', 'media', 'baixa'];
  const pAvail = availibilities[Math.floor(Math.random() * availibilities.length)];
  
  const fleetSize = Math.floor(Math.random() * 8) + 4; // 4 to 11 buses
  
  // Decide random models from manufacturers
  const selectedModels: string[] = [];
  const manuCount = 2;
  for (let i = 0; i < manuCount; i++) {
    const m = MANUFACTURERS[Math.floor(Math.random() * MANUFACTURERS.length)];
    const options = MODELS_BY_MANUFACTURER[m];
    const model = options[Math.floor(Math.random() * options.length)];
    selectedModels.push(`${m} ${model.name}`);
  }

  return {
    id: `partner_${Math.random().toString(36).substring(2, 9)}`,
    name,
    baseCityId: city.id,
    fleetSize,
    operationalAvailability: pAvail,
    models: selectedModels
  };
}

// Generate an automated prefix
export function generatePrefix(): string {
  const years = ['10', '20', '30', '40', '50', '60'];
  const base = years[Math.floor(Math.random() * years.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${base}${num}`;
}
