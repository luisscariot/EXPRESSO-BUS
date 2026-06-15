import { City } from '../types';

// Predefined geographic coordinates of real Brazilian highways (Lat, Lon)
export const HIGHWAY_SEGMENTS: Record<string, [number, number][]> = {
  // BR-116: Rodovia Presidente Dutra (São Paulo <-> Rio de Janeiro)
  'saopaulo-riodejaneiro': [
    [-23.5505, -46.6333], // São Paulo
    [-23.4542, -46.5340], // Guarulhos
    [-23.3986, -46.3218], // Mogi / Arujá
    [-23.1791, -45.8872], // São José dos Campos
    [-23.0264, -45.5552], // Taubaté
    [-22.8466, -45.2285], // Aparecida
    [-22.7394, -45.1211], // Lorena
    [-22.5746, -44.9575], // Cruzeiro
    [-22.4678, -44.4491], // Resende
    [-22.5442, -44.2435], // Barra Mansa
    [-22.5202, -44.1160], // Volta Redonda
    [-22.6289, -43.8967], // Piraí
    [-22.7558, -43.4601], // Nova Iguaçu
    [-22.9068, -43.1729], // Rio de Janeiro
  ],

  // BR-381: Rodovia Fernão Dias (São Paulo <-> Belo Horizonte)
  'saopaulo-belohorizonte': [
    [-23.5505, -46.6333], // São Paulo
    [-23.3186, -46.5861], // Mairiporã
    [-23.1190, -46.5574], // Atibaia
    [-22.9519, -46.5414], // Bragança Paulista
    [-22.8547, -46.3183], // Extrema
    [-22.7539, -46.1436], // Camanducaia
    [-22.6105, -46.0592], // Cambuí
    [-22.2248, -45.9331], // Pouso Alegre
    [-22.0575, -45.6703], // Careaçu
    [-21.6961, -45.2504], // Três Corações
    [-21.0921, -45.0906], // Perdões
    [-20.6974, -44.8290], // Oliveira
    [-20.3951, -44.4377], // Itaguara
    [-20.0764, -44.3056], // Igarapé
    [-19.9678, -44.1981], // Betim
    [-19.9167, -43.9345], // Belo Horizonte
  ],

  // BR-116: Rodovia Régis Bittencourt (São Paulo <-> Curitiba)
  'saopaulo-curitiba': [
    [-23.5505, -46.6333], // São Paulo
    [-23.6231, -46.7853], // Taboão da Serra
    [-23.6489, -46.8530], // Embu das Artes
    [-23.7175, -46.8494], // Itapecerica
    [-23.9304, -47.0700], // Juquitiba
    [-24.2818, -47.4597], // Miracatu
    [-24.4880, -47.8437], // Registro
    [-24.6942, -48.0069], // Jacupiranga
    [-24.7431, -48.1275], // Cajati
    [-24.7578, -48.5085], // Barra do Turvo
    [-25.3051, -49.0559], // Campina Grande do Sul
    [-25.2917, -49.2242], // Colombo
    [-25.4290, -49.2671], // Curitiba
  ],

  // BR-040: (Belo Horizonte <-> Rio de Janeiro)
  'belohorizonte-riodejaneiro': [
    [-19.9167, -43.9345], // Belo Horizonte
    [-19.9858, -43.8475], // Nova Lima
    [-20.2525, -43.8058], // Itabirito
    [-20.5015, -43.8569], // Congonhas
    [-20.6622, -43.7854], // Conselheiro Lafaiete
    [-21.2250, -43.7741], // Barbacena
    [-21.4554, -43.5158], // Santos Dumont
    [-21.7642, -43.3496], // Juiz de Fora
    [-22.1158, -43.2081], // Três Rios
    [-22.2386, -43.1092], // Areal
    [-22.5049, -43.1803], // Petrópolis
    [-22.7856, -43.3117], // Duque de Caxias
    [-22.9068, -43.1729], // Rio de Janeiro
  ],

  // Rodovia dos Bandeirantes / Anhanguera SP-348 / SP-330 (São Paulo <-> Campinas)
  'saopaulo-campinas': [
    [-23.5505, -46.6333], // São Paulo
    [-23.3642, -46.7411], // Caieiras
    [-23.1857, -46.8978], // Jundiaí
    [-23.0858, -46.9472], // Louveira
    [-22.9708, -46.9961], // Valinhos
    [-22.9099, -47.0626], // Campinas
  ]
};

// Normalize names for index lookups
function normalizeCityName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, "")             // Remove spaces
    .replace(/[^a-z0-9]/g, "");       // Remove special characters
}

/**
 * Tries to perform exact lookup of real-world highway coordinates for a pair of cities.
 * Auto-detects reverse directions.
 */
