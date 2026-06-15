import React, { useState, useEffect } from 'react';
import { Company, City, Bus, Line, Schedule, Trip, SystemLog, PartnerCompany } from '../types';
import {
  Clock, Play, Pause, FastForward, CheckCircle2, AlertCircle,
  Truck, ArrowRight, UserCheck, RefreshCw, Send, AlertTriangle, ShieldCheck, MapPin, HelpCircle
} from 'lucide-react';
import BusHistoryModal from './BusHistoryModal';

interface OpsDashboardProps {
  company: Company;
  cities: City[];
  fleet: Bus[];
  lines: Line[];
  schedules: Schedule[];
  trips: Trip[];
  logs: SystemLog[];
  partners: PartnerCompany[];
  simTime: { hour: number; minute: number; day: number };
  simSpeed: number; // 0 = paused, 1 = 1x (ticks every 1s by 1m), 5 = 5x, 15 = 15x
  setSimSpeed: (speed: number) => void;
  onAdvanceTime: (minutes: number) => void;
  onManualDispatch: (lineId: string, busId: string, isPartner: boolean, partnerId?: string, scheduleId?: string) => void;
  onSetStatus: (busId: string, status: 'disponivel' | 'em_viagem' | 'em_manutencao' | 'reserva') => void;
  onArriveTrip: (tripId: string) => void;
  accumulatedPassengers?: Record<string, number>;
}











