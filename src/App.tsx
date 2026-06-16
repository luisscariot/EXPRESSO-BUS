import React, { useState, useEffect, useRef } from 'react';
import { Company, City, PartnerCompany, Bus, Line, Schedule, Trip, SystemLog, TripStatus } from './types';
import { DEMO_CITIES, DEMO_FLEET, DEMO_LINES, DEMO_SCHEDULES, DEMO_PARTNERS } from './utils/demoData';
import { generatePartnerCompany } from './utils/generators';
import CompanySetup from './components/CompanySetup';
import CityManager from './components/CityManager';
import FleetManager from './components/FleetManager';
import LineManager from './components/LineManager';
import OpsDashboard from './components/OpsDashboard';
import DemandProjection from './components/DemandProjection';
import CompletedTrips from './components/CompletedTrips';
import UserAuthSection from './components/UserAuthSection';
import { calculateProjectedPassengers, getDayOfWeekName, generateStopDetails } from './utils/demandHelper';
import {
  Bus as BusIcon, Globe, Map, Sparkles, LogOut, LayoutDashboard, Settings2, ShieldCheck, Heart, AlertTriangle, Trash2, TrendingUp, Clock, Pause, Play, FastForward, RefreshCw, CheckCircle2
} from 'lucide-react';

export default function App() {
  // State definitions
  const [company, setCompany] = useState<Company | null>(() => {
    const saved = localStorage.getItem('expb_company');
    return saved ? JSON.parse(saved) : null;
  });

  const [cities, setCities] = useState<City[]>(() => {
    const saved = localStorage.getItem('expb_cities');
    return saved ? JSON.parse(saved) : [];
  });

  const [partners, setPartners] = useState<PartnerCompany[]>(() => {
    const saved = localStorage.getItem('expb_partners');
    return saved ? JSON.parse(saved) : [];
  });

  const [accumulatedPassengers, setAccumulatedPassengers] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('expb_accumulated_passengers');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('expb_accumulated_passengers', JSON.stringify(accumulatedPassengers));
  }, [accumulatedPassengers]);

  const [fleet, setFleet] = useState<Bus[]>(() => {
    const saved = localStorage.getItem('expb_fleet');
    return saved ? JSON.parse(saved) : [];
  });

  const [lines, setLines] = useState<Line[]>(() => {
    const saved = localStorage.getItem('expb_lines');
    return saved ? JSON.parse(saved) : [];
  });

  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const saved = localStorage.getItem('expb_schedules');
    return saved ? JSON.parse(saved) : [];
  });

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('expb_trips');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<SystemLog[]>(() => {
    const saved = localStorage.getItem('expb_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [simTime, setSimTime] = useState<{ hour: number; minute: number; day: number }>(() => {
    const saved = localStorage.getItem('expb_time');
    return saved ? JSON.parse(saved) : { hour: 8, minute: 0, day: 1 };
  });

  const [simSpeed, setSimSpeed] = useState<number>(0); // 0 = paused, 1 = normal, 5 = fast, 15 = ultra
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cities' | 'fleet' | 'lines' | 'projection' | 'completed'>('dashboard');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deletingCityId, setDeletingCityId] = useState<string | null>(null);

  // Ref tracking to bypass state stale closures inside the ticking loop
  const stateRef = useRef({ cities, partners, fleet, lines, schedules, trips, simTime, logs, accumulatedPassengers });
  stateRef.current = { cities, partners, fleet, lines, schedules, trips, simTime, logs, accumulatedPassengers };

  // Write changes to localStorage layout
  useEffect(() => {
    if (company) localStorage.setItem('expb_company', JSON.stringify(company));
    else localStorage.removeItem('expb_company');
  }, [company]);

  useEffect(() => {
    localStorage.setItem('expb_cities', JSON.stringify(cities));
  }, [cities]);

  useEffect(() => {
    localStorage.setItem('expb_partners', JSON.stringify(partners));
  }, [partners]);

  useEffect(() => {
    localStorage.setItem('expb_fleet', JSON.stringify(fleet));
  }, [fleet]);

  useEffect(() => {
    localStorage.setItem('expb_lines', JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    localStorage.setItem('expb_schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('expb_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('expb_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('expb_time', JSON.stringify(simTime));
  }, [simTime]);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'alert' | 'error' = 'info') => {
    const timeStr = `${String(stateRef.current.simTime.hour).padStart(2, '0')}:${String(stateRef.current.simTime.minute).padStart(2, '0')}`;
    const newLog: SystemLog = {
      id: `log_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: timeStr,
      type,
      message,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 75)]);
  };

  const handleSetupComplete = (setup: {
    name: string;
    hqName: string;
    hqState: string;
    hqCountry: string;
    themeColor: string;
    logoIcon: string;
    seedDemo: boolean;
  }) => {
    const activeCompany: Company = {
      name: setup.name,
      hqName: setup.hqName,
      hqState: setup.hqState,
      hqCountry: setup.hqCountry,
      themeColor: setup.themeColor,
      logoIcon: setup.logoIcon,
      isActive: true,
    } as any;

    if (setup.seedDemo) {
      setCompany(activeCompany);
      setCities(DEMO_CITIES);
      setPartners([]);
      setFleet(DEMO_FLEET);
      setLines(DEMO_LINES);
      setSchedules(DEMO_SCHEDULES);
      setTrips([]);
      setSimTime({ hour: 8, minute: 0, day: 1 });
      setSimSpeed(0);
      setActiveTab('dashboard');
      
      // Seed first operational logs
      const firstLog: SystemLog = {
        id: 'log_seed_1',
        timestamp: '08:00',
        type: 'success',
        message: `Bem-vindo ao Expresso Bus! Rede ativada com 4 cidades polo e 6 modernos ônibus da frota da "${setup.name}".`
      };
      setLogs([firstLog]);
    } else {
      // Custom start
      const hqLower = setup.hqName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
      
      const hqCoordsMap: Record<string, { lat: number; lon: number; pop: number; attr: number; voc: 'metropole' | 'turismo' | 'industrial' | 'interior' }> = {
        'saopaulo': { lat: -23.5505, lon: -46.6333, pop: 12300000, attr: 95, voc: 'metropole' },
        'riodejaneiro': { lat: -22.9068, lon: -43.1729, pop: 6748000, attr: 98, voc: 'turismo' },
        'belohorizonte': { lat: -19.9167, lon: -43.9345, pop: 2521000, attr: 75, voc: 'industrial' },
        'curitiba': { lat: -25.4290, lon: -49.2671, pop: 1948000, attr: 80, voc: 'metropole' },
        'campinas': { lat: -22.9099, lon: -47.0626, pop: 1210000, attr: 75, voc: 'industrial' },
        'santos': { lat: -23.9608, lon: -46.3331, pop: 433000, attr: 90, voc: 'turismo' },
        'saojosedoscampos': { lat: -23.1791, lon: -45.8872, pop: 730000, attr: 70, voc: 'industrial' },
        'sorocaba': { lat: -23.5015, lon: -47.4526, pop: 687000, attr: 65, voc: 'industrial' },
        'ribeiraopreto': { lat: -21.1704, lon: -47.8103, pop: 711000, attr: 75, voc: 'industrial' },
        'portoalegre': { lat: -30.0346, lon: -51.2177, pop: 1488000, attr: 85, voc: 'metropole' },
        'brasilia': { lat: -15.7942, lon: -47.8822, pop: 3015000, attr: 80, voc: 'metropole' },
        'goiania': { lat: -16.6869, lon: -49.2648, pop: 1532000, attr: 75, voc: 'metropole' },
        'salvador': { lat: -12.9777, lon: -38.5016, pop: 2886000, attr: 92, voc: 'turismo' },
      };

      const matchedHq = hqCoordsMap[hqLower];

      const firstCity: City = {
        id: 'c_hq',
        name: setup.hqName,
        state: setup.hqState.toUpperCase(),
        country: setup.hqCountry,
        latitude: matchedHq ? matchedHq.lat : parseFloat((-22.5 - Math.random() * 3).toFixed(4)),
        longitude: matchedHq ? matchedHq.lon : parseFloat((-46.5 - Math.random() * 3).toFixed(4)),
        population: matchedHq ? matchedHq.pop : 350000,
        attractiveness: matchedHq ? matchedHq.attr : 65,
        vocation: matchedHq ? matchedHq.voc : 'interior',
        additionalInfo: `Sede Central da ${setup.name}. Polo operacional principal ativado.`
      };

      setCompany(activeCompany);
      setCities([firstCity]);
      setPartners([]);
      setFleet([]);
      setLines([]);
      setSchedules([]);
      setTrips([]);
      setSimTime({ hour: 8, minute: 0, day: 1 });
      setSimSpeed(0);
      setActiveTab('cities');

      const startLog: SystemLog = {
        id: 'log_start',
        timestamp: '08:00',
        type: 'success',
        message: `Empresa "${setup.name}" criada com sede em ${setup.hqName} (${setup.hqState}). Cadastre novas cidades e monte sua primeira rota!`
      };
      setLogs([startLog]);
    }
  };

  const handleRawReset = () => {
    setCompany(null);
    setCities([]);
    setPartners([]);
    setFleet([]);
    setLines([]);
    setSchedules([]);
    setTrips([]);
    setLogs([]);
    setSimTime({ hour: 8, minute: 0, day: 1 });
    setSimSpeed(0);
    localStorage.clear();
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  // State update callbacks
  const handleAddCity = (newCity: City, newPartners: PartnerCompany[]) => {
    setCities((prev) => [...prev, newCity]);
    setPartners((prev) => [...prev, ...newPartners]);
    
    // Log addition
    addLog(`Infraestrutura: Polo operacional ativado em "${newCity.name} (${newCity.state})". Nova garagem regional disponível.`, 'success');
    
    newPartners.forEach((p) => {
      addLog(`Empresa Parceira "${p.name}" firmou convênio regional em ${newCity.name}. Frota de apoio disponível: ${p.fleetSize} ônibus.`, 'info');
    });
  };

  const handleDeleteCity = (id: string) => {
    setDeletingCityId(id);
  };

  const executeDeleteCity = (id: string) => {
    const city = cities.find((c) => c.id === id);
    if (!city) return;

    setCities((prev) => prev.filter((c) => c.id !== id));
    setPartners((prev) => prev.filter((p) => p.baseCityId !== id));
    setLines((prev) => prev.filter((l) => l.originCityId !== id && l.destinationCityId !== id));
    setSchedules((prev) => {
      // Find lines to delete
      const remainingLineIds = lines
        .filter((l) => l.originCityId !== id && l.destinationCityId !== id)
        .map((l) => l.id);
      return prev.filter((s) => remainingLineIds.includes(s.lineId));
    });
    addLog(`Infraestrutura: Polo de "${city.name}" foi desativado e desfeitas as parcerias locais.`, 'warning');
    setDeletingCityId(null);
  };

  const handleAddBus = (newBus: Bus) => {
    setFleet((prev) => [...prev, newBus]);
    addLog(`Frota: Ônibus Marcopolo/Comil prefixo #${newBus.prefix} cadastrado e pronto para integração.`, 'info');
  };

  const handleUpdateBusStatus = (id: string, status: 'disponivel' | 'em_viagem' | 'em_manutencao' | 'reserva') => {
    setFleet((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    const target = fleet.find((b) => b.id === id);
    if (target) {
      addLog(`Frota: Ônibus #${target.prefix} teve status operacional alterado de "${target.status}" para "${status}".`, 'info');
    }
  };

  const handleUpdateBusLocation = (id: string, cityId: string) => {
    setFleet((prev) => prev.map((b) => (b.id === id ? { ...b, currentCityId: cityId } : b)));
    const target = fleet.find((b) => b.id === id);
    const destName = cities.find((c) => c.id === cityId)?.name || 'Nova Cidade';
    if (target) {
      addLog(`Frota: Ônibus #${target.prefix} deslocado de imediato (teleporte rápido) para "${destName}".`, 'info');
    }
  };

  const handleUpdateBusServiceType = (id: string, serviceType: 'convencional' | 'executivo' | 'leito') => {
    setFleet((prev) => prev.map((b) => (b.id === id ? { ...b, serviceType } : b)));
    const target = fleet.find((b) => b.id === id);
    if (target) {
      const displayService = serviceType === 'convencional' ? 'Convencional' : serviceType === 'executivo' ? 'Executivo' : 'Leito';
      const prevService = target.serviceType === 'convencional' ? 'Convencional' : target.serviceType === 'executivo' ? 'Executivo' : 'Leito';
      addLog(`Frota: Ônibus #${target.prefix} alterou tipo de serviço de "${prevService}" para "${displayService}".`, 'info');
    }
  };

  const handleStartTransferTrip = (busId: string, originCityId: string, destCityId: string) => {
    const bus = fleet.find((b) => b.id === busId);
    if (!bus) return;

    if (bus.status === 'em_viagem') {
      addLog(`Frota: Não é possível transferir o ônibus #${bus.prefix} pois ele já está em trânsito.`, 'error');
      return;
    }

    const oCity = cities.find((c) => c.id === originCityId);
    const dCity = cities.find((c) => c.id === destCityId);

    if (!oCity || !dCity) {
      addLog(`Frota: Origem ou destino da transferência inválidos.`, 'error');
      return;
    }

    // Calculate distance-based travel duration
    let duration = 90; // Default minutes
    if (oCity.latitude !== undefined && oCity.longitude !== undefined && dCity.latitude !== undefined && dCity.longitude !== undefined) {
      const dy = dCity.latitude - oCity.latitude;
      const dx = dCity.longitude - oCity.longitude;
      const degDistance = Math.sqrt(dx * dx + dy * dy);
      // Roughly 1 degree translates to ~ 110km, speed of average bus on BR highways is around 70 km/h: ~1.5 h
      duration = Math.max(30, Math.round(degDistance * 105));
    }

    const minutesEpoch = simTime.day * 1440 + simTime.hour * 60 + simTime.minute;
    const timeFormatted = `${String(simTime.hour).padStart(2, '0')}:${String(simTime.minute).padStart(2, '0')}`;

    const newTrip: Trip = {
      id: `trip_trans_${Math.random().toString(36).substring(2, 9)}`,
      lineId: 'transfer',
      busId: bus.id,
      isPartnerTrip: false,
      departureTime: timeFormatted,
      departureTimestamp: minutesEpoch,
      estimatedArrivalTimestamp: minutesEpoch + duration,
      progress: 0,
      status: 'em_curso',
      passengerCount: 0,
      isTransfer: true,
      transferOriginCityId: originCityId,
      transferDestCityId: destCityId,
      transferDuration: duration,
    };

    setFleet((prev) => prev.map((b) => (b.id === bus.id ? { ...b, status: 'em_viagem' } : b)));
    setTrips((prev) => [newTrip, ...prev]);

    addLog(`Translado Extra: Ônibus próprio #${bus.prefix} (${bus.model}) partiu na linha de translado ${oCity.name} ➔ ${dCity.name} em viagem extra de reposicionamento vazio. Tempo estimado: ${Math.floor(duration / 60)}h ${duration % 60}m.`, 'success');
  };

  const handleDeleteBus = (id: string) => {
    const target = fleet.find((b) => b.id === id);
    if (target) {
      setFleet((prev) => prev.filter((b) => b.id !== id));
      addLog(`Frota: Ônibus #${target.prefix} removido da grade ativa permanente.`, 'warning');
    }
  };

  const handleAddLine = (newLine: Line) => {
    const linesToInsert = [newLine];
    const o = cities.find((c) => c.id === newLine.originCityId);
    const d = cities.find((c) => c.id === newLine.destinationCityId);
    
    // Check if the reciprocal return line already exists with same route and stops
    const returnExists = lines.some(
      (l) => l.originCityId === newLine.destinationCityId && 
             l.destinationCityId === newLine.originCityId && 
             l.serviceType === newLine.serviceType &&
             JSON.stringify(l.stops) === JSON.stringify([...newLine.stops].reverse())
    );
 
    let returnLine: Line | null = null;
    if (!returnExists) {
      returnLine = {
        id: `line_ret_${newLine.id.replace('line_', '')}_${Math.random().toString(36).substring(2, 6)}`,
        originCityId: newLine.destinationCityId,
        destinationCityId: newLine.originCityId,
        stops: [...newLine.stops].reverse(),
        estimatedTime: newLine.estimatedTime,
        demand: newLine.demand,
        notes: newLine.notes ? `Sentido Volta: ${newLine.notes}` : 'Linha de retorno automática.',
        serviceType: newLine.serviceType,
      };
      linesToInsert.push(returnLine);
    }
 
    setLines((prev) => {
      // Prevent double insertions of identical line ID
      const uniqueNew = linesToInsert.filter(ln => !prev.some(p => p.id === ln.id));
      return [...prev, ...uniqueNew];
    });
 
    const displayService = newLine.serviceType === 'convencional' ? 'Convencional' : newLine.serviceType === 'executivo' ? 'Executivo' : 'Leito';
    addLog(`Grade Linhas: Rota direta tipo "${displayService}" aberta de ${o?.name} ➔ ${d?.name} (${Math.floor(newLine.estimatedTime / 60)}h ${newLine.estimatedTime % 60}m).`, 'success');
    
    if (returnLine) {
      addLog(`Grade Linhas: Rota de RETORNO "${displayService}" criada automaticamente: ${d?.name} ➔ ${o?.name} com as escalas invertidas.`, 'success');
    }
  };

  const handleDeleteLine = (id: string) => {
    const line = lines.find((l) => l.id === id);
    if (line) {
      const o = cities.find((c) => c.id === line.originCityId);
      const d = cities.find((c) => c.id === line.destinationCityId);
      setLines((prev) => prev.filter((l) => l.id !== id));
      setSchedules((prev) => prev.filter((s) => s.lineId !== id));
      addLog(`Grade Linhas: Linha ${o?.name} ➔ ${d?.name} e seus horários foram cancelados.`, 'warning');
    }
  };

  const handleAddSchedule = (newSchedule: Schedule) => {
    setSchedules((prev) => [...prev, newSchedule]);
    const line = lines.find((l) => l.id === newSchedule.lineId);
    const o = cities.find((c) => c.id === line?.originCityId);
    const d = cities.find((c) => c.id === line?.destinationCityId);
    addLog(`Agenda: Estabelecida nova saída programada das ${newSchedule.departureTime} (${newSchedule.frequency}) para a linha ${o?.name} ➔ ${d?.name}.`, 'info');
  };

  const handleDeleteSchedule = (id: string) => {
    const sched = schedules.find((s) => s.id === id);
    if (sched) {
      const line = lines.find((l) => l.id === sched.lineId);
      const o = cities.find((c) => c.id === line?.originCityId);
      const d = cities.find((c) => c.id === line?.destinationCityId);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      addLog(`Agenda: Partida das ${sched.departureTime} para a rota ${o?.name} ➔ ${d?.name} foi removida.`, 'warning');
    }
  };

  const handleUpdateSchedule = (updatedSchedule: Schedule) => {
    setSchedules((prev) => prev.map((s) => s.id === updatedSchedule.id ? updatedSchedule : s));
    const line = lines.find((l) => l.id === updatedSchedule.lineId);
    const o = cities.find((c) => c.id === line?.originCityId);
    const d = cities.find((c) => c.id === line?.destinationCityId);
    addLog(`Agenda: Horário de partida alterado para as ${updatedSchedule.departureTime} (${updatedSchedule.frequency}) para a linha ${o?.name} ➔ ${d?.name}.`, 'info');
  };

  const getDayPT = (day: number) => {
    const days = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    return days[(day - 1) % 7];
  };

  const formatTimeStr = (h: number, m: number) => {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Main simulated time stepper
  const advanceSimulation = (minutesToAdvance: number) => {
    const current = stateRef.current;
    
    // Copy states to make them local and mutable during simulation steps
    let localFleet = current.fleet.map(b => ({ ...b }));
    let localTrips = current.trips.map(t => ({ ...t }));
    let localAccumulated = { ...current.accumulatedPassengers };

    let tempHour = current.simTime.hour;
    let tempMin = current.simTime.minute;
    let tempDay = current.simTime.day;

    let nextMin = current.simTime.minute + minutesToAdvance;
    let nextHour = current.simTime.hour;
    let nextDay = current.simTime.day;

    if (nextMin >= 60) {
      nextHour += Math.floor(nextMin / 60);
      nextMin = nextMin % 60;
    }
    if (nextHour >= 24) {
      nextDay += Math.floor(nextHour / 24);
      nextHour = nextHour % 24;
    }

    const nextTime = { hour: nextHour, minute: nextMin, day: nextDay };

    const getTripDuration = (trip: Trip) => {
      if (trip.isTransfer && trip.transferDuration) {
        return trip.transferDuration;
      }
      return (lines.find((l) => l.id === trip.lineId)?.estimatedTime || 120);
    };

    // We process minute-by-minute
    for (let mOffset = 1; mOffset <= minutesToAdvance; mOffset++) {
      tempMin++;
      if (tempMin >= 60) {
        tempHour++;
        tempMin = 0;
      }
      if (tempHour >= 24) {
        tempDay++;
        tempHour = 0;
      }

      const loopLogTime = `${String(tempHour).padStart(2, '0')}:${String(tempMin).padStart(2, '0')}`;
      const loopMinutes = tempDay * 1440 + tempHour * 60 + tempMin;

      // 1. Process Arrivals at loopMinutes
      localTrips = localTrips.map((trip) => {
        if (trip.status !== 'em_curso' && trip.status !== 'programada') return trip;

        const duration = getTripDuration(trip);
        const tripDepartMin = trip.departureTimestamp;
        const tripArriveMin = tripDepartMin + duration;

        // Has the trip finished at or before loopMinutes?
        if (loopMinutes >= tripArriveMin) {
          // Yes! Arrived!
          let originCityId = '';
          let destCityId = '';

          if (trip.isTransfer) {
            originCityId = trip.transferOriginCityId || '';
            destCityId = trip.transferDestCityId || '';
          } else {
            const line = lines.find((l) => l.id === trip.lineId);
            originCityId = line?.originCityId || '';
            destCityId = line?.destinationCityId || '';
          }

          const originCity = cities.find((c) => c.id === originCityId);
          const destCity = cities.find((c) => c.id === destCityId);

          if (trip.isPartnerTrip) {
            const partnerCompany = partners.find((p) => p.id === trip.partnerCompanyId);
            const isGoingHome = partnerCompany && partnerCompany.baseCityId === destCityId;

            if (isGoingHome) {
              // Remove partner bus returning home
              localFleet = localFleet.filter((b) => b.id !== trip.busId);
              addLog(`Parceria Finalizada: Ônibus parceiro de "${partnerCompany?.name}" concluiu a linha de volta da rota ${originCity?.name} ➔ ${destCity?.name} e retornou à sua garagem em ${destCity?.name}.`, 'success');
            } else {
              // Under guest destination city, mark as disponivel
              localFleet = localFleet.map((b) => {
                if (b.id === trip.busId) {
                  return { ...b, status: 'disponivel' as const, currentCityId: destCityId, availableSince: loopMinutes };
                }
                return b;
              });
              const pBus = localFleet.find((b) => b.id === trip.busId);
              const prefixVal = pBus ? `#${pBus.prefix}` : 'Terceirizado';
              addLog(`Apoio Disponível: Ônibus parceiro ${prefixVal} da "${partnerCompany?.name}" concluiu a linha ${originCity?.name} ➔ ${destCity?.name} e está disponível em ${destCity?.name} para a viagem de volta para ${originCity?.name} sem regressar vazio.`, 'success');
            }
          } else {
            // Own bus arrived! Make it available immediately at destination city
            localFleet = localFleet.map((b) => {
              if (b.id === trip.busId) {
                return { ...b, status: 'disponivel' as const, currentCityId: destCityId || b.currentCityId, availableSince: loopMinutes };
              }
              return b;
            });

            const bObj = localFleet.find((b) => b.id === trip.busId);
            const prefixVal = bObj ? `#${bObj.prefix}` : '';
            if (trip.isTransfer) {
              addLog(`Trânsito Concluído: Translado do ônibus ${prefixVal} (${bObj?.model}) na rota ${originCity?.name} ➔ ${destCity?.name} finalizado! O veículo chegou vazio e está disponível para uso em ${destCity?.name || 'Destino'}.`, 'success');
            } else {
              addLog(`Chegada Consorciada: Ônibus ${prefixVal} (${bObj?.model}) concluiu viagem (partida das ${trip.departureTime}) na rota completa ${originCity?.name} ➔ ${destCity?.name}. Passageiros desembarcaram com sucesso no Terminal de ${destCity?.name || 'Destino'}.`, 'success');
            }
          }

          // Compute final passenger count if stop details are present
          let activePassengers = trip.passengerCount;
          if (trip.stopDetails && trip.stopDetails.length > 0) {
            const oCount = trip.originalPassengerCount ?? trip.passengerCount;
            let runningCount = oCount;
            trip.stopDetails.forEach((stop, index) => {
              runningCount = runningCount - stop.deboarded + stop.boarded;
            });
            activePassengers = runningCount;
          }

          return { ...trip, progress: 100, status: 'concluida' as const, passengerCount: activePassengers };
        }

        // 2. Otherwise update progress of still active/programmed trips
        let currentStatus = trip.status;
        if (currentStatus === 'programada') {
          if (loopMinutes >= tripDepartMin) {
            currentStatus = 'em_curso';
          } else {
            return { ...trip, progress: 0 };
          }
        }

        const progress = Math.min(
          100,
          Math.max(0, ((loopMinutes - tripDepartMin) / duration) * 100)
        );

        let activePassengers = trip.passengerCount;
        if (trip.stopDetails && trip.stopDetails.length > 0) {
          const numStops = trip.stopDetails.length;
          const oCount = trip.originalPassengerCount ?? trip.passengerCount;
          let runningCount = oCount;
          
          trip.stopDetails.forEach((stop, index) => {
            const targetPct = ((index + 1) / (numStops + 1)) * 100;
            if (progress >= targetPct) {
              runningCount = runningCount - stop.deboarded + stop.boarded;
            }
          });
          activePassengers = runningCount;
        }

        return { ...trip, progress, status: currentStatus, passengerCount: activePassengers };
      });

      // 3. Scan schedules for departures 15 minutes in the future (futureMinutes = loopMinutes + 15)
      const futureMinutes = loopMinutes + 15;
      const futHour = Math.floor((futureMinutes % 1440) / 60);
      const futMin = (futureMinutes % 1440) % 60;
      const futDay = Math.floor(futureMinutes / 1440);
      
      const futureTimeStr = `${String(futHour).padStart(2, '0')}:${String(futMin).padStart(2, '0')}`;
      const dayOfWeek = ((futDay - 1) % 7) + 1;

      // Filter schedules matching this future departure time
      const matchingSchedules = schedules.filter((s) => s.departureTime === futureTimeStr);

      matchingSchedules.forEach((schedule) => {
        // Prevent double scaling for the exact same departure timestamp
        const tripExists = localTrips.some(
          (t) => t.scheduleId === schedule.id && t.departureTimestamp === futureMinutes
        );

        if (tripExists) return;

        // Validate frequencies filters
        let isApplicable = false;
        if (schedule.frequency === 'diaria') {
          isApplicable = true;
        } else if (schedule.frequency === 'seg-sex' && dayOfWeek >= 1 && dayOfWeek <= 5) {
          isApplicable = true;
        } else if (schedule.frequency === 'fds' && (dayOfWeek === 6 || dayOfWeek === 7)) {
          isApplicable = true;
        } else if (schedule.frequency === 'semanal' && dayOfWeek === 1) {
          isApplicable = true;
        }

        if (!isApplicable) return;

        const line = lines.find((l) => l.id === schedule.lineId);
        if (!line) return;

        const oCity = cities.find((c) => c.id === line.originCityId);
        const dCity = cities.find((c) => c.id === line.destinationCityId);

        // Find all parallel lines connecting the same origin and destination
        const matchingLines = lines.filter(
          (l) => l.originCityId === line.originCityId && l.destinationCityId === line.destinationCityId
        );
        // Pool the accumulated passengers across all these matching lines
        const totalDirectionAccumulated = matchingLines.reduce((sum, l) => sum + (localAccumulated[l.id] || 0), 0);

        const randomPassengers = calculateProjectedPassengers(futDay, line, oCity, dCity, "auto");
        const totalPassengers = randomPassengers + totalDirectionAccumulated;

        // Filter all available own buses currently stationary at the origin city of this line
        const availableBusesAtOrigin = localFleet.filter(
          (b) => !b.isPartner && b.currentCityId === line.originCityId && b.status === 'disponivel'
        );
        // Sort other vehicles by FIFO time waiting (longest waiting first, i.e., smallest availableSince first)
        availableBusesAtOrigin.sort((x, y) => (x.availableSince ?? 0) - (y.availableSince ?? 0));

        const targetServiceType = schedule.serviceType || line.serviceType || 'convencional';
        // Separating into category matches and other categories to prioritize correct services
        const matchingCategoryBuses = availableBusesAtOrigin.filter(b => (b.serviceType || 'convencional') === targetServiceType);
        const otherCategoryBuses = availableBusesAtOrigin.filter(b => (b.serviceType || 'convencional') !== targetServiceType);

        if (availableBusesAtOrigin.length === 0) {
          // CANCEL THE TRIP: No own bus available
          const newTrip: Trip = {
            id: `trip_cancel_${Math.random().toString(36).substring(2, 9)}`,
            lineId: line.id,
            scheduleId: schedule.id,
            busId: 'none',
            isPartnerTrip: false,
            departureTime: futureTimeStr,
            departureTimestamp: futureMinutes,
            estimatedArrivalTimestamp: futureMinutes + line.estimatedTime,
            progress: 0,
            status: 'cancelada',
            passengerCount: totalPassengers,
            originalPassengerCount: totalPassengers,
          };
          
          localTrips.unshift(newTrip);

          // Canceled trip: Add the new random passengers to the departing line's accumulated count
          localAccumulated[line.id] = (localAccumulated[line.id] || 0) + randomPassengers;

          addLog(`VIAGEM CANCELADA: Sem ônibus disponível para a rota completa de ${oCity?.name} para ${dCity?.name} às ${futureTimeStr}. ${randomPassengers} novos passageiros acumulados no polo de origem.`, 'error');

        } else {
          // Dispatch primary bus - matching category gets priority, other categories if missing (last resort)
          const primaryBus = matchingCategoryBuses.length > 0
            ? matchingCategoryBuses[0]
            : otherCategoryBuses[0];

          const isPrimaryMismatch = (primaryBus.serviceType || 'convencional') !== targetServiceType;
          const primaryMismatchAlert = isPrimaryMismatch
            ? `Incompatibilidade: Linha ${targetServiceType.toUpperCase()} atendida por veículo ${(primaryBus.serviceType || 'convencional').toUpperCase()}`
            : undefined;

          const capacity = primaryBus.capacity;
          const passengersOnPrimary = Math.min(capacity, totalPassengers);
          const excessPassengers = totalPassengers - passengersOnPrimary;

          // Determine extra bus dispatch
          let passengersOnExtra = 0;
          let extraBus: Bus | null = null;
          let extraTimeStr = '';
          let extraMinutes = 0;
          let isExtraMismatch = false;
          let extraMismatchAlert: string | undefined = undefined;

          if (excessPassengers >= 10) {
            const remainingBuses = availableBusesAtOrigin.filter(b => b.id !== primaryBus.id);
            const remainingMatching = remainingBuses.filter(b => (b.serviceType || 'convencional') === targetServiceType);
            const remainingOther = remainingBuses.filter(b => (b.serviceType || 'convencional') !== targetServiceType);

            if (remainingBuses.length > 0) {
              extraBus = remainingMatching.length > 0 ? remainingMatching[0] : remainingOther[0];
              passengersOnExtra = Math.min(extraBus.capacity, excessPassengers);
              isExtraMismatch = (extraBus.serviceType || 'convencional') !== targetServiceType;
              if (isExtraMismatch) {
                extraMismatchAlert = `Incompatibilidade: Linha ${targetServiceType.toUpperCase()} atendida por veículo extra ${(extraBus.serviceType || 'convencional').toUpperCase()}`;
              }
              
              extraMinutes = futureMinutes + 10;
              const extraHour = Math.floor((extraMinutes % 1440) / 60);
              const extraMin = (extraMinutes % 1440) % 60;
              extraTimeStr = `${String(extraHour).padStart(2, '0')}:${String(extraMin).padStart(2, '0')}`;
            }
          }

          // Calculate how many of the boarded passengers were from the accumulated pool
          const totalBoarded = passengersOnPrimary + passengersOnExtra;
          const totalBoardedAccumulated = Math.min(totalDirectionAccumulated, Math.max(0, totalBoarded - randomPassengers));

          // Deduct boarded accumulated passengers from matching lines sequentially
          let toDeduct = totalBoardedAccumulated;
          for (const mLine of matchingLines) {
            if (toDeduct <= 0) break;
            const val = localAccumulated[mLine.id] || 0;
            const mDeduct = Math.min(val, toDeduct);
            localAccumulated[mLine.id] = val - mDeduct;
            toDeduct -= mDeduct;
          }

          // Leftover passengers (unboarded queue)
          const totalLeftovers = totalPassengers - totalBoarded;
          // Add any new passenger surplus (unboarded portion of new demand) to the departing line
          const newSurplus = Math.max(0, totalLeftovers - (totalDirectionAccumulated - totalBoardedAccumulated));
          localAccumulated[line.id] = (localAccumulated[line.id] || 0) + newSurplus;

          // Compute stops
          const computedStops = line.stops && line.stops.length > 0
            ? generateStopDetails(futDay, line, cities, passengersOnPrimary, capacity)
            : undefined;

          // Dispatch the trip
          const newPrimaryTrip: Trip = {
            id: `trip_${Math.random().toString(36).substring(2, 9)}`,
            lineId: line.id,
            scheduleId: schedule.id,
            busId: primaryBus.id,
            isPartnerTrip: false,
            departureTime: futureTimeStr,
            departureTimestamp: futureMinutes,
            estimatedArrivalTimestamp: futureMinutes + line.estimatedTime,
            progress: 0,
            status: 'programada',
            passengerCount: passengersOnPrimary,
            originalPassengerCount: passengersOnPrimary,
            stopDetails: computedStops,
            isExtraTrip: false,
            categoryMismatch: isPrimaryMismatch,
            categoryMismatchAlert: primaryMismatchAlert,
          };

          localTrips.unshift(newPrimaryTrip);

          // Synchronously mark primary bus as 'em_viagem'
          localFleet = localFleet.map((b) => (b.id === primaryBus.id ? { ...b, status: 'em_viagem' as const } : b));

          addLog(`Fila de Prioridade: Ônibus #${primaryBus.prefix} (${primaryBus.model}) escalado para a linha completa ${oCity?.name} ➔ ${dCity?.name} (viagem das ${futureTimeStr}). Transportando ${passengersOnPrimary} passageiros (sendo ${totalBoardedAccumulated} retirados da fila geral do terminal).`, 'success');

          if (isPrimaryMismatch) {
            addLog(`DIVERGÊNCIA DE CATEGORIA: Escala automática alocou carro #${primaryBus.prefix} (${(primaryBus.serviceType || 'convencional').toUpperCase()}) na rota completa de categoria ${targetServiceType.toUpperCase()} (${oCity?.name} ➔ ${dCity?.name}) por falta de veículo ideal na origem.`, 'warning');
          }

          // Dispatch EXTRA TRIP/REINFORCEMENT
          if (excessPassengers >= 10) {
            if (extraBus) {
              const leftovers = excessPassengers - passengersOnExtra;

              const computedExtraStops = line.stops && line.stops.length > 0
                ? generateStopDetails(futDay, line, cities, passengersOnExtra, extraBus.capacity)
                : undefined;

              const newExtraTrip: Trip = {
                id: `trip_${Math.random().toString(36).substring(2, 9)}`,
                lineId: line.id,
                scheduleId: schedule.id,
                busId: extraBus.id,
                isPartnerTrip: false,
                departureTime: extraTimeStr,
                departureTimestamp: extraMinutes,
                estimatedArrivalTimestamp: extraMinutes + line.estimatedTime,
                progress: 0,
                status: 'programada',
                passengerCount: passengersOnExtra,
                originalPassengerCount: passengersOnExtra,
                stopDetails: computedExtraStops,
                isExtraTrip: true,
                categoryMismatch: isExtraMismatch,
                categoryMismatchAlert: extraMismatchAlert,
              };

              localTrips.unshift(newExtraTrip);

              // Synchronously mark extra bus as 'em_viagem'
              localFleet = localFleet.map((b) => (b.id === extraBus!.id ? { ...b, status: 'em_viagem' as const } : b));

              addLog(`VIAGEM EXTRA (REFORCO): Demanda excedente na linha completa ${oCity?.name} ➔ ${dCity?.name} disparou escala de ônibus extra #${extraBus.prefix} (${extraBus.model}) partindo às ${extraTimeStr}. Transportando ${passengersOnExtra} passageiros. ${leftovers > 0 ? `${leftovers} acumulados para a próxima.` : ''}`, 'warning');

              if (isExtraMismatch) {
                addLog(`DIVERGÊNCIA DE CATEGORIA (EXTRA): Reforço emergencial com carro #${extraBus.prefix} (${(extraBus.serviceType || 'convencional').toUpperCase()}) alocado na linha de categoria ${targetServiceType.toUpperCase()} (${oCity?.name} ➔ ${dCity?.name}).`, 'warning');
              }

            } else {
              // No extra own bus available.
              addLog(`CARGA COMPRIMIDA: Demanda excedente de ${excessPassengers} passageiros na rota completa ${oCity?.name} ➔ ${dCity?.name}, porém sem veículo extra sobressalente na garagem. Passageiros retidos no terminal.`, 'warning');
            }
          } else if (excessPassengers > 0) {
            addLog(`SOBRO DE CAPACIDADE: Demanda excedente (${excessPassengers} passageiros) na linha completa ${oCity?.name} ➔ ${dCity?.name} é inferior a 10. Mantidos no terminal para a próxima viagem de qualquer linha compatível.`, 'info');
          }
        }
      });
    }

    setSimTime(nextTime);
    setTrips(localTrips);
    setFleet(localFleet);
    setAccumulatedPassengers(localAccumulated);
  };

  // Dispatch dispatch wrapper callback
  const chromeDispatchTrip = (data: {
    lineId: string;
    scheduleId?: string;
    busId: string;
    isPartnerTrip: boolean;
    partnerCompanyId?: string;
    departureTime: string;
    departureTimestamp: number;
    passengerCount: number;
    status?: TripStatus;
    isExtraTrip?: boolean;
    categoryMismatch?: boolean;
    categoryMismatchAlert?: string;
  }) => {
    let actualBusId = data.busId;

    if (data.isPartnerTrip) {
      if (data.busId === 'partner') {
        const partnerCompany = partners.find((p) => p.id === data.partnerCompanyId) || partners[0] || { id: 'default', name: 'Parceiro', models: ['Campione Invictus'], baseCityId: '' };
        const newPartnerBusId = `partner_bus_${partnerCompany.id}_${Math.random().toString(36).substring(2, 9)}`;
        const initials = (partnerCompany.name || 'PRT').slice(0, 3).toUpperCase();
        const num = Math.floor(Math.random() * 900 + 100);
        const line = lines.find((l) => l.id === data.lineId);

        const newPartnerBus: Bus = {
          id: newPartnerBusId,
          prefix: `PAR-${initials}-${num}`,
          manufacturer: 'Comil',
          model: partnerCompany?.models?.[0] || 'Campione Invictus',
          year: 2023,
          capacity: 46,
          currentCityId: line?.originCityId || partnerCompany?.baseCityId || '',
          status: 'em_viagem',
          isPartner: true,
          partnerCompanyId: partnerCompany?.id,
          serviceType: line?.serviceType || 'convencional'
        };

        // Add to active fleet dynamically so that it can complete the trip and become available at destination
        setFleet((prev) => [...prev, newPartnerBus]);
        actualBusId = newPartnerBusId;
      }
    }

    const selectedBus = fleet.find((b) => b.id === actualBusId);
    const busCapacity = data.isPartnerTrip ? 46 : (selectedBus?.capacity || 46);
    const lineObj = lines.find((l) => l.id === data.lineId);
    const computedStops = lineObj && lineObj.stops && lineObj.stops.length > 0
      ? generateStopDetails(simTime.day, lineObj, cities, data.passengerCount, busCapacity)
      : undefined;

    const newTrip: Trip = {
      id: `trip_${Math.random().toString(36).substring(2, 9)}`,
      lineId: data.lineId,
      scheduleId: data.scheduleId,
      busId: actualBusId,
      isPartnerTrip: data.isPartnerTrip,
      partnerCompanyId: data.partnerCompanyId,
      departureTime: data.departureTime,
      departureTimestamp: data.departureTimestamp,
      estimatedArrivalTimestamp: data.departureTimestamp + (lines.find((l) => l.id === data.lineId)?.estimatedTime || 120),
      progress: 0,
      status: data.status || 'em_curso',
      passengerCount: data.passengerCount,
      originalPassengerCount: data.passengerCount,
      stopDetails: computedStops,
      isExtraTrip: data.isExtraTrip || false,
      categoryMismatch: data.categoryMismatch || false,
      categoryMismatchAlert: data.categoryMismatchAlert,
    };

    setTrips((prev) => {
      const next = [newTrip, ...prev];
      stateRef.current.trips = next;
      return next;
    });
  };

  // Manual Dispatch handler
  const handleManualDispatchCallback = (
    lineId: string,
    busId: string,
    isPartner: boolean,
    partnerId?: string,
    scheduleId?: string
  ) => {
    const line = lines.find((l) => l.id === lineId)!;
    const origin = cities.find((c) => c.id === line.originCityId);
    const dest = cities.find((c) => c.id === line.destinationCityId);

    const minutesEpoch = simTime.day * 1440 + simTime.hour * 60 + simTime.minute;
    const timeFormatted = `${String(simTime.hour).padStart(2, '0')}:${String(simTime.minute).padStart(2, '0')}`;

    // For anticipated schedules, we want to forecast passenger demand for the actual departure time
    let pCountByDemand = calculateProjectedPassengers(simTime.day, line, origin, dest, scheduleId ? "auto" : "manual");

    // Board pooled accumulated passengers across all lines serving same origin/destination
    // Note: for future schedules, we don't board the current live queue immediately at current hour.
    const matchingLines = lines.filter(
      (l) => l.originCityId === line.originCityId && l.destinationCityId === line.destinationCityId
    );
    
    let localAccumulated = { ...accumulatedPassengers };
    const totalDirectionAccumulated = scheduleId ? 0 : matchingLines.reduce((sum, l) => sum + (localAccumulated[l.id] || 0), 0);

    const capacity = fleet.find((b) => b.id === busId)?.capacity || 46;
    const totalPassengers = pCountByDemand + totalDirectionAccumulated;
    const passengersOnBus = Math.min(capacity, totalPassengers);

    let totalBoardedAccumulated = 0;
    if (!scheduleId) {
      // Deduct boarded accumulated passengers
      totalBoardedAccumulated = Math.min(totalDirectionAccumulated, Math.max(0, passengersOnBus - pCountByDemand));
      let toDeduct = totalBoardedAccumulated;
      for (const mLine of matchingLines) {
        if (toDeduct <= 0) break;
        const val = localAccumulated[mLine.id] || 0;
        const mDeduct = Math.min(val, toDeduct);
        localAccumulated[mLine.id] = val - mDeduct;
        toDeduct -= mDeduct;
      }

      // Leftovers calculation
      const leftovers = totalPassengers - passengersOnBus;
      const newSurplus = Math.max(0, leftovers - (totalDirectionAccumulated - totalBoardedAccumulated));
      localAccumulated[line.id] = (localAccumulated[line.id] || 0) + newSurplus;

      setAccumulatedPassengers(localAccumulated);
    }

    const ownBus = fleet.find((b) => b.id === busId);
    const isMismatch = ownBus ? ((ownBus.serviceType || 'convencional') !== (line.serviceType || 'convencional')) : false;
    const mismatchAlert = isMismatch && ownBus
      ? `Incompatibilidade: Linha ${(line.serviceType || 'convencional').toUpperCase()} atendida por veículo ${(ownBus.serviceType || 'convencional').toUpperCase()}`
      : undefined;

    // Check if we are anticipating a schedule
    let isAnticipated = false;
    let departureTimeStr = timeFormatted;
    let departureEpoch = minutesEpoch;
    let statusOfTrip: TripStatus = 'em_curso';

    if (scheduleId) {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule) {
        isAnticipated = true;
        departureTimeStr = schedule.departureTime;
        const [schH, schM] = schedule.departureTime.split(':').map(Number);
        departureEpoch = simTime.day * 1440 + schH * 60 + schM;
        // If the departure time has not arrived yet, we set it to 'programada'
        if (departureEpoch > minutesEpoch) {
          statusOfTrip = 'programada';
        }
      }
    }

    chromeDispatchTrip({
      lineId,
      busId,
      isPartnerTrip: isPartner,
      partnerCompanyId: partnerId,
      scheduleId,
      departureTime: departureTimeStr,
      departureTimestamp: departureEpoch,
      passengerCount: passengersOnBus,
      status: statusOfTrip,
      categoryMismatch: isMismatch,
      categoryMismatchAlert: mismatchAlert,
      isExtraTrip: !scheduleId,
    });

    setFleet((prev) => {
      const next = prev.map((b) => (b.id === busId ? { ...b, status: 'em_viagem' } : b));
      stateRef.current.fleet = next;
      return next;
    });

    if (isAnticipated) {
      addLog(`Controle Manual (Antecipado): Veículo #${ownBus?.prefix} (${ownBus?.model}) foi escalado antecipadamente para a partida das ${departureTimeStr} no trecho ${origin?.name} ➔ ${dest?.name}!`, 'success');
      if (isMismatch && ownBus) {
        addLog(`DIVERGÊNCIA DE CATEGORIA (ANTECIPADA): Ônibus #${ownBus.prefix} (${(ownBus.serviceType || 'convencional').toUpperCase()}) foi escalado na partida das ${departureTimeStr} de categoria ${(line.serviceType || 'convencional').toUpperCase()} (${origin?.name} ➔ ${dest?.name}) antecipadamente pelo CCO.`, 'warning');
      }
    } else {
      addLog(`Controle Manual: Ônibus #${ownBus?.prefix} (${ownBus?.model}) despachado manualmente na linha completa ${origin?.name} ➔ ${dest?.name}! Transportando ${passengersOnBus} passageiros (sendo ${totalBoardedAccumulated} retirados de passageiros que aguardavam no terminal).`, 'success');
      if (isMismatch && ownBus) {
        addLog(`DIVERGÊNCIA DE CATEGORIA: Ônibus #${ownBus.prefix} (${(ownBus.serviceType || 'convencional').toUpperCase()}) foi escalado na linha de categoria ${(line.serviceType || 'convencional').toUpperCase()} (${origin?.name} ➔ ${dest?.name}) por decisão excepcional do CCO.`, 'warning');
      }
    }
  };

  const handleArriveTripCallback = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    let destCityId = '';
    if (trip.isTransfer) {
      destCityId = trip.transferDestCityId || '';
    } else {
      const line = lines.find((l) => l.id === trip.lineId);
      destCityId = line?.destinationCityId || '';
    }

    const destCity = cities.find((c) => c.id === destCityId);

    setTrips((prev) => {
      const next = prev.map((t) => (t.id === tripId ? { ...t, progress: 100, status: 'concluida' as const } : t));
      stateRef.current.trips = next;
      return next;
    });

    const currentMinutes = simTime.day * 1440 + simTime.hour * 60 + simTime.minute;

    if (trip.isPartnerTrip) {
      const pComp = partners.find((p) => p.id === trip.partnerCompanyId);
      const isGoingHome = pComp && pComp.baseCityId === destCityId;

      setFleet((prevFleet) => {
        const pBus = prevFleet.find((b) => b.id === trip.busId);
        if (!pBus) return prevFleet;

        let next;
        if (isGoingHome) {
          // If returning to its own base city, we remove it from the trackable fleet
          next = prevFleet.filter((b) => b.id !== trip.busId);
        } else {
          // If at a guest dest city, make it available there for return trips
          next = prevFleet.map((b) =>
            b.id === trip.busId ? { ...b, status: 'disponivel', currentCityId: destCityId, availableSince: currentMinutes } : b
          );
        }
        stateRef.current.fleet = next;
        return next;
      });

      const pBus = fleet.find((b) => b.id === trip.busId);
      const prefixVal = pBus ? `#${pBus.prefix}` : 'Terceirizado';

      let origCityId = '';
      if (trip.isTransfer) {
        origCityId = trip.transferOriginCityId || '';
      } else {
        const line = lines.find((l) => l.id === trip.lineId);
        origCityId = line?.originCityId || '';
      }
      const origCity = cities.find((c) => c.id === origCityId);

      if (isGoingHome) {
        addLog(`Forçado: Ônibus parceiro ${prefixVal} de "${pComp?.name}" foi forçado a concluir a rota completa ${origCity?.name} ➔ ${destCity?.name} em sua base de origem ${destCity?.name || 'Destino'}.`, 'success');
      } else {
        addLog(`Forçado: Ônibus parceiro ${prefixVal} de "${pComp?.name}" encerrou a rota completa ${origCity?.name} ➔ ${destCity?.name} em ${destCity?.name || 'Destino'} e está disponível para a viagem de volta sem regressar vazio.`, 'success');
      }
    } else {
      setFleet((prev) => {
        const next = prev.map((b) =>
          b.id === trip.busId
            ? { ...b, status: 'disponivel', currentCityId: destCityId || b.currentCityId, availableSince: currentMinutes }
            : b
        );
        stateRef.current.fleet = next;
        return next;
      });
      const bObj = fleet.find((b) => b.id === trip.busId);
      
      let origCityId = '';
      if (trip.isTransfer) {
        origCityId = trip.transferOriginCityId || '';
      } else {
        const line = lines.find((l) => l.id === trip.lineId);
        origCityId = line?.originCityId || '';
      }
      const origCity = cities.find((c) => c.id === origCityId);

      if (trip.isTransfer) {
        addLog(`Forçado: Translado do ônibus próprio #${bObj?.prefix} (${bObj?.model}) na rota completa ${origCity?.name} ➔ ${destCity?.name} finalizado imediatamente em ${destCity?.name || 'Destino'} por comando do CCO.`, 'success');
      } else {
        addLog(`Forçado: Ônibus próprio #${bObj?.prefix} (${bObj?.model}) concluiu a rota completa ${origCity?.name} ➔ ${destCity?.name} imediatamente por comando do CCO.`, 'success');
      }
    }
  };

  // Run the clock ticking triggers based on selected speeds!
  useEffect(() => {
    if (simSpeed === 0) return;

    const intervalVal = 1000; // tick every 1000ms
    const timer = setInterval(() => {
      // 1x = advances 2m, 5x = advances 10m, 15x = advances 30m
      const stepMins = simSpeed === 15 ? 30 : simSpeed === 5 ? 10 : 2;
      advanceSimulation(stepMins);
    }, intervalVal);

    return () => clearInterval(timer);
  }, [simSpeed]);

  // Tab dynamic colors mapping
  const activeColorThemeClass = (() => {
    const tc = company?.themeColor || 'indigo';
    if (tc === 'emerald') return 'text-emerald-500 border-emerald-500 bg-emerald-500/10';
    if (tc === 'amber') return 'text-amber-500 border-amber-500 bg-amber-500/10';
    if (tc === 'rose') return 'text-rose-500 border-rose-500 bg-rose-500/10';
    if (tc === 'sky') return 'text-sky-500 border-sky-500 bg-sky-500/10';
    return 'text-indigo-400 border-indigo-500 bg-indigo-500/10';
  })();

  const btnThemeClass = (() => {
    const tc = company?.themeColor || 'indigo';
    if (tc === 'emerald') return 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10 text-white';
    if (tc === 'amber') return 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/10 text-slate-950';
    if (tc === 'rose') return 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/10 text-white';
    if (tc === 'sky') return 'bg-sky-600 hover:bg-sky-500 shadow-sky-500/10 text-white';
    return 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/10 text-white';
  })();

  const borderAccentClass = (() => {
    const tc = company?.themeColor || 'indigo';
    if (tc === 'emerald') return 'border-emerald-500/40 text-emerald-450';
    if (tc === 'amber') return 'border-amber-550/40 text-amber-400';
    if (tc === 'rose') return 'border-rose-500/40 text-rose-450';
    if (tc === 'sky') return 'border-sky-500/40 text-sky-450';
    return 'border-indigo-500/40 text-indigo-400';
  })();

  // Render Onboarding setup screen if company is not registered yet
  if (!company) {
    return <CompanySetup onSetupComplete={handleSetupComplete} />;
  }

  const logoAcronym = company.name ? company.name.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase() : 'EB';

  return (
    <div className="h-screen w-full bg-slate-100 flex overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-68 bg-slate-900 flex flex-col border-r border-slate-800 text-slate-300 shrink-0 select-none">
        
        {/* Sidebar Logo/Header */}
        <div className="p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center font-extrabold text-white text-lg tracking-wider shadow">
              {logoAcronym}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-white font-bold leading-none tracking-tight text-base truncate" title={company.name}>
                {company.name}
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Operação Logística</p>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold ${
              activeTab === 'dashboard'
                ? 'bg-blue-600/15 text-blue-400 border-l-4 border-blue-600'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={16} />
            <span>Painel de Controle (CCO)</span>
          </button>

          <button
            onClick={() => setActiveTab('cities')}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold ${
              activeTab === 'cities'
                ? 'bg-blue-600/15 text-blue-400 border-l-4 border-blue-600'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Globe size={16} />
            <span>Cidades ({cities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('lines')}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold ${
              activeTab === 'lines'
                ? 'bg-blue-600/15 text-blue-400 border-l-4 border-blue-600'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Map size={16} />
            <span>Linhas & Agendas ({lines.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold ${
              activeTab === 'fleet'
                ? 'bg-blue-600/15 text-blue-400 border-l-4 border-blue-600'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <BusIcon size={16} />
            <span>Frota Garagem ({fleet.filter(b => !b.isPartner).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('projection')}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold ${
              activeTab === 'projection'
                ? 'bg-blue-600/15 text-blue-400 border-l-4 border-blue-600'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={16} />
            <span className="flex items-center gap-1.5 justify-between w-full">
              <span>Projeção de Demanda</span>
              <span className="bg-blue-900/40 text-blue-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Prever</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold ${
              activeTab === 'completed'
                ? 'bg-blue-600/15 text-blue-400 border-l-4 border-blue-600'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 size={16} />
            <span className="flex items-center gap-1.5 justify-between w-full">
              <span>Viagens Concluídas</span>
              <span className="bg-emerald-950/60 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {trips.filter(t => t.status === 'concluida').length}
              </span>
            </span>
          </button>

          <div className="border-t border-slate-800/60 my-4" />

          <button
            onClick={handleReset}
            className="w-full text-left p-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Trash2 size={16} />
            <span>Recomeçar do Zero</span>
          </button>
        </nav>

        {/* Sidebar System Footer */}
        <div className="p-6 mt-auto border-t border-slate-800 shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-slate-350 font-bold tracking-wider uppercase">SISTEMA ONLINE</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>V1.4.2-DEF</span>
            <button
              onClick={handleReset}
              className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded transition-colors"
              title="Reiniciar Operação Completa"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10 transition-all">
          <div>
            <h2 className="text-lg font-extrabold text-slate-850 leading-none">{company.name}</h2>
            <p className="text-xs text-slate-500 mt-1">Sede Regional: {cities[0]?.name || 'Polo Inicial'}</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right border-r pr-6 border-slate-100 hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">Demanda Global</p>
              <p className="text-sm font-bold text-orange-600 mt-1 uppercase">Alta ({Math.min(100, Math.max(10, 50 + (trips.length * 4)))}%)</p>
            </div>

            <div className="text-right border-r pr-6 border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">Relógio do Sistema</p>
              <p className="text-sm font-bold text-slate-800 mt-1 font-mono">
                Dia {simTime.day} • {String(simTime.hour).padStart(2, '0')}:{String(simTime.minute).padStart(2, '0')}
              </p>
            </div>

            <div className="text-right hidden md:block">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">Frota em Trânsito</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {trips.filter(t => t.status === 'em_curso').length} / {fleet.length} active
              </p>
            </div>

            <UserAuthSection />
          </div>
        </header>

        {/* Inner Content Component (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex flex-col gap-6">
          
          {/* Global Centro de Controle Header Card */}
          <div className="sticky top-[-32px] z-30 p-6 bg-white border border-slate-200 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-strong md:items-center gap-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm">
                <Clock size={24} className={simSpeed > 0 ? 'animate-spin' : ''} style={{ animationDuration: simSpeed === 15 ? '3s' : simSpeed === 5 ? '8s' : '15s' }} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Centro de Controle - CCO</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h2 className="text-3xl font-black text-slate-900 font-mono tracking-wider">
                    {formatTimeStr(simTime.hour, simTime.minute)}
                  </h2>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full font-mono">
                    DIA {simTime.day} • {getDayPT(simTime.day).toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Sede operacional: <strong className="text-slate-700">{company.name}</strong> • Cidade-sede: <strong className="text-slate-700">{cities[0]?.name || 'Sede'}</strong>
                </p>
              </div>
            </div>

            {/* Speed Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 px-2 tracking-wider font-sans">Simulador</span>
              
              <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
                <button
                  onClick={() => setSimSpeed(0)}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    simSpeed === 0 ? 'bg-rose-500 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Pausar Operação"
                >
                  <Pause size={14} />
                </button>
                <button
                  onClick={() => setSimSpeed(1)}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    simSpeed === 1 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Velocidade Normal 1x"
                >
                  <Play size={14} />
                </button>
                <button
                  onClick={() => setSimSpeed(5)}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    simSpeed === 5 ? 'bg-amber-500 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Velocidade Acelerada 5x"
                >
                  <FastForward size={14} />
                </button>
                <button
                  onClick={() => setSimSpeed(15)}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    simSpeed === 15 ? 'bg-emerald-500 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Velocidade Máxima 15x"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 pl-1.5">
                <button
                  onClick={() => advanceSimulation(15)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  +15m
                </button>
                <button
                  onClick={() => advanceSimulation(60)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  +1h
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1">
            {activeTab === 'dashboard' && (
            <OpsDashboard
              company={company}
              cities={cities}
              fleet={fleet}
              lines={lines}
              schedules={schedules}
              trips={trips}
              logs={logs}
              partners={partners}
              simTime={simTime}
              simSpeed={simSpeed}
              setSimSpeed={setSimSpeed}
              onAdvanceTime={advanceSimulation}
              onManualDispatch={handleManualDispatchCallback}
              onSetStatus={handleUpdateBusStatus}
              onArriveTrip={handleArriveTripCallback}
              accumulatedPassengers={accumulatedPassengers}
            />
          )}

          {activeTab === 'cities' && (
            <CityManager
              cities={cities}
              partners={partners}
              fleet={fleet}
              simTime={simTime}
              onAddCity={handleAddCity}
              onDeleteCity={handleDeleteCity}
            />
          )}

          {activeTab === 'lines' && (
            <LineManager
              lines={lines}
              schedules={schedules}
              cities={cities}
              fleet={fleet}
              onAddLine={handleAddLine}
              onDeleteLine={handleDeleteLine}
              onAddSchedule={handleAddSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onUpdateSchedule={handleUpdateSchedule}
            />
          )}

          {activeTab === 'fleet' && (
            <FleetManager
              fleet={fleet}
              cities={cities}
              trips={trips}
              lines={lines}
              onAddBus={handleAddBus}
              onUpdateBusStatus={handleUpdateBusStatus}
              onUpdateBusLocation={handleUpdateBusLocation}
              onDeleteBus={handleDeleteBus}
              onStartTransferTrip={handleStartTransferTrip}
              onUpdateBusServiceType={handleUpdateBusServiceType}
            />
          )}

          {activeTab === 'projection' && (
            <DemandProjection
              cities={cities}
              lines={lines}
              schedules={schedules}
              partners={partners}
              trips={trips}
              simTime={simTime}
            />
          )}

          {activeTab === 'completed' && (
            <CompletedTrips
              trips={trips}
              lines={lines}
              fleet={fleet}
              cities={cities}
            />
          )}
          </div>
        </div>

        {/* Custom state-based Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-rose-600 mb-4">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-850">Recomeçar do Zero?</h3>
              </div>
              <p className="text-slate-650 text-xs mb-6 leading-relaxed">
                Atenção: Isso excluirá permanentemente todos os dados operacionais atuais da sua empresa <strong>"{company?.name}"</strong>, incluindo frotas rodoviárias, cidades polo adicionadas, agendas e viagens em trânsito. Você retornará à tela de onboarding inicial.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    handleRawReset();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  Sim, Apagar Tudo e Recomeçar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom state-based Delete City Confirmation Modal */}
        {deletingCityId !== null && (() => {
          const city = cities.find((c) => c.id === deletingCityId);
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3 text-amber-600 mb-4">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850">Excluir cidade?</h3>
                </div>
                <p className="text-slate-650 text-xs mb-6 leading-relaxed">
                  Você tem certeza que deseja excluir a cidade de <strong>"{city?.name} ({city?.state})"</strong>? Isso removerá automaticamente todas as linhas rodoviárias em trânsito, escalas operacionais e contratos de empresas parceiras associados a essa cidade.
                </p>
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => setDeletingCityId(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => executeDeleteCity(deletingCityId)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                  >
                    Excluir Polo Regional
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}

