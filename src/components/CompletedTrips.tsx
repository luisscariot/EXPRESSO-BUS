import React, { useState } from 'react';
import { Trip, Line, City, Bus } from '../types';
import { 
  CheckCircle, Users, Award, MoveRight, ArrowRightLeft, Search, Filter, 
  MapPin, CheckSquare, Calendar, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import BusHistoryModal from './BusHistoryModal';

interface CompletedTripsProps {
  trips: Trip[];
  lines: Line[];
  fleet: Bus[];
  cities: City[];
}

export default function CompletedTrips({ trips, lines, fleet, cities }: CompletedTripsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'regular' | 'extra' | 'transfer'>('all');
  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [filterDest, setFilterDest] = useState<string>('all');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [selectedBusForHistory, setSelectedBusForHistory] = useState<Bus | null>(null);

  // Filter completed trips
  const completedTrips = trips.filter(t => t.status === 'concluida');

  // Convert minutes simulation to Day and Hour representation
  const formatSimulationTime = (minutes: number) => {
    const day = Math.floor(minutes / 1440);
    const hour = Math.floor((minutes % 1440) / 60);
    const min = (minutes % 1440) % 60;
    return `Dia ${day} às ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  // Metrics calculations
  const totalTrips = completedTrips.length;
  const totalPassengers = completedTrips.reduce((acc, t) => acc + (t.isTransfer ? 0 : t.passengerCount), 0);
  const extraTripsCount = completedTrips.filter(t => t.isExtraTrip).length;
  const transfersCount = completedTrips.filter(t => t.isTransfer).length;

  const averageOccupancy = totalTrips - transfersCount > 0 
    ? Math.round(totalPassengers / (totalTrips - transfersCount)) 
    : 0;

  // Filter logic
  const filteredTrips = completedTrips.filter((trip) => {
    const line = lines.find((l) => l.id === trip.lineId);
    
    // Origin & Destination match
    let tripOriginId = '';
    let tripDestId = '';
    if (trip.isTransfer) {
      tripOriginId = trip.transferOriginCityId || '';
      tripDestId = trip.transferDestCityId || '';
    } else {
      tripOriginId = line?.originCityId || '';
      tripDestId = line?.destinationCityId || '';
    }

    const originCity = cities.find(c => c.id === tripOriginId);
    const destCity = cities.find(c => c.id === tripDestId);

    const originName = originCity?.name || '';
    const destName = destCity?.name || '';
    
    // Type Filter
    if (filterType === 'extra' && !trip.isExtraTrip) return false;
    if (filterType === 'transfer' && !trip.isTransfer) return false;
    if (filterType === 'regular' && (trip.isExtraTrip || trip.isTransfer)) return false;

    // Origin/Dest dropdown filters
    if (filterOrigin !== 'all' && tripOriginId !== filterOrigin) return false;
    if (filterDest !== 'all' && tripDestId !== filterDest) return false;

    // Search bar (cities, bus prefix, line name)
    const bus = fleet.find(b => b.id === trip.busId);
    const busPrefix = bus?.prefix || '';
    const busModel = bus?.model || '';
    
    const matchesSearch = 
      originName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      destName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      busPrefix.toLowerCase().includes(searchTerm.toLowerCase()) ||
      busModel.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const toggleTripExpand = (tripId: string) => {
    setExpandedTripId(expandedTripId === tripId ? null : tripId);
  };

  return (
    <div className="space-y-6" id="completed-trips-view">
      {/* Header section */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <CheckCircle className="text-green-600" size={24} />
          Histórico de Viagens Concluídas
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhe o relatório completo de rotas finalizadas, ocupação de passageiros e alocação de frota.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <CheckSquare size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block uppercase tracking-wider">Viagens Concluídas</span>
            <span className="text-2xl font-extrabold text-slate-800">{totalTrips}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block uppercase tracking-wider">Passageiros Transportados</span>
            <span className="text-2xl font-extrabold text-slate-800">{totalPassengers}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Award size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block uppercase tracking-wider font-semibold">Viagens de Reforço</span>
            <span className="text-2xl font-extrabold text-slate-800">{extraTripsCount}</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <ArrowRightLeft size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block uppercase tracking-wider">Translados Realizados</span>
            <span className="text-2xl font-extrabold text-slate-800">{transfersCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por cidade, prefixo, modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="md:col-span-4 flex rounded-lg border border-slate-200 p-0.5 bg-white shadow-xs">
            {(['all', 'regular', 'extra', 'transfer'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md transition-colors capitalize ${
                  filterType === type 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type === 'all' ? 'Todas' : type === 'regular' ? 'Comuns' : type === 'extra' ? 'Extras' : 'Translados'}
              </button>
            ))}
          </div>

          {/* Origin Dropdown */}
          <div className="md:col-span-2">
            <select
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs shadow-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Polo de Origem (Todos)</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.state})</option>
              ))}
            </select>
          </div>

          {/* Destination Dropdown */}
          <div className="md:col-span-2">
            <select
              value={filterDest}
              onChange={(e) => setFilterDest(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs shadow-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Polo de Destino (Todos)</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.state})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Trips list container */}
      <div className="space-y-4">
        {filteredTrips.length === 0 ? (
          <div className="bg-white border rounded-xl py-12 px-4 shadow-xs text-center border-slate-200">
            <AlertCircle className="mx-auto text-slate-400 mb-2" size={36} />
            <span className="text-sm text-slate-600 font-bold block">Nenhuma viagem concluída localizada</span>
            <span className="text-xs text-slate-400 mt-1 block">Ajuste os termos de busca ou filtros ou prossiga com a simulação para gerar rota concluída.</span>
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const line = lines.find((l) => l.id === trip.lineId);
            
            let tripOriginId = '';
            let tripDestId = '';
            if (trip.isTransfer) {
              tripOriginId = trip.transferOriginCityId || '';
              tripDestId = trip.transferDestCityId || '';
            } else {
              tripOriginId = line?.originCityId || '';
              tripDestId = line?.destinationCityId || '';
            }

            const originCity = cities.find(c => c.id === tripOriginId);
            const destCity = cities.find(c => c.id === tripDestId);

            // Fetch Bus associated with the trip
            const bus = fleet.find(b => b.id === trip.busId);

            const isExpanded = expandedTripId === trip.id;
            const hasStops = trip.stopDetails && trip.stopDetails.length > 0;

            return (
              <div 
                key={trip.id}
                className={`bg-white rounded-xl border transition-all duration-200 shadow-xs overflow-hidden ${
                  isExpanded ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-350'
                }`}
              >
                {/* Collapsed top bar main info */}
                <div 
                  onClick={() => toggleTripExpand(trip.id)}
                  className="p-5 flex flex-col lg:flex-row justify-between lg:items-center gap-4 cursor-pointer select-none"
                >
                  {/* Left column: Badge, Route & Times */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                    {/* Badge */}
                    <div className="flex sm:block space-y-1">
                      {trip.isTransfer ? (
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-md border border-indigo-200 block text-center uppercase tracking-wider">
                          Translado
                        </span>
                      ) : trip.isExtraTrip ? (
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-200 block text-center uppercase tracking-wider">
                          Viagem Extra
                        </span>
                      ) : (
                        <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md border border-green-200 block text-center uppercase tracking-wider">
                          Viagem Comum
                        </span>
                      )}

                      {trip.categoryMismatch && (
                        <span className="bg-amber-50 text-amber-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-amber-200 flex items-center justify-center gap-1 mx-auto max-w-[102px]">
                          <AlertCircle size={10} className="text-amber-500 shrink-0" />
                          DIVERGENTE
                        </span>
                      )}
                    </div>

                    {/* Route Names */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <MapPin size={14} className="text-slate-400" />
                        <span>{originCity?.name} ({originCity?.state})</span>
                        <MoveRight size={14} className="text-slate-400 mx-1" />
                        <span>{destCity?.name} ({destCity?.state})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 mt-1 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Saída: {formatSimulationTime(trip.departureTimestamp)}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>
                          Chegada: {formatSimulationTime(trip.estimatedArrivalTimestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right column: Bus and Passenger Stats */}
                  <div className="flex flex-row items-center justify-between sm:justify-start gap-4 lg:gap-8 border-t lg:border-t-0 border-slate-100 pt-3 lg:pt-0">
                    {/* Bus allocation */}
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">Ônibus Escalado</span>
                      <span className="text-xs font-bold text-slate-700 block">
                        {bus ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBusForHistory(bus);
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold px-1.5 py-0.5 rounded border border-blue-150 hover:border-blue-250 cursor-pointer transition-all inline-block leading-tight text-center select-none"
                            title="Clique para ver o histórico das últimas 10 viagens deste ônibus"
                          >
                            #{bus.prefix}
                          </button>
                        ) : trip.isPartnerTrip ? (
                          `Apoio Parceiro`
                        ) : (
                          `Inativo #${trip.busId.split('_').pop()}`
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {bus ? bus.model : trip.isPartnerTrip ? 'Frota Terceirizada' : 'Veículo Desativado'}
                      </span>
                    </div>

                    {/* Passengers count */}
                    <div className="text-left sm:text-right min-w-[75px]">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">Passageiros</span>
                      <span className="text-sm font-extrabold text-blue-600 block">
                        {trip.isTransfer ? '-' : `${trip.passengerCount} pax`}
                      </span>
                      {!trip.isTransfer && (
                        <span className="text-[10px] text-slate-500 block">
                          Cap: {bus ? bus.capacity : trip.isPartnerTrip ? 46 : 46} lug
                        </span>
                      )}
                    </div>

                    {/* Expand/Collapse arrow */}
                    <div className="p-1 px-1.5 text-slate-400 bg-slate-50 rounded-md border border-slate-200">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded details block */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                    {trip.categoryMismatch && (
                      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 p-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                        <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-[11px] text-amber-700 uppercase">Divergência de Categoria Registrada</p>
                          <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed font-semibold">
                            {trip.categoryMismatchAlert || `Esta linha opera sob categoria ${line?.serviceType?.toUpperCase()}, mas foi suprida emergencialmente por veículo de categoria ${bus?.serviceType?.toUpperCase() || 'especial'}.`}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sub-block A: Bus specification details */}
                      <div className="bg-white rounded-lg p-4 border border-slate-150">
                        <span className="text-xs font-bold text-slate-800 block border-b border-slate-100 pb-2 mb-3">
                          Ficha Técnica do Veículo
                        </span>
                        {bus ? (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-dotted items-center">
                              <span className="text-slate-500 font-semibold">Prefixo Regulamentar:</span>
                              <button
                                type="button"
                                onClick={() => setSelectedBusForHistory(bus)}
                                className="font-extrabold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
                                title="Ver histórico completo"
                              >
                                #{bus.prefix}
                              </button>
                            </div>
                            <div className="flex justify-between py-1 border-b border-dotted">
                              <span className="text-slate-500 font-semibold">Fabricante / Carroceria:</span>
                              <span className="font-semibold text-slate-700">{bus.manufacturer}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-dotted">
                              <span className="text-slate-500 font-semibold">Modelo:</span>
                              <span className="font-bold text-slate-700">{bus.model}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-dotted">
                              <span className="text-slate-500 font-semibold">Capacidade de Poltronas:</span>
                              <span className="font-semibold text-slate-700">{bus.capacity} assentos</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-dotted">
                              <span className="text-slate-500 font-semibold">Categoria Operacional:</span>
                              <span className="font-semibold text-slate-700 capitalize">
                                {bus.isPartner ? 'Apoio (Empresa Parceira)' : 'Frota Ativa Própria'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-dotted">
                              <span className="text-slate-500 font-semibold">Situação do Carro:</span>
                              <span className="font-bold text-amber-600">Terceirizado ou Desativado</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-dotted">
                              <span className="text-slate-500 font-semibold">Tipo de Recurso:</span>
                              <span className="font-semibold text-slate-700">
                                {trip.isPartnerTrip ? 'Ônibus Parceiro de Convênio' : 'Removido da Garagem Ativa'}
                              </span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-slate-500 font-semibold">Identificador Interno:</span>
                              <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">{trip.busId}</code>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sub-block B: Journey details and intermediate stops */}
                      <div className="bg-white rounded-lg p-4 border border-slate-150">
                        <span className="text-xs font-bold text-slate-800 block border-b border-slate-100 pb-2 mb-3">
                          Relatório Geral da Viagem / Paradas
                        </span>

                        {trip.isTransfer ? (
                          <div className="text-xs text-slate-500 py-3 space-y-2">
                            <p>Esta operação foi um <strong>Translado de Posicionamento (Vazio)</strong> promovido pelo CCO para equilibrar e reabastecer a frota no terminal de {destCity?.name}.</p>
                            <p className="bg-indigo-50/50 p-2.5 rounded-lg text-indigo-700 border border-indigo-100 font-semibold">
                              Nenhum passageiro foi transportado nesta viagem.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Demand and passenger info */}
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Ocupação Inicial (Origem):</span>
                                <span className="font-bold text-slate-700">{trip.originalPassengerCount ?? trip.passengerCount} passageiros</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Taxa de Ocupação de Saída:</span>
                                <span className="font-semibold text-slate-700">
                                  {Math.round(((trip.originalPassengerCount ?? trip.passengerCount) / (bus?.capacity || 46)) * 100)}%
                                </span>
                              </div>
                              {line?.serviceType && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-semibold">Tipo de Serviço da Rota:</span>
                                  <span className="font-semibold text-slate-700 capitalize">{line.serviceType}</span>
                                </div>
                              )}
                            </div>

                            {/* Section for Stops detail if exists */}
                            {hasStops ? (
                              <div className="border-t border-slate-100 pt-3">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2">Movimentação nas Paradas Intermediárias:</span>
                                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                  {trip.stopDetails?.map((stop, i) => (
                                    <div key={i} className="flex justify-between text-xs bg-slate-50 p-1.5 px-2 rounded-md border border-slate-150">
                                      <span className="font-bold text-slate-700">{stop.cityName}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-green-600 font-bold">+{stop.boarded}</span>
                                        <span className="text-slate-300">/</span>
                                        <span className="text-red-500 font-bold">-{stop.deboarded}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 italic">
                                Viagem Direta: Sem paradas intermediárias registradas nesta linha.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
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