export default function OpsDashboard({
  company,
  cities,
  fleet,
  lines,
  schedules,
  trips,
  logs,
  partners,
  simTime,
  simSpeed,
  setSimSpeed,
  onAdvanceTime,
  onManualDispatch,
  onSetStatus,
  onArriveTrip,
  accumulatedPassengers = {},
}: OpsDashboardProps) {
  
  const [manualLineId, setManualLineId] = useState('');
  const [manualBusId, setManualBusId] = useState('');
  const [showManualDispatch, setShowManualDispatch] = useState(false);
  const [manualError, setManualError] = useState('');
  const [dispatchMode, setDispatchMode] = useState<'immediate' | 'future'>('immediate');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [futureAllocations, setFutureAllocations] = useState<Record<string, string>>({});
  const [selectedBusForHistory, setSelectedBusForHistory] = useState<Bus | null>(null);

  // Auto set first options in manual dispatch form
  useEffect(() => {
    if (lines.length > 0 && !manualLineId) {
      setManualLineId(lines[0].id);
    }
  }, [lines, manualLineId]);

  // Read future departures of today
  const getFutureSchedules = () => {
    const dayOfWeek = ((simTime.day - 1) % 7) + 1; // 1 = Segunda, 7 = Domingo
    const currentMinOfDay = simTime.hour * 60 + simTime.minute;

    return schedules.filter((sch) => {
      // Check if active today
      let isApplicable = false;
      if (sch.frequency === 'diaria') {
        isApplicable = true;
      } else if (sch.frequency === 'seg-sex' && dayOfWeek >= 1 && dayOfWeek <= 5) {
        isApplicable = true;
      } else if (sch.frequency === 'fds' && (dayOfWeek === 6 || dayOfWeek === 7)) {
        isApplicable = true;
      } else if (sch.frequency === 'semanal' && dayOfWeek === 1) {
        isApplicable = true;
      }
      if (!isApplicable) return false;

      // Check if already dispatched/allocated today
      const alreadyDispatched = trips.some(
        (t) => t.scheduleId === sch.id && Math.floor(t.departureTimestamp / 1440) === simTime.day
      );
      if (alreadyDispatched) return false;

      // Check if departure time is in the future
      const [schH, schM] = sch.departureTime.split(':').map(Number);
      const schMinutesVal = schH * 60 + schM;

      return schMinutesVal > currentMinOfDay;
    }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  };

  // Find available buses based on the chosen line's origin city
  const chosenLine = lines.find((l) => l.id === manualLineId);
  const availableBuses = chosenLine
    ? fleet.filter((b) => !b.isPartner && b.currentCityId === chosenLine.originCityId && b.status === "disponivel")
    : [];

  useEffect(() => {
    if (availableBuses.length > 0) {
      setManualBusId(availableBuses[0].id);
    } else {
      setManualBusId('');
    }
  }, [manualLineId, chosenLine]);

  const handleManualDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLineId) {
      setManualError('Selecione uma linha para a operação.');
      return;
    }

    if (dispatchMode === 'future' && !selectedScheduleId) {
      setManualError('Selecione uma partida futura para escalar.');
      return;
    }

    if (manualBusId) {
      onManualDispatch(
        manualLineId,
        manualBusId,
        false,
        undefined,
        dispatchMode === 'future' ? selectedScheduleId : undefined
      );
      setShowManualDispatch(false);
      setManualError('');
      setSelectedScheduleId('');
    } else {
      setManualError('Nenhum ônibus próprio livre nesta garagem de origem.');
    }
  };

  // Format hour / minute strings
  const formatTimeStr = (h: number, m: number) => {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getDayPT = (day: number) => {
    const WEEKDAYS_PT = [
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
      'Domingo'
    ];
    return WEEKDAYS_PT[(day - 1) % 7];
  };

  // Counts helpers
  const activeTripsCount = trips.filter((t) => t.status === 'em_curso' || t.status === 'programada').length;
  const dispatchThisDay = trips.length;
  const ownFleetCount = fleet.filter((b) => !b.isPartner).length;
  const fleetTraveling = fleet.filter((b) => !b.isPartner && b.status === "em_viagem").length;

  return (
    <div className="space-y-6">

      {/* 4. Action Buttons & Active Trips Column (Moved to top below stats row) */}
      <div className="space-y-6">
        
        {/* Active Trips Card Grid */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mural das Viagens em Curso ({activeTripsCount})</span>
            
            <button
              onClick={() => { setShowManualDispatch(!showManualDispatch); setManualError(''); }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              id="dispatch-manual-btn"
            >
              <Send size={12} />
              Despache Manual
            </button>
          </div>

          {/* Manual Dispatch Form Panel */}
          {showManualDispatch && (
            <form onSubmit={handleManualDispatchSubmit} className="p-5 bg-white rounded-xl border border-slate-200 space-y-4 text-xs shadow-sm animate-fadeIn">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Despachar Ônibus Manualmente</h4>
              
              {cities.length < 2 || lines.length === 0 ? (
                <p className="text-rose-600 bg-rose-50 p-3 rounded border border-rose-100 font-bold text-[11px]">
                  Operação indisponível: Você precisa possuir cidades e pelo menos uma linha configurada primeiro!
                </p>
              ) : (
                <div className="space-y-3">
                  {manualError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 rounded font-medium">
                      {manualError}
                    </div>
                  )}

                  {/* Mode Selector */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col gap-2 animate-fadeIn">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Tipo de Escala</span>
                    <div className="flex gap-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setDispatchMode('immediate');
                          setSelectedScheduleId('');
                          if (lines.length > 0) {
                            setManualLineId(lines[0].id);
                          }
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                          dispatchMode === 'immediate'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                        }`}
                      >
                        ⚡ Despacho Imediato
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDispatchMode('future');
                          const fut = getFutureSchedules();
                          if (fut.length > 0) {
                            setSelectedScheduleId(fut[0].id);
                            setManualLineId(fut[0].lineId);
                          } else {
                            setSelectedScheduleId('');
                          }
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-md font-bold text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                          dispatchMode === 'future'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                        }`}
                      >
                        📅 Escalar Partida Futura ({getFutureSchedules().length})
                      </button>
                    </div>
                  </div>

                  {dispatchMode === 'future' ? (
                    <div className="space-y-3 animate-fadeIn">
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
                        Lista de Partidas Futuras Disponíveis (Hoje)
                      </span>
                      {getFutureSchedules().length === 0 ? (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 text-center rounded-xl italic">
                          Nenhuma partida futura programada disponível para hoje.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {getFutureSchedules().map((sch) => {
                            const ln = lines.find((l) => l.id === sch.lineId);
                            if (!ln) return null;
                            const oCity = cities.find((c) => c.id === ln.originCityId);
                            const dCity = cities.find((c) => c.id === ln.destinationCityId);

                            // Find buses physically at origin city of this line that are 'disponivel' or 'reserva'
                            const localAvailableBuses = fleet.filter(
                              (b) => !b.isPartner && b.currentCityId === ln.originCityId && (b.status === 'disponivel' || b.status === 'reserva')
                            );

                            const selectedBusForSch = futureAllocations[sch.id] || (localAvailableBuses[0]?.id || '');

                            const listDisplayService = ln.serviceType === 'convencional' 
                              ? 'Convencional' 
                              : ln.serviceType === 'executivo' 
                                ? 'Executivo' 
                                : 'Leito';

                            return (
                              <div
                                key={sch.id}
                                className="p-3 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                              >
                                {/* Left side detail */}
                                <div className="space-y-0.5 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-blue-600 text-white font-mono font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                                      {sch.departureTime}
                                    </span>
                                    <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${
                                      ln.serviceType === 'leito'
                                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                                        : ln.serviceType === 'executivo'
                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                      {listDisplayService}
                                    </span>
                                  </div>
                                  <h5 className="font-extrabold text-slate-800 text-xs mt-1">
                                    {oCity?.name} ➔ {dCity?.name}
                                  </h5>
                                  <span className="text-[10px] text-slate-400 font-sans block">
                                    Origem: {oCity?.name} ({oCity?.state})
                                  </span>
                                </div>

                                {/* Right side allocation controls */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {localAvailableBuses.length === 0 ? (
                                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                                      Sem carros em {oCity?.name}
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={selectedBusForSch}
                                        onChange={(e) => {
                                          setFutureAllocations((prev) => ({
                                            ...prev,
                                            [sch.id]: e.target.value,
                                          }));
                                        }}
                                        className="text-[10px] bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 font-bold"
                                      >
                                        <option value="">Selecione...</option>
                                        {localAvailableBuses.map((b) => (
                                          <option key={b.id} value={b.id}>
                                            #{b.prefix} ({b.model}) - {b.status === 'reserva' ? 'Reserva' : 'Disponível'}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        disabled={!selectedBusForSch}
                                        onClick={() => {
                                          if (selectedBusForSch) {
                                            onManualDispatch(sch.lineId, selectedBusForSch, false, undefined, sch.id);
                                            setShowManualDispatch(false);
                                          }
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg px-2.5 py-1 text-[10px] font-black uppercase transition-all shadow-xs cursor-pointer"
                                      >
                                        Escalar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="p-3 bg-blue-50/80 border border-blue-200/50 text-blue-700 rounded-lg text-[10px] leading-relaxed">
                        📌 <strong>Escala Antecipada do CCO:</strong> Ao selecionar um ônibus específico e clicar em "Escalar", o veículo será alocado antecipadamente para aquela partida futura de hoje. O painel operacional e a escala automática respeitarão essa decisão em tempo real.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Escolha a Linha</label>
                        <select
                          value={manualLineId}
                          onChange={(e) => setManualLineId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 text-xs focus:outline-none"
                        >
                          {lines.map((line) => {
                            const o = cities.find((c) => c.id === line.originCityId);
                            const d = cities.find((c) => c.id === line.destinationCityId);
                            const displayService = line.serviceType === 'convencional' 
                              ? 'Convencional 🚌' 
                              : line.serviceType === 'executivo' 
                                ? 'Executivo 🌟' 
                                : 'Leito Premium 💤';
                            return (
                              <option key={line.id} value={line.id}>
                                {o?.name} ➔ {d?.name} ({displayService})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="space-y-1 font-semibold">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Veículo Disponível na Origem</label>
                        <select
                          value={manualBusId}
                          onChange={(e) => setManualBusId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 text-xs focus:outline-none"
                        >
                          {availableBuses.map((bus) => {
                            const catLabel = bus.serviceType === 'convencional' 
                              ? 'Convencional' 
                              : bus.serviceType === 'executivo' 
                                ? 'Executivo' 
                                : 'Leito';
                            return (
                              <option key={bus.id} value={bus.id}>
                                Próprio: #{bus.prefix} - {bus.model} ({bus.capacity}p) [{catLabel}]
                              </option>
                            );
                          })}
                          {availableBuses.length === 0 && (
                            <option value="">
                              Nenhum ônibus próprio livre nesta origem ({chosenLine ? (cities.find(c => c.id === chosenLine.originCityId)?.name || 'Garagem') : 'Origem'})
                            </option>
                          )}
                        </select>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const manuallySelectedBus = availableBuses.find(b => b.id === manualBusId);
                    const isCategoryMismatch = chosenLine && manuallySelectedBus && (manuallySelectedBus.serviceType || 'convencional') !== (chosenLine.serviceType || 'convencional');
                    if (!isCategoryMismatch || !manuallySelectedBus || !chosenLine) return null;
                    return (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-lg flex items-start gap-2.5 mt-2 animate-fadeIn">
                        <AlertTriangle size={16} className="shrink-0 text-amber-500 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-[11px] text-amber-700 uppercase">Divergência de Categoria de Serviço</p>
                          <p className="text-slate-605 text-[10px] mt-0.5 leading-relaxed">
                            A linha foi configurada como <strong>{(chosenLine.serviceType || 'convencional').toUpperCase()}</strong>, mas o veículo selecionado possui categoria <strong>{(manuallySelectedBus.serviceType || 'convencional').toUpperCase()}</strong>. Essa alocação é permitida como último recurso, mas gerará um alerta no diário de bordo e no histórico de viagens concluídas.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowManualDispatch(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded font-bold cursor-pointer transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer transition-all shadow-sm"
                    >
                      Lançar Viagem
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Core moving trips horizontal list format */}
          {trips.filter((t) => t.status === 'em_curso' || t.status === 'programada').length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-2">
              <HelpCircle className="text-slate-400 mx-auto" size={24} />
              <p className="text-slate-700 text-xs font-bold">Nenhum ônibus em viagem no momento.</p>
              <p className="text-slate-500 text-[10px]">Aguarde o horário das escalas automáticas ou acione um Despache Manual acima!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {trips
                .filter((t) => t.status === 'em_curso' || t.status === 'programada')
                .map((trip) => {
                  const line = lines.find((l) => l.id === trip.lineId);
                  const origin = cities.find((c) => c.id === line?.originCityId);
                  const dest = cities.find((c) => c.id === line?.destinationCityId);

                  // Find assigned bus text
                  let busText = 'Desconhecido';
                  let busDesc = 'Operador desconhecido';
                  
                  let ownBus: Bus | undefined;
                  if (trip.isPartnerTrip) {
                    busText = 'Apoio Parceiro';
                    busDesc = trip.partnerCompanyId || 'Empresa Terc.';
                  } else {
                    ownBus = fleet.find((b) => b.id === trip.busId);
                    if (ownBus) {
                      busText = `Ônibus Próprio #${ownBus.prefix}`;
                      busDesc = `${ownBus.manufacturer} ${ownBus.model}`;
                    }
                  }

                  const isMismatch = trip.categoryMismatch;
                  const isExtra = trip.isExtraTrip;

                  const cardColorClass = isMismatch
                    ? "bg-[#fffbeb] border-amber-200 hover:border-amber-300 text-amber-900"
                    : isExtra
                    ? "bg-[#ecfdf5] border-emerald-250 hover:border-emerald-350 text-emerald-900"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-800";

                  return (
                    <div
                      key={trip.id}
                      className={`p-4 border rounded-xl flex flex-col justify-between transition-all group shadow-sm text-xs ${cardColorClass}`}
                      id={`trip-card-${trip.id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        {/* 1. Route, Times and Service category info */}
                        <div className="flex-1 space-y-1.5 min-w-[200px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border ${
                              trip.isTransfer
                                ? 'bg-indigo-55 border-indigo-150 text-indigo-700'
                                : trip.isPartnerTrip
                                  ? 'bg-rose-55 border-rose-100 text-rose-700'
                                  : 'bg-emerald-55 border-emerald-100 text-emerald-700'
                            }`}>
                              {trip.isTransfer ? 'Translado' : trip.isPartnerTrip ? 'Terceirizada' : 'Frota Ativa'}
                            </span>

                            {line && !trip.isTransfer && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                                line.serviceType === 'convencional'
                                  ? 'bg-slate-100 border-slate-200 text-slate-705'
                                  : line.serviceType === 'executivo'
                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                                    : 'bg-fuchsia-50 border-fuchsia-150 text-fuchsia-700'
                              }`}>
                                {line.serviceType === 'convencional' ? 'Convencional' : line.serviceType === 'executivo' ? 'Executivo' : 'Leito'}
                              </span>
                            )}
                            
                            <span className="text-[10px] font-mono text-slate-550 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                              Saída: {trip.departureTime}
                            </span>

                            {trip.status === 'programada' && (
                              <span className="bg-amber-100 border border-amber-305 text-amber-800 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase animate-pulse">
                                Aguardando Partida
                              </span>
                            )}

                            {trip.isExtraTrip && (
                              <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase font-mono">
                                Extra
                              </span>
                            )}

                            {trip.categoryMismatch && (
                              <span className="bg-amber-100 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase font-mono">
                                Cat. Especial
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-900 mt-1">
                            <strong className="text-sm font-extrabold">{origin ? origin.name : 'Origem'}</strong>
                            <ArrowRight size={13} className="text-blue-650 shrink-0" />
                            <strong className="text-sm font-extrabold">{dest ? dest.name : 'Destino'}</strong>
                          </div>
                        </div>

                        {/* 2. Vehicle allocation & passengers count */}
                        <div className="flex items-center gap-4 border-l border-r border-slate-100 px-4 shrink-0 flex-wrap md:flex-nowrap">
                          <div className="min-w-[130px]">
                            <span className="text-slate-400 block uppercase font-bold tracking-wider text-[8px]">Veículo Escalado</span>
                            {ownBus ? (
                              <button
                                type="button"
                                onClick={() => setSelectedBusForHistory(ownBus!)}
                                className="bg-blue-50/60 hover:bg-blue-100/80 text-blue-700 hover:text-blue-800 text-[11px] font-bold px-1.5 py-0.5 rounded border border-blue-150 hover:border-blue-250 cursor-pointer transition-all block w-fit leading-tight text-left mt-0.5 select-none"
                                title="Clique para ver o histórico das últimas 10 viagens deste ônibus"
                              >
                                {busText}
                              </button>
                            ) : (
                              <strong className="text-slate-700 block leading-tight">{busText}</strong>
                            )}
                            <span className="text-slate-400 block leading-tight text-[10px] mt-0.5">{busDesc}</span>
                          </div>
                          
                          <div className="min-w-[110px]">
                            <span className="text-slate-400 block uppercase font-bold tracking-wider text-[8px]">Ocupação Atual</span>
                            <strong className="text-slate-800 block text-[11px]">{trip.passengerCount} passageiros</strong>
                            <span className="text-[9px] text-blue-600 font-extrabold mt-0.5 block uppercase">
                              Fluxo Dinâmico
                            </span>
                          </div>
                        </div>

                        {/* 3. Progress and action trigger */}
                        <div className="min-w-[180px] shrink-0 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-404 font-mono">
                              {trip.status === 'programada' ? 'Status de Saída' : 'Progresso Rodoviário'}
                            </span>
                            <span className="text-blue-650 font-bold">
                              {trip.status === 'programada' ? 'Confirmado' : `${Math.round(trip.progress)}%`}
                            </span>
                          </div>
                          
                          {/* Custom progress slider bar */}
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                trip.status === 'programada'
                                  ? 'bg-amber-400'
                                  : trip.isPartnerTrip
                                  ? 'bg-gradient-to-r from-rose-500 to-orange-500'
                                  : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                              }`}
                              style={{ width: `${trip.status === 'programada' ? 0 : trip.progress}%` }}
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-0.5">
                            <button
                              onClick={() => onArriveTrip(trip.id)}
                              className="text-[9px] font-bold text-slate-400 hover:text-blue-650 hover:underline cursor-pointer transition-colors animate-pulse"
                            >
                              {trip.status === 'programada' ? 'Iniciar Partida Agora' : 'Forçar Chegada Imediata'}
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Indicadores Operacionais do CCO - Posicionados abaixo do mural das viagens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-2">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block mb-1">Rotas em Curso</span>
                <p className="text-xl font-black text-slate-800 font-mono leading-none">{activeTripsCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Ônibus ativos em trânsito</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Truck size={18} /></div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block mb-1">Frota Ativa</span>
                <p className="text-xl font-black text-slate-800 font-mono leading-none">
                  {fleetTraveling} <span className="text-xs text-slate-400 font-normal font-mono">/ {ownFleetCount}</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {ownFleetCount > 0 ? `${Math.round((fleetTraveling / ownFleetCount) * 100)}% em uso` : 'Sem veículos'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0"><UserCheck size={18} /></div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-rose-500 font-extrabold block mb-1">Cancelamentos & Acúmulos</span>
                <p className="text-xl font-black text-rose-600 font-mono leading-none">
                  {trips.filter((t) => t.status === 'cancelada').length} <span className="text-[11px] text-slate-400 font-normal">viagens</span>
                </p>
                <p className="text-[10px] text-slate-550 mt-1">
                  🚨 <strong className="text-rose-700 font-bold">{Object.values(accumulatedPassengers || {}).reduce((acc, curr) => acc + curr, 0)}</strong> pas. retidos
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0"><AlertTriangle size={18} /></div>
            </div>
          </div>
        </div>

        {/* CCO logs & events panel (Below) */}
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-705 uppercase tracking-wider">Ocorrências Operacionais (Logs)</span>
            <span className="text-[10px] text-blue-600 font-mono tracking-wider animate-pulse">Live</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 h-[440px] flex flex-col justify-between shadow-sm">
            <div className="space-y-3 overflow-y-auto max-h-[365px] pr-1.5 flex-1 select-text scrollbar-thin">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6 text-center">
                   <p className="text-slate-400 text-xs italic">Nenhum evento registrado no CCO ainda. Acompanhe a escala!</p>
                </div>
              ) : (
                logs.map((log) => {
                  let alertColor = 'text-slate-750 border-slate-150 bg-slate-50/50 hover:bg-slate-50';
                  if (log.type === 'success') {
                    alertColor = 'text-emerald-800 border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50';
                  } else if (log.type === 'warning') {
                    alertColor = 'text-amber-800 border-amber-100 bg-amber-50/60 hover:bg-amber-50';
                  } else if (log.type === 'alert') {
                    alertColor = 'text-rose-800 border-rose-100 bg-rose-50/60 hover:bg-rose-50';
                  } else if (log.type === 'error') {
                    alertColor = 'text-rose-850 border-rose-100 bg-rose-50/80 hover:bg-rose-50';
                  }

                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-lg border flex gap-2.5 items-start text-xs leading-normal font-sans ${alertColor}`}
                    >
                      <span className="font-mono text-[10px] font-bold text-slate-500 select-none bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded leading-none mt-0.5">
                        {log.timestamp}
                      </span>
                      <div className="flex-1 text-[11px] font-medium leading-relaxed font-sans">{log.message}</div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-150 text-[10px] text-slate-400 text-center uppercase tracking-widest font-black">
              Monitoramento Expresso Bus
            </div>
          </div>
        </div>

      </div>



      {/* TRIP HISTORY MODAL */}
      <BusHistoryModal
        isOpen={!!selectedBusForHistory}
        bus={selectedBusForHistory}
        cities={cities}
        trips={trips}
        lines={lines}
        onClose={() => setSelectedBusForHistory(null)}
      />
    </div>
  );
}
