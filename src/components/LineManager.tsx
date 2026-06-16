import React, { useState } from 'react';
import { Line, Schedule, City, DemandLevel, ScheduleFrequency, Bus, ServiceType } from '../types';
import { Map, Clock, HelpCircle, Plus, Trash2, ArrowRight, TrendingUp, AlertTriangle, Briefcase, Sparkles, Check, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

interface LineManagerProps {
  lines: Line[];
  schedules: Schedule[];
  cities: City[];
  fleet: Bus[];
  onAddLine: (line: Line, initialSchedules?: { departureTime: string; frequency: ScheduleFrequency; serviceType: ServiceType }[]) => void;
  onDeleteLine: (id: string) => void;
  onAddSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (id: string) => void;
  onUpdateSchedule?: (schedule: Schedule) => void;
}

const DEMAND_STRENGTHS: Record<DemandLevel, { label: string; text: string; bg: string; border: string; desc: string }> = {
  alta: { label: 'Alta', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', desc: 'Fator de ocupação estimado entre 80% e 100%' },
  media: { label: 'Média', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', desc: 'Fator de ocupação estimado entre 50% e 80%' },
  baixa: { label: 'Baixa', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', desc: 'Fator de ocupação estimado de até 50%' },
};

const SERVICE_DETAILS: Record<ServiceType, { label: string; bg: string; text: string; border: string }> = {
  convencional: { label: '🚌 Convencional', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  executivo: { label: '🌟 Executivo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-150' },
  leito: { label: '💤 Leito', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-150' },
};

export default function LineManager({
  lines,
  schedules,
  cities,
  fleet,
  onAddLine,
  onDeleteLine,
  onAddSchedule,
  onDeleteSchedule,
  onUpdateSchedule,
}: LineManagerProps) {
  const [originCityId, setOriginCityId] = useState('');
  const [destinationCityId, setDestinationCityId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('convencional');
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [lineError, setLineError] = useState('');

  // Schedules state
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [departureTime, setDepartureTime] = useState('08:00');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('diaria');
  const [schedServiceType, setSchedServiceType] = useState<ServiceType>('convencional');
  const [schedError, setSchedError] = useState('');

  // Editing Schedules state
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editDepartureTime, setEditDepartureTime] = useState('08:00');
  const [editFrequency, setEditFrequency] = useState<ScheduleFrequency>('diaria');
  const [editServiceType, setEditServiceType] = useState<ServiceType>('convencional');
  const [editSchedError, setEditSchedError] = useState('');

  // Initial schedules builder for line creation
  const [initialSchedules, setInitialSchedules] = useState<{ departureTime: string; frequency: ScheduleFrequency; serviceType: ServiceType }[]>([]);
  const [initialSchedTime, setInitialSchedTime] = useState('08:00');
  const [initialSchedFreq, setInitialSchedFreq] = useState<ScheduleFrequency>('diaria');
  const [initialSchedService, setInitialSchedService] = useState<ServiceType>('convencional');

  // Sync schedule default service type with line's default service type
  React.useEffect(() => {
    if (activeLineId) {
      const line = lines.find((l) => l.id === activeLineId);
      if (line) {
        setSchedServiceType(line.serviceType);
      }
    }
  }, [activeLineId, lines]);

  // Set default cities
  React.useEffect(() => {
    if (cities.length >= 2 && (!originCityId || !destinationCityId)) {
      setOriginCityId(cities[0].id);
      setDestinationCityId(cities[1].id);
    }
  }, [cities, originCityId, destinationCityId]);

  // Reset selected stops if origin or destination changes
  React.useEffect(() => {
    setSelectedStops([]);
  }, [originCityId, destinationCityId]);

  // Helper to calculate distance, duration and auto-demand
  const getLiveStats = () => {
    if (!originCityId || !destinationCityId) return null;
    const origin = cities.find(c => c.id === originCityId);
    const destination = cities.find(c => c.id === destinationCityId);
    if (!origin || !destination) return null;

    // Resolve stops
    const stopCities = selectedStops.map(id => cities.find(c => c.id === id)).filter((c): c is City => !!c);

    // Chain locations
    const chain = [origin, ...stopCities, destination];
    let distance = 0;

    for (let i = 0; i < chain.length - 1; i++) {
      const lat1 = chain[i].latitude ?? -23.5505;
      const lon1 = chain[i].longitude ?? -46.6333;
      const lat2 = chain[i+1].latitude ?? -23.5505;
      const lon2 = chain[i+1].longitude ?? -46.6333;
      distance += calculateDistanceKm(lat1, lon1, lat2, lon2);
    }

    // Time: 1 min per km (corresponding to 60km/h average) + 20 min per intermediate stop
    const stopsPenalty = stopCities.length * 20;
    const estimatedTime = Math.round(distance) + stopsPenalty;

    // Demand calculation
    const avgAttractiveness = ((origin.attractiveness || 50) + (destination.attractiveness || 50)) / 2;
    
    let vocationBonus = 0;
    const vocations = [origin.vocation, destination.vocation];
    if (vocations.includes('metropole')) vocationBonus += 25;
    if (vocations.includes('turismo')) vocationBonus += 15;
    if (vocations.includes('industrial')) vocationBonus += 10;
    if (origin.vocation === 'interior' && destination.vocation === 'interior') vocationBonus -= 15;

    let proximityBonus = 0;
    if (distance < 150) {
      proximityBonus += 20; // very high local flow
    } else if (distance >= 150 && distance <= 500) {
      proximityBonus += 10;
    } else if (distance > 800) {
      proximityBonus -= 15; // long haul
    }

    const demandScore = avgAttractiveness + vocationBonus + proximityBonus;
    let demandLevel: DemandLevel = 'media';
    if (demandScore >= 75) {
      demandLevel = 'alta';
    } else if (demandScore < 45) {
      demandLevel = 'baixa';
    }

    return {
      distance: Math.round(distance),
      estimatedTime,
      demandLevel,
      demandScore,
      stopCities,
    };
  };

  const liveStats = getLiveStats();

  const availableStopCities = cities.filter(
    c => c.id !== originCityId && c.id !== destinationCityId && !selectedStops.includes(c.id)
  );

  const handleAddStop = (cityId: string) => {
    if (!cityId) return;
    setSelectedStops([...selectedStops, cityId]);
  };

  const handleRemoveStop = (cityId: string) => {
    setSelectedStops(selectedStops.filter(id => id !== cityId));
  };

  const handleAddInitialSched = () => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(initialSchedTime)) {
      setLineError('Formato de hora de partida inválido para os horários iniciais. Use HH:MM.');
      return;
    }
    if (initialSchedules.some(s => s.departureTime === initialSchedTime && s.frequency === initialSchedFreq)) {
      setLineError('Este horário com esta mesma frequência já foi adicionado ao rascunho inicial.');
      return;
    }
    setInitialSchedules([...initialSchedules, {
      departureTime: initialSchedTime,
      frequency: initialSchedFreq,
      serviceType: initialSchedService
    }]);
    setLineError('');
  };

  const handleCreateLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originCityId || !destinationCityId) {
      setLineError('Defina as cidades de Origem e Destino.');
      return;
    }
    if (originCityId === destinationCityId) {
      setLineError('Operação inválida: Origem e Destino não podem ser iguais.');
      return;
    }

    if (!liveStats) {
      setLineError('Erro ao calcular rota.');
      return;
    }

    // Allow creating multiple lines with same origin/destination. We can check if a line with identical details exists and warn, but do not block.

    const newLine: Line = {
      id: `line_${Math.random().toString(36).substring(2, 9)}`,
      originCityId,
      destinationCityId,
      stops: liveStats.stopCities.map(c => c.name),
      estimatedTime: liveStats.estimatedTime,
      demand: liveStats.demandLevel,
      notes: notes.trim(),
      serviceType,
    };

    onAddLine(newLine, initialSchedules);
    setSelectedStops([]);
    setNotes('');
    setInitialSchedules([]);
    setShowAddForm(false);
    setLineError('');
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLineId) {
      setSchedError('Escolha uma linha para planejar o horário.');
      return;
    }

    // Time validation format HH:MM
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(departureTime)) {
      setSchedError('Formato de hora inválido. Utilize HH:MM.');
      return;
    }

    // Check duplicate schedule time on the same line
    const duplicate = schedules.some(
      (s) => s.lineId === activeLineId && s.departureTime === departureTime && s.frequency === frequency
    );
    if (duplicate) {
      setSchedError('Este horário já está cadastrado para esta linha específica.');
      return;
    }

    const newSchedule: Schedule = {
      id: `sched_${Math.random().toString(36).substring(2, 9)}`,
      lineId: activeLineId,
      departureTime,
      frequency,
      serviceType: schedServiceType,
    };

    onAddSchedule(newSchedule);
    setSchedError('');
  };

  const getScheduleDemandEstimation = (
    lineId: string,
    timeStr: string,
    freq: ScheduleFrequency,
    currentExcludeScheduleId?: string,
    overrideServiceType?: ServiceType
  ) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return null;

    // Part 1: Base Passengers based on line demand level
    let baseMin = 10;
    let baseMax = 25;
    if (line.demand === 'alta') {
      baseMin = 45;
      baseMax = 65;
    } else if (line.demand === 'media') {
      baseMin = 25;
      baseMax = 45;
    }

    // Part 2: Time of Day factor (Simulation context)
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const totalMinutes = hours * 60 + minutes;

    let timeMultiplier = 1.0;
    let timeLabel = 'Horário Comercial Padrão';

    if (hours >= 6 && hours < 9) {
      timeMultiplier = 1.25;
      timeLabel = 'Pico de Entrada/Trabalho (Demanda Elevada) 🚀';
    } else if (hours >= 17 && hours < 20) {
      timeMultiplier = 1.30;
      timeLabel = 'Pico do Fim do Dia/Retorno (Demanda Máxima) 🔥';
    } else if (hours >= 22 || hours < 5) {
      timeMultiplier = 0.50;
      timeLabel = 'Corujão Noturno (Baixo fluxo de passageiros) 💤';
    } else if (hours >= 11 && hours < 14) {
      timeMultiplier = 1.10;
      timeLabel = 'Transição de Meio-Dia (Fluxo Moderado) 🥪';
    }

    // Part 3: Service Type adjustment (Fewer or more seats)
    const activeService = overrideServiceType || line.serviceType;
    let serviceFactor = 1.0;
    const maxCapacity = activeService === 'leito' ? 26 : activeService === 'executivo' ? 42 : 50;
    
    if (activeService === 'leito') {
      serviceFactor = 0.65; // High comfort feel, fewer layouts
    } else if (activeService === 'executivo') {
      serviceFactor = 0.85;
    }

    // Part 4: Competition factor with other schedules on the SAME line ("Outros horários")
    const otherSchedules = schedules.filter(
      (s) => s.lineId === lineId && s.id !== currentExcludeScheduleId
    );

    let competitorsCount = 0;
    let competitionPenalty = 1.0;

    otherSchedules.forEach((other) => {
      const oParts = other.departureTime.split(':');
      const oH = parseInt(oParts[0], 10) || 0;
      const oM = parseInt(oParts[1], 10) || 0;
      const oTotalMinutes = oH * 60 + oM;

      const diff = Math.abs(totalMinutes - oTotalMinutes);
      const diffLabel = diff <= 120; // 2 hour range competition check
      if (diffLabel) {
        competitorsCount++;
        if (diff === 0) {
          competitionPenalty *= 0.45; // exact same hour
        } else if (diff <= 30) {
          competitionPenalty *= 0.60; // extremely close
        } else if (diff <= 60) {
          competitionPenalty *= 0.75; // close enough to share passengers
        } else if (diff <= 120) {
          competitionPenalty *= 0.88; // slight proximity dilution
        }
      }
    });

    const competitorFactor = Math.max(0.30, competitionPenalty);
    const finalMin = Math.max(4, Math.round(baseMin * timeMultiplier * serviceFactor * competitorFactor));
    const finalMax = Math.max(9, Math.round(baseMax * timeMultiplier * serviceFactor * competitorFactor));

    const pMin = Math.min(maxCapacity - 4, finalMin);
    const pMax = Math.min(maxCapacity, finalMax);

    let explanation = '';
    if (competitorsCount > 0) {
      explanation = `Composto por ${competitorsCount} outr${competitorsCount > 1 ? 'os' : 'o'} horário${competitorsCount > 1 ? 's' : ''} operando na mesma janela de 2h (diluição de demanda calculada em ${Math.round((1 - competitorFactor) * 100)}%).`;
    } else {
      explanation = 'Exclusividade do horário na faixa de 2h. Aproveitamento de 100% da demanda potencial da linha.';
    }

    const occupancyRate = Math.round(((pMin + pMax) / 2) / maxCapacity * 100);

    return {
      pMin,
      pMax,
      timeLabel,
      competitors: competitorsCount,
      competitorFactor,
      explanation,
      occupancyRate,
      maxCapacity,
    };
  };

  const handleUpdateScheduleSubmit = (schedId: string) => {
    if (!activeLineId) return;

    // Time validation format HH:MM
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(editDepartureTime)) {
      setEditSchedError('Formato de hora inválido. Utilize HH:MM.');
      return;
    }

    // Check duplicate schedule time on the same line (excluding itself)
    const duplicate = schedules.some(
      (s) => s.id !== schedId && s.lineId === activeLineId && s.departureTime === editDepartureTime && s.frequency === editFrequency
    );
    if (duplicate) {
      setEditSchedError('Este horário já está cadastrado para esta linha específica.');
      return;
    }

    if (onUpdateSchedule) {
      onUpdateSchedule({
        id: schedId,
        lineId: activeLineId,
        departureTime: editDepartureTime,
        frequency: editFrequency,
        serviceType: editServiceType,
      });
    }

    setEditingScheduleId(null);
    setEditSchedError('');
  };

  // Check schedules and trace operational conflicts & feasibility
  const checkScheduleFeasibility = (sched: Schedule, line: Line) => {
    const originCity = cities.find((c) => c.id === line.originCityId);
    
    // Find all own buses that are currently available in this specific origin city
    const availableOwnBuses = fleet.filter(
      (b) => !b.isPartner && b.currentCityId === line.originCityId && b.status === 'disponivel'
    );

    // Find if we have other departures scheduled at the exact same hour
    const conflictingSchedules = schedules.filter(
      (s) => s.id !== sched.id && s.departureTime === sched.departureTime
    );

    if (availableOwnBuses.length === 0) {
      return {
        viable: false,
        level: 'warning',
        message: `Sem frota própria disponível hoje em ${originCity?.name}. Operação com PARCEIRA terceirizada será acionada automaticamente para este horário.`,
      };
    }

    if (conflictingSchedules.length > 0 && availableOwnBuses.length < (conflictingSchedules.length + 1)) {
      return {
        viable: true,
        level: 'info',
        message: `Atenção: Existem ${conflictingSchedules.length} outros despachos neste mesmo horário. Elevado esforço de frota em ${originCity?.name}.`,
      };
    }

    return {
      viable: true,
      level: 'success',
      message: `Tudo certo! Existem ${availableOwnBuses.length} ônibus próprios aptos para partida livre na garagem de ${originCity?.name}.`,
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Map className="text-blue-600" size={20} />
            Configuração de Linhas Secundárias e Horários
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Defina rotas ligando as cidades operacionais, estabeleça tempos de viagem estimativos, configure horários livres e compõe planos de saída integrada.
          </p>
        </div>

        {cities.length < 2 ? (
          <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-2 rounded-lg border border-rose-150">
            Cadastre pelo menos duas cidades para desbloquear linhas operacionais!
          </span>
        ) : (
          <button
            onClick={() => { setShowAddForm(!showAddForm); setLineError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm hover:shadow-blue-500/15 transition-all"
            id="btn-toggle-add-line"
          >
            <Plus size={16} />
            {showAddForm ? 'Fechar Formulário' : 'Criar Nova Linha'}
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateLine} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Abertura de Linha Rodoviária</h3>
          
          {lineError && (
            <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 rounded-lg text-xs font-semibold">
              {lineError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cidade de Origem (Partida)</label>
              <select
                value={originCityId}
                onChange={(e) => setOriginCityId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                id="select-origin-city"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name} ({city.state})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cidade de Destino (Chegada)</label>
              <select
                value={destinationCityId}
                onChange={(e) => setDestinationCityId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                id="select-dest-city"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name} ({city.state})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serviço da Linha</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                id="select-service-type"
              >
                <option value="convencional">🚌 Convencional (Econômico)</option>
                <option value="executivo">🌟 Executivo (Conforto)</option>
                <option value="leito">💤 Leito Premium (Leito reclinável)</option>
              </select>
            </div>
          </div>

          {/* Intermediate Stops Builder (Chronological selectable stops) */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cidades de Escala (Paradas de Embarque)</label>
              <span className="text-[10px] text-blue-600 font-bold">+20 min por parada</span>
            </div>

            <div className="flex gap-2">
              <select
                onChange={(e) => {
                  handleAddStop(e.target.value);
                  e.target.value = ''; // Reset select
                }}
                defaultValue=""
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                id="select-stop-cities"
              >
                <option value="" disabled>Adicionar cidade para escala intermediária...</option>
                {availableStopCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    📍 {city.name} ({city.state}) — {city.vocation === 'metropole' ? '🏢 Metrópole' : city.vocation === 'turismo' ? '🏝️ Turismo' : city.vocation === 'industrial' ? '⚙️ Industrial' : '🏡 Interior'}
                  </option>
                ))}
              </select>
            </div>

            {selectedStops.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-250 rounded-lg">
                {selectedStops.map((stopId, index) => {
                  const stopCity = cities.find(c => c.id === stopId);
                  return (
                    <div key={stopId} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 shadow-sm">
                      <span className="text-[9px] bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-500">
                        {index + 1}ª
                      </span>
                      <span>{stopCity?.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(stopId)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer text-[10px] ml-1 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Nenhum ponto de escala intermediário. Viagem expressa direta.</p>
            )}
          </div>

          {/* Live route calculation preview block */}
          {liveStats && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-blue-600 animate-pulse" /> Telemetria de Viagem Automática
                </h4>
                <div className="text-[10px] text-blue-600 font-semibold bg-blue-100/60 px-2 py-0.5 rounded font-mono">60 km/h Média</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-250/75">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Distância Total</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">{liveStats.distance} km</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Calculada via satélite</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-250/75">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Tempo Estimado</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    {Math.floor(liveStats.estimatedTime / 60)}h {liveStats.estimatedTime % 60}m
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">+{selectedStops.length * 20}m adicionados</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-250/75">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Demanda Estimada</span>
                  <span className={`text-sm font-extrabold flex items-center gap-1 ${
                    liveStats.demandLevel === 'alta' ? 'text-rose-600' : liveStats.demandLevel === 'media' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {liveStats.demandLevel === 'alta' ? '🔥 Alta' : liveStats.demandLevel === 'media' ? '⚡ Média' : '🍃 Baixa'}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Socioeconômico: {Math.round(liveStats.demandScore)}</span>
                </div>
              </div>

              <p className="text-[10px] text-blue-700 leading-relaxed pt-1.5 border-t border-blue-100/50">
                💡 <strong>Previsão de Fluxo:</strong> Viagem entre <strong>{cities.find(c => c.id === originCityId)?.name}</strong> e <strong>{cities.find(c => c.id === destinationCityId)?.name}</strong>. Demanda calculada a partir de fatores populacionais, proximidade rodoviária e atratividade local.
              </p>
            </div>
          )}

          {/* Pre-configuração de Horários Iniciais com Serviços Diferentes */}
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pré-configurar Horários Iniciais (Diferentes serviços podem ser incluídos!)
              </label>
              <span className="text-[10px] text-indigo-600 font-bold">Opcional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-250">
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Horário (HH:MM)</label>
                <input
                  type="text"
                  placeholder="Ex: 14:00"
                  value={initialSchedTime}
                  onChange={(e) => setInitialSchedTime(e.target.value)}
                  maxLength={5}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Frequência</label>
                <select
                  value={initialSchedFreq}
                  onChange={(e) => setInitialSchedFreq(e.target.value as ScheduleFrequency)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none"
                >
                  <option value="diaria">Diário</option>
                  <option value="seg-sex">Segunda a Sexta</option>
                  <option value="fds">Final de Semana</option>
                  <option value="semanal">Semanal</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Serviço</label>
                <select
                  value={initialSchedService}
                  onChange={(e) => setInitialSchedService(e.target.value as ServiceType)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-850 focus:outline-none"
                >
                  <option value="convencional">🚌 Convencional</option>
                  <option value="executivo">🌟 Executivo</option>
                  <option value="leito">💤 Leito</option>
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleAddInitialSched}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  + Incluir Horário
                </button>
              </div>
            </div>

            {initialSchedules.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                {initialSchedules.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 shadow-sm animate-fade-in">
                    <span className="font-mono bg-indigo-50 border border-indigo-100/60 text-indigo-700 rounded px-1.5 py-0.5 text-[10px] font-bold animate-pulse">
                      {s.departureTime}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {s.frequency === 'diaria' ? 'diária' : s.frequency}
                    </span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 rounded border ${
                      s.serviceType === 'leito'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : s.serviceType === 'executivo'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {s.serviceType}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInitialSchedules(initialSchedules.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer text-[10px] ml-1 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observações Operacionais</label>
            <textarea
              placeholder="Ex: Alerta de trecho sinuoso em serra, pista simples no km 40..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              id="input-notes"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setLineError(''); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              id="submit-new-line"
            >
              Registrar Nova Linha
            </button>
          </div>
        </form>
      )}

      {/* Main interface grid layout - Spanned full width */}
      <div className="w-full">
        
        {/* Lines Grid section */}
        <div className="space-y-4 w-full">
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Linhas Disponíveis ({lines.length})</span>
            <span className="text-[10px] text-slate-450 font-medium">Clique em uma linha para abrir a central de controle de horários (balão)</span>
          </div>

          {lines.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 border-dashed rounded-xl shadow-xs">
              <p className="text-slate-500 text-xs">Nenhuma linha cadastrada ainda no plano rodoviário.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {lines.map((line) => {
                const origin = cities.find((c) => c.id === line.originCityId);
                const dest = cities.find((c) => c.id === line.destinationCityId);
                const lineScheds = schedules.filter((s) => s.lineId === line.id);
                const isSelected = activeLineId === line.id;

                const dOpt = DEMAND_STRENGTHS[line.demand];

                return (
                  <div
                    key={line.id}
                    className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                      isSelected
                        ? 'bg-blue-50/40 border-blue-500 shadow-sm ring-1 ring-blue-500/10'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                    onClick={() => setActiveLineId(line.id)}
                    id={`line-card-${line.id}`}
                  >
                    
                    {/* Select Indicator */}
                    {isSelected && (
                      <span className="absolute top-4 right-12 text-[10px] bg-blue-50 text-blue-700 border border-blue-150 px-2 py-0.5 rounded font-black tracking-wider uppercase font-mono">
                        Selecionada
                      </span>
                    )}

                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-800 flex-wrap">
                          <strong className="text-sm font-extrabold group-hover:text-blue-600 transition-colors">
                            {origin ? origin.name : 'Desconhecida'}
                          </strong>
                          <ArrowRight size={13} className="text-slate-400" />
                          <strong className="text-sm font-extrabold group-hover:text-amber-600 transition-colors">
                            {dest ? dest.name : 'Desconhecida'}
                          </strong>
                          {(() => {
                            const svc = SERVICE_DETAILS[line.serviceType || 'convencional'];
                            return (
                              <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border ml-1.5 shadow-sm ${svc.bg} ${svc.text} ${svc.border}`}>
                                {svc.label}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Stops display */}
                        {line.stops.length > 0 ? (
                          <p className="text-[10px] text-slate-500 max-w-md">
                            Via: <strong className="text-slate-700">{line.stops.join(' • ')}</strong>
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">Viagem direta sem paradas intermediárias.</p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeLineId === line.id) setActiveLineId(null);
                          onDeleteLine(line.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                        title="Eliminar Linha"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 text-[9px] uppercase tracking-wider block font-semibold">Fator Viagem</span>
                        <p className="font-semibold text-slate-750 flex items-center gap-1 font-mono">
                          <Clock size={11} className="text-blue-500" />
                          {Math.floor(line.estimatedTime / 60)}h {line.estimatedTime % 60}m
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] uppercase tracking-wider block font-semibold">Demanda Estimada</span>
                        <p className={`font-bold uppercase text-[10px] ${dOpt.text}`}>
                          {dOpt.label}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] uppercase tracking-wider block font-semibold">Frequências</span>
                        <p className="font-semibold text-slate-750 font-mono">
                          {lineScheds.length} saídas
                        </p>
                      </div>
                    </div>

                    {line.notes && isSelected && (
                      <p className="mt-3 p-2 bg-slate-50 border border-slate-150 rounded text-[10px] text-slate-600 leading-normal font-sans">
                        <strong>Obs:</strong> {line.notes}
                      </p>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Floating Schedules Balloon Modal with Frosted Backdrop Overlay */}
      <AnimatePresence>
        {activeLineId && (() => {
          const line = lines.find((l) => l.id === activeLineId);
          if (!line) return null;
          const origin = cities.find((c) => c.id === line.originCityId);
          const dest = cities.find((c) => c.id === line.destinationCityId);
          const lineScheds = schedules.filter((s) => s.lineId === line.id);

          return (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
              onClick={() => setActiveLineId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col font-sans overflow-hidden"
                id="schedule-balloon-modal"
              >
                
                {/* Modal Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block font-mono">Central de Horários & Serviços</span>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                      <span>{origin?.name || 'Origem'}</span>
                      <ArrowRight size={14} className="text-slate-400" />
                      <span>{dest?.name || 'Destino'}</span>
                    </h3>
                  </div>
                  <button 
                    onClick={() => setActiveLineId(null)}
                    className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Scrollable Content Container */}
                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                  
                  {/* Create New Schedule Form Section */}
                  <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-150 space-y-4">
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">Programar Nova Partida (Saída)</span>
                    
                    {schedError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 rounded text-[11px] font-medium">
                        {schedError}
                      </div>
                    )}

                    <form onSubmit={handleCreateSchedule} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Horário (HH:MM)</label>
                          <input
                            type="text"
                            placeholder="Ex: 08:30"
                            value={departureTime}
                            onChange={(e) => setDepartureTime(e.target.value)}
                            maxLength={5}
                            className="w-full text-center px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono shadow-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Frequência</label>
                          <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs leading-normal font-medium text-slate-850 focus:outline-none focus:border-blue-500 shadow-xs"
                          >
                            <option value="diaria">Saídas Diárias</option>
                            <option value="seg-sex">Segunda a Sexta</option>
                            <option value="fds">Finais de Semana</option>
                            <option value="semanal">Semanal</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Serviço</label>
                          <select
                            value={schedServiceType}
                            onChange={(e) => setSchedServiceType(e.target.value as ServiceType)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-850 focus:outline-none focus:border-blue-500 shadow-xs"
                          >
                            <option value="convencional">🚌 Convencional</option>
                            <option value="executivo">🌟 Executivo</option>
                            <option value="leito">💤 Leito</option>
                          </select>
                        </div>
                      </div>

                      {/* Demand simulation helper projection */}
                      {(() => {
                        const liveDemandEst = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(departureTime)
                          ? getScheduleDemandEstimation(activeLineId, departureTime, frequency, undefined, schedServiceType)
                          : null;

                        if (!liveDemandEst) return null;

                        return (
                          <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-lg border border-blue-100/50 space-y-1.5 text-[11px] animate-fadeIn">
                            <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block font-mono flex items-center gap-1">
                              <TrendingUp size={11} className="text-indigo-600 font-bold" /> Projeção de Demanda Estimada
                            </span>
                            <div className="flex justify-between items-baseline font-semibold mt-1">
                              <span className="text-slate-500 font-medium font-sans">Frota sugerida:</span>
                              <span className="text-slate-700 font-mono capitalize">{schedServiceType}</span>
                            </div>
                            <div className="flex justify-between items-baseline font-bold animate-pulse">
                              <span className="text-slate-500 font-medium font-sans">Passageiros esperados:</span>
                              <span className="text-indigo-700 font-mono">{liveDemandEst.pMin} a {liveDemandEst.pMax} pax</span>
                            </div>
                            <div className="flex justify-between items-baseline font-bold">
                              <span className="text-slate-500 font-medium font-sans">Ocupação Média Est.:</span>
                              <span className="text-indigo-700 font-mono">{liveDemandEst.occupancyRate}%</span>
                            </div>
                            <div className="text-[9px] font-bold text-slate-700 bg-white/90 p-1 px-1.5 rounded border border-indigo-150/40 text-[9px] inline-block mt-0.5">
                              🏷️ {liveDemandEst.timeLabel}
                            </div>
                            <p className="text-[9px] leading-relaxed text-slate-500 font-medium pt-1 border-t border-indigo-150/20">
                              {liveDemandEst.explanation}
                            </p>
                          </div>
                        );
                      })()}

                      <button
                        type="submit"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                        id="btn-add-schedule"
                      >
                        <Plus size={14} /> Confirmar & Adicionar Horário
                      </button>
                    </form>
                  </div>

                  {/* Operational Agenda / Existing Schedules list */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Agenda Operacional Existente ({lineScheds.length})</span>

                    {lineScheds.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-slate-150 border-dashed rounded-lg">
                        <p className="text-slate-455 text-[11px]">Nenhum horário cadastrado para esta linha ainda.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {lineScheds.map((sched) => {
                          const check = checkScheduleFeasibility(sched, line);

                          // In-place editing schedule block
                          if (editingScheduleId === sched.id) {
                            const liveEditDemandEst = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(editDepartureTime)
                              ? getScheduleDemandEstimation(sched.lineId, editDepartureTime, editFrequency, sched.id, editServiceType)
                              : null;

                            return (
                              <div
                                key={sched.id}
                                className="p-4 bg-indigo-50/40 border border-indigo-400 rounded-xl space-y-3 shadow-sm"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] uppercase font-black text-indigo-700 flex items-center gap-1">
                                    <Edit2 size={11} /> Ajustar Horário
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono">ID: {sched.id}</span>
                                </div>

                                {editSchedError && (
                                  <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 rounded text-[10px] font-bold">
                                    {editSchedError}
                                  </div>
                                )}

                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Horário (HH:MM)</label>
                                    <input
                                      type="text"
                                      value={editDepartureTime}
                                      onChange={(e) => setEditDepartureTime(e.target.value)}
                                      maxLength={5}
                                      className="w-full text-center px-2 py-1 bg-white border border-slate-200 rounded font-bold text-xs text-slate-800 font-mono"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Frequência</label>
                                    <select
                                      value={editFrequency}
                                      onChange={(e) => setEditFrequency(e.target.value as ScheduleFrequency)}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-850 focus:outline-none"
                                    >
                                      <option value="diaria">Saídas Diárias</option>
                                      <option value="seg-sex">Segunda a Sexta</option>
                                      <option value="fds">Finais de Semana</option>
                                      <option value="semanal">Semanal</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Serviço</label>
                                    <select
                                      value={editServiceType}
                                      onChange={(e) => setEditServiceType(e.target.value as ServiceType)}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-850 font-bold focus:outline-none"
                                    >
                                      <option value="convencional">🚌 Convencional</option>
                                      <option value="executivo">🌟 Executivo</option>
                                      <option value="leito">💤 Leito</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Dynamic forecasting under Editing */}
                                {liveEditDemandEst && (
                                  <div className="p-2.5 bg-white border border-indigo-100 rounded-lg text-[10.5px] space-y-1">
                                    <div className="flex justify-between font-bold">
                                      <span className="text-slate-500 font-sans">Ocupação Corrigida:</span>
                                      <span className="text-indigo-700 font-mono">{liveEditDemandEst.pMin}–{liveEditDemandEst.pMax} pax ({liveEditDemandEst.occupancyRate}%)</span>
                                    </div>
                                    <div className="text-[8px] font-semibold text-slate-700 bg-slate-50 p-0.5 px-1 rounded block mt-0.5 max-w-max">
                                      {liveEditDemandEst.timeLabel}
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-tight italic pt-0.5">{liveEditDemandEst.explanation}</p>
                                  </div>
                                )}

                                <div className="flex gap-2 justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingScheduleId(null)}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer font-sans"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateScheduleSubmit(sched.id)}
                                    className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer font-sans"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          // Ordinary read-only card layout
                          const est = getScheduleDemandEstimation(sched.lineId, sched.departureTime, sched.frequency, sched.id, sched.serviceType || line.serviceType);

                          return (
                            <div
                              key={sched.id}
                              className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl relative group flex flex-col gap-2 shadow-xs transition-all"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 flex-wrap text-slate-800">
                                  <span className="py-0.5 px-2 bg-blue-50 text-blue-700 border border-blue-105 rounded font-mono font-bold text-xs">
                                    {sched.departureTime}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold bg-slate-50 border border-slate-200 py-0.5 px-1.5 rounded text-slate-550 font-mono">
                                    {sched.frequency === 'diaria' ? 'Diário' : sched.frequency}
                                  </span>
                                  <span className={`text-[9.5px] uppercase font-bold py-0.5 px-1.5 rounded border ${
                                    (sched.serviceType || line.serviceType || 'convencional') === 'leito'
                                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                                      : (sched.serviceType || line.serviceType || 'convencional') === 'executivo'
                                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {(sched.serviceType || line.serviceType || 'convencional') === 'convencional' ? '🚌 Convencional' : (sched.serviceType || line.serviceType || 'convencional') === 'executivo' ? '🌟 Executivo' : '💤 Leito'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingScheduleId(sched.id);
                                      setEditDepartureTime(sched.departureTime);
                                      setEditFrequency(sched.frequency);
                                      setEditServiceType(sched.serviceType || line.serviceType || 'convencional');
                                      setEditSchedError('');
                                    }}
                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded p-1 transition-colors cursor-pointer"
                                    title="Editar horário"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => onDeleteSchedule(sched.id)}
                                    className="text-slate-400 hover:text-rose-500 hover:bg-rose-550 rounded p-1 transition-colors cursor-pointer"
                                    title="Remover horário"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              {est && (
                                <div className="text-[10px] text-slate-600 bg-slate-50/55 border border-slate-100 p-2 rounded-lg flex flex-col gap-1">
                                  <div className="flex justify-between items-baseline">
                                    <span className="font-semibold text-slate-500 font-sans">Demanda Projetada:</span>
                                    <span className="font-mono font-bold text-indigo-700">{est.pMin}–{est.pMax} pax ({est.occupancyRate}% Ocupação)</span>
                                  </div>
                                  <p className="text-[8.5px] leading-relaxed text-slate-450 italic pt-0.5 border-t border-slate-100">
                                    {est.explanation}
                                  </p>
                                </div>
                              )}

                              <div className={`flex gap-1.5 items-start p-2 rounded border text-[10px] ${
                                check.level === 'warning'
                                  ? 'bg-rose-50 border-rose-100 text-rose-700'
                                  : check.level === 'info'
                                  ? 'bg-amber-50 border-amber-100 text-amber-700'
                                  : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              }`}>
                                {check.level === 'warning' ? (
                                  <AlertTriangle size={12} className="text-rose-550 flex-shrink-0 mt-0.5" />
                                ) : check.level === 'info' ? (
                                  <AlertTriangle size={12} className="text-amber-550 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Check size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="leading-snug font-medium font-sans">
                                  {check.message}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