export function getHighwaySegment(city1Name: string, city2Name: string): [number, number][] | null {
  const norm1 = normalizeCityName(city1Name);
  const norm2 = normalizeCityName(city2Name);

  const key1 = `${norm1}-${norm2}`;
  if (HIGHWAY_SEGMENTS[key1]) {
    return HIGHWAY_SEGMENTS[key1];
  }

  const key2 = `${norm2}-${norm1}`;
  if (HIGHWAY_SEGMENTS[key2]) {
    // Return copy of the points reversed
    return [...HIGHWAY_SEGMENTS[key2]].reverse();
  }

  // Cross-route: if going Campinas <-> Rio de Janeiro, combine Campinas-SP and SP-RJ!
  if ((norm1 === 'campinas' && norm2 === 'riodejaneiro') || (norm1 === 'riodejaneiro' && norm2 === 'campinas')) {
    const isCampinasFirst = norm1 === 'campinas';
    const campinasSP = HIGHWAY_SEGMENTS['saopaulo-campinas']; // SP is first, Campinas is last
    const spRJ = HIGHWAY_SEGMENTS['saopaulo-riodejaneiro']; // SP is first, RJ is last

    if (campinasSP && spRJ) {
      // Connect Campinas -> SP -> RJ
      const combined: [number, number][] = [];
      // To go Campinas -> SP: reverse campinasSP
      const campToSP = [...campinasSP].reverse();
      combined.push(...campToSP);
      
      // SP to RJ is spRJ, but remove the first element because we already have SP
      combined.push(...spRJ.slice(1));

      return isCampinasFirst ? combined : combined.reverse();
    }
  }

  // Cross-route: if going Curitiba <-> Rio de Janeiro, combine Curitiba <-> SP and SP <-> RJ
  if ((norm1 === 'curitiba' && norm2 === 'riodejaneiro') || (norm1 === 'riodejaneiro' && norm2 === 'curitiba')) {
    const isCwbFirst = norm1 === 'curitiba';
    const cwbSP = HIGHWAY_SEGMENTS['saopaulo-curitiba']; // SP first, Curitiba last
    const spRJ = HIGHWAY_SEGMENTS['saopaulo-riodejaneiro'];

    if (cwbSP && spRJ) {
      const combined: [number, number][] = [];
      const cwbToSP = [...cwbSP].reverse();
      combined.push(...cwbToSP);
      combined.push(...spRJ.slice(1));
      return isCwbFirst ? combined : combined.reverse();
    }
  }

  // Cross-route: if going Curitiba <-> Belo Horizonte, combine Curitiba <-> SP and SP <-> BH
  if ((norm1 === 'curitiba' && norm2 === 'belohorizonte') || (norm1 === 'belohorizonte' && norm2 === 'curitiba')) {
    const isCwbFirst = norm1 === 'curitiba';
    const cwbSP = HIGHWAY_SEGMENTS['saopaulo-curitiba'];
    const spBH = HIGHWAY_SEGMENTS['saopaulo-belohorizonte'];

    if (cwbSP && spBH) {
      const combined: [number, number][] = [];
      const cwbToSP = [...cwbSP].reverse();
      combined.push(...cwbToSP);
      combined.push(...spBH.slice(1));
      return isCwbFirst ? combined : combined.reverse();
    }
  }

  return null;
}

/**
 * Returns dynamic coordinates for any leg, using highways when available, or fallbacks with wavy curves.
 */
export function getLineRoutePoints(itinerary: City[]): [number, number][] {
  if (itinerary.length < 2) return [];
  const points: [number, number][] = [];

  for (let s = 0; s < itinerary.length - 1; s++) {
    const c1 = itinerary[s];
    const c2 = itinerary[s + 1];

    const lat1 = c1.latitude ?? -22.5;
    const lon1 = c1.longitude ?? -45.5;
    const lat2 = c2.latitude ?? -22.5;
    const lon2 = c2.longitude ?? -45.5;

    // Try to find if we have a real-highway segment
    const realHighway = getHighwaySegment(c1.name, c2.name);
    if (realHighway && realHighway.length >= 2) {
      // Add first element only if this is the first leg
      if (s === 0) {
        points.push(realHighway[0]);
      }
      points.push(...realHighway.slice(1));
    } else {
      // Dynamic fallback: Generate winding path with small curves to simulate a real-world highway bend
      const numSubSegments = 24;
      for (let i = 0; i <= numSubSegments; i++) {
        if (s > 0 && i === 0) continue; // Skip start of leg if we already got the previous leg's end

        const t = i / numSubSegments;
        let lat = lat1 + (lat2 - lat1) * t;
        let lon = lon1 + (lon2 - lon1) * t;

        if (i > 0 && i < numSubSegments) {
          const angle = t * Math.PI;
          // Deterministic curve-hugging offset based on coords to represent an organic highway path
          const seedVal = Math.sin((lat1 + lon1) * 314);
          const bend = 0.08 * Math.sin(angle) * Math.sin(t * Math.PI * 2.5 + seedVal);

          const dy = lat2 - lat1;
          const dx = lon2 - lon1;
          const dist = Math.sqrt(dy * dy + dx * dx) || 1;
          const py = -dx / dist;
          const px = dy / dist;

          lat += py * bend;
          lon += px * bend;
        }
        points.push([lat, lon]);
      }
    }
  }

  return points;
}
