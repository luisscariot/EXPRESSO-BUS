import React, { useState, useEffect } from 'react';
import { Bus, City, BusStatus, ServiceType, Trip, Line } from '../types';
import { MANUFACTURERS, MODELS_BY_MANUFACTURER, generatePrefix } from '../utils/generators';
import { Bus as BusIcon, Plus, PenTool, CheckCircle, ShieldAlert, History, MapPin, Gauge, Layers, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BusHistoryModal from './BusHistoryModal';

interface FleetManagerProps {
  fleet: Bus[];
  cities: City[];
  trips?: Trip[];
  lines?: Line[];
  onAddBus: (bus: Bus) => void;
  onUpdateBusStatus: (id: string, status: BusStatus) => void;
  onUpdateBusLocation: (id: string, cityId: string) => void;
  onDeleteBus: (id: string) => void;
  onStartTransferTrip: (busId: string, originCityId: string, destCityId: string) => void;
  onUpdateBusServiceType?: (id: string, serviceType: ServiceType) => void;
}

export default function FleetManager({
  fleet,
  cities,
  trips = [],
  lines = [],
  onAddBus,
  onUpdateBusStatus,
  onUpdateBusLocation,
  onDeleteBus,
  onStartTransferTrip,
  onUpdateBusServiceType,
}: FleetManagerProps) {
  const [prefix, setPrefix] = useState('');
  const [manufacturer, setManufacturer] = useState('Marcopolo');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2024);
  const [capacity, setCapacity] = useState(48);
  const [currentCityId, setCurrentCityId] = useState('');
  const [status, setStatus] = useState<BusStatus>('disponivel');
  const [serviceType, setServiceType] = useState<ServiceType>('convencional');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'todos' | BusStatus>('todos');
  const [filterCityId, setFilterCityId] = useState<'todas' | string>('todas');
  const [groupByCity, setGroupByCity] = useState(false);
  const [error, setError] = useState('');
  const [selectedBusForHistory, setSelectedBusForHistory] = useState<Bus | null>(null);

  // Update model default when manufacturer changes
  useEffect(() => {
    const models = MODELS_BY_MANUFACTURER[manufacturer];
    if (models && models.length > 0) {
      setModel(models[0].name);
      setCapacity(models[0].capacity);
    }
  }, [manufacturer]);

  // Handle manual option changes
  const handleModelSelect = (modelName: string) => {
    setModel(modelName);
    const models = MODELS_BY_MANUFACTURER[manufacturer];
    const found = models?.find((m) => m.name === modelName);
    if (found) {
      setCapacity(found.capacity);
    }
  };

  // Set default city
  useEffect(() => {
    if (cities.length > 0 && !currentCityId) {
      setCurrentCityId(cities[0].id);
    }
  }, [cities, currentCityId]);

  // Generate helper prefix
  const handleRandomPrefix = () => {
    setPrefix(generatePrefix());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefix.trim()) {
      setError('Por favor, defina um prefixo único para o veículo.');
      return;
    }
    if (fleet.some((b) => b.prefix === prefix.trim() && !b.isPartner)) {
      setError('Operação inválida: Já existe outro ônibus com este prefixo na frota.');
      return;
    }
    if (!currentCityId) {
      setError('Selecione uma localização/cidade operacional inicial.');
      return;
    }

    const newBus: Bus = {
      id: `bus_${Math.random().toString(36).substring(2, 9)}`,
      prefix: prefix.trim(),
      manufacturer,
      model,
      year: Number(year),
      capacity: Number(capacity),
      currentCityId,
      status,
      isPartner: false,
      serviceType,
    };

    onAddBus(newBus);
    setPrefix('');
    setServiceType('convencional');
    setShowAddForm(false);
    setError('');
  };

  const getStatusBadge = (statusVal: BusStatus) => {
    switch (statusVal) {
      case 'disponivel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
            <CheckCircle size={10} /> Disponível
          </span>
        );
      case 'em_viagem':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold bg-blue-50 text-blue-600 border border-blue-100 animate-pulse font-mono">
            <Gauge size={10} /> Em Viagem
          </span>
        );
      case 'em_manutencao':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold bg-rose-50 text-rose-700 border border-rose-100 font-mono">
            <PenTool size={10} /> Manutenção
          </span>
        );
      case 'reserva':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold bg-amber-50 text-amber-700 border border-amber-100 font-mono">
            <History size={10} /> Reserva
          </span>
        );
    }
  };

  const filteredFleet = fleet.filter((bus) => {
    if (bus.isPartner) return false; // This is own fleet manager screen
    
    // Status Filter
    if (filterStatus !== 'todos' && bus.status !== filterStatus) return false;
    
    // City Filter
    if (filterCityId !== 'todas' && bus.currentCityId !== filterCityId) return false;
    
    return true;
  });

  const renderBusCard = (bus: Bus) => {
    const city = cities.find((c) => c.id === bus.currentCityId);
    
    // Friendly localized label for the service type
    const getServiceName = (s: ServiceType) => {
      if (s === 'convencional') return 'Convencional';
      if (s === 'executivo') return 'Executivo';
      if (s === 'leito') return 'Leito';
      return s;
    };

    const cardColor = 
      bus.serviceType === 'leito'
        ? "bg-[#fff6f6] border-[#fbcacb] hover:border-[#f79b9d]"
        : bus.serviceType === 'executivo'
        ? "bg-[#f4f8fd] border-[#bfd7f3] hover:border-[#98bfe8]"
        : "bg-[#fbf9f3] border-[#ecdcb4] hover:border-[#d9c491]"; // convencional

    return (
      <div
        key={bus.id}
        className={`p-4 rounded-xl flex flex-col transition-all relative group shadow-sm text-xs space-y-3 border ${cardColor}`}
        id={`bus-card-${bus.id}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* 1. Icon, Model and Year */}
          <div className="flex items-start gap-3 min-w-[220px]">
            <span className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl shrink-0">
              <BusIcon size={18} />
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBusForHistory(bus)}
                  className="bg-slate-50 hover:bg-blue-50 border border-slate-205 hover:border-blue-300 text-slate-800 hover:text-blue-700 text-xs font-black font-mono px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 shadow-sm uppercase shrink-0"
                  title="Clique para ver o histórico das últimas 10 viagens deste ônibus"
                >
                  #{bus.prefix}
                  <History size={10} className="opacity-60 text-slate-500 hover:text-blue-600" />
                </button>
                <span className={`text-[8.5px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${
                  bus.serviceType === 'leito'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : bus.serviceType === 'executivo'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {getServiceName(bus.serviceType || 'convencional')}
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-slate-800 mt-1">{bus.manufacturer} {bus.model}</h4>
              <p className="text-[10px] text-slate-400 font-mono font-medium">Ano {bus.year} • {bus.capacity} poltronas</p>
            </div>
          </div>

          {/* 2. Position Hub / Current City */}
          <div className="min-w-[140px] px-3 lg:border-l lg:border-r lg:border-slate-100 py-1 flex flex-col justify-center">
            <span className="text-slate-400 text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-0.5">
              <MapPin size={10} className="text-slate-400" /> Local Atual
            </span>
            <p className="font-extrabold text-slate-700 text-xs uppercase font-mono mt-0.5">
              {bus.status === 'em_viagem' ? (
                <span className="text-blue-650 font-bold flex items-center gap-1 animate-pulse">
                  <Gauge size={11} /> Em Rodovia ➔
                </span>
              ) : (
                city ? `${city.name} (${city.state})` : 'Desconhecida'
              )}
            </p>
          </div>

          {/* 3. Service Type Dropdown and State Options */}
          <div className="flex-1 min-w-[200px] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Serviço:</span>
                {bus.status === 'em_viagem' ? (
                  <strong className="text-slate-700 text-[10px] uppercase font-mono">
                    {getServiceName(bus.serviceType || 'convencional')}
                  </strong>
                ) : (
                  <select
                    value={bus.serviceType || 'convencional'}
                    onChange={(e) => onUpdateBusServiceType?.(bus.id, e.target.value as ServiceType)}
                    className="text-[10px] bg-slate-50 border border-slate-205 rounded px-1.5 py-0.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="convencional">Convencional</option>
                    <option value="executivo">Executivo</option>
                    <option value="leito">Leito</option>
                  </select>
                )}
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">Status:</span>
                {getStatusBadge(bus.status)}
              </div>
            </div>

            {/* Operational Change Buttons */}
            {bus.status === 'em_viagem' ? (
              <div className="bg-blue-50 text-blue-700 text-[9.5px] font-bold p-1 rounded border border-blue-100 text-center uppercase tracking-wide">
                Frota sob escala integrada de viagem em curso.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateBusStatus(bus.id, 'disponivel')}
                  disabled={bus.status === 'disponivel'}
                  className={`py-1 text-[9px] font-black uppercase text-center rounded transition-colors cursor-pointer border ${
                    bus.status === 'disponivel'
                      ? 'bg-emerald-50 border-emerald-250 text-emerald-700 pointer-events-none font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200 shadow-sm'
                  }`}
                >
                  Ativo
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateBusStatus(bus.id, 'reserva')}
                  disabled={bus.status === 'reserva'}
                  className={`py-1 text-[9px] font-black uppercase text-center rounded transition-colors cursor-pointer border ${
                    bus.status === 'reserva'
                      ? 'bg-amber-50 border-amber-250 text-amber-700 pointer-events-none font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200 shadow-sm'
                  }`}
                >
                  Reserva
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateBusStatus(bus.id, 'em_manutencao')}
                  disabled={bus.status === 'em_manutencao'}
                  className={`py-1 text-[9px] font-black uppercase text-center rounded transition-colors cursor-pointer border ${
                    bus.status === 'em_manutencao'
                      ? 'bg-rose-50 border-rose-250 text-rose-700 pointer-events-none font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200 shadow-sm'
                  }`}
                >
                  Oficina
                </button>
              </div>
            )}
          </div>

          {/* 4. Transfer trip launcher (Translado) */}
          <div className="shrink-0 min-w-[200px] border-t border-slate-100 pt-3 lg:pt-1 lg:border-t-0 lg:border-l lg:border-slate-100 lg:pl-4 flex flex-col justify-center">
            {bus.status !== 'em_viagem' && cities.length > 1 ? (
              <div className="space-y-1">
                <span className="block text-[8px] font-black text-indigo-700 uppercase tracking-widest">
                  🚀 Viagem de Translado (Vazio)
                </span>
                <div className="flex gap-1">
                  <select
                    id={`transfer-select-${bus.id}`}
                    className="w-full text-[9.5px] bg-slate-50 border border-indigo-150 rounded px-1.5 py-0.5 text-slate-750 font-medium focus:outline-none focus:border-indigo-500 h-[24px]"
                  >
                    <option value="">Destino...</option>
                    {cities
                      .filter((c) => c.id !== bus.currentCityId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.state})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const selectEl = document.getElementById(`transfer-select-${bus.id}`) as HTMLSelectElement | null;
                      const destCityId = selectEl?.value;
                      if (destCityId) {
                        onStartTransferTrip(bus.id, bus.currentCityId, destCityId);
                        if (selectEl) selectEl.value = ""; // Reset
                      }
                    }}
                    className="px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9.5px] font-bold uppercase transition-colors cursor-pointer h-[24px]"
                  >
                    Ir
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 italic text-center block">Translado indisponível</span>
            )}
            
            {bus.status !== 'em_viagem' && (
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => onDeleteBus(bus.id)}
                  className="text-[9px] text-slate-400 hover:text-rose-600 hover:underline cursor-pointer transition-colors"
                >
                  Excluir Ônibus
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BusIcon className="text-blue-600" size={20} />
            Gestão de Frota Própria
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Cadastre novos ônibus para operar em suas linhas de transporte, defina seus serviços e controle o status ou agrupamento de sua frota.
          </p>
        </div>

        {cities.length === 0 ? (
          <span className="text-xs text-rose-600 font-medium bg-rose-50 px-3 py-2 rounded-lg border border-rose-150">
            Cadastre pelo menos uma cidade antes de cadastrar ônibus!
          </span>
        ) : (
          <button
            onClick={() => { setShowAddForm(!showAddForm); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm hover:shadow-blue-500/15 transition-all"
            id="btn-toggle-add-bus"
          >
            <Plus size={16} />
            {showAddForm ? 'Fechar Formulário' : 'Adicionar Veículo'}
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Novo Veículo Operacional</h3>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prefixo do Ônibus</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Ex: 1010"
                  value={prefix}
                  maxLength={10}
                  onChange={(e) => { setPrefix(e.target.value); setError(''); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 text-center font-bold"
                  id="input-prefix"
                />
                <button
                  type="button"
                  onClick={handleRandomPrefix}
                  className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-770 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                  title="Gerar prefixo automático"
                >
                  Auto
                </button>
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fabricante</label>
              <select
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                id="select-manufacturer"
              >
                {MANUFACTURERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modelo</label>
              <select
                value={model}
                onChange={(e) => handleModelSelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                id="select-model"
              >
                {MODELS_BY_MANUFACTURER[manufacturer]?.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Capacidade (Lugares)</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                min={10}
                max={120}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 text-center focus:outline-none focus:border-blue-500 font-semibold font-mono"
                id="input-capacity"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ano Fabricação</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={1990}
                max={2026}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 text-center focus:outline-none focus:border-blue-500 font-mono"
                id="input-year"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cidade Base Atual</label>
              <select
                value={currentCityId}
                onChange={(e) => setCurrentCityId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                id="select-curr-city"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} ({city.state})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Serviço</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                id="select-service-type"
              >
                <option value="convencional">Convencional</option>
                <option value="executivo">Executivo</option>
                <option value="leito">Leito</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Operacional</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BusStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                id="select-status"
              >
                <option value="disponivel">Disponível</option>
                <option value="reserva">Reserva Técnica</option>
                <option value="em_manutencao">Em Manutenção</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setError(''); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              id="submit-new-bus-btn"
            >
              Cadastrar Ônibus
            </button>
          </div>
        </form>
      )}

      {/* Interactive Visualization & Filtering Panel - "visualizar os ônibus por cidade" */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Filter size={14} className="text-blue-600" />
              Categorização e Filtros da Frota
            </h4>
            <p className="text-slate-400 text-[11px] font-sans">
              Organize, agrupe por cidade sede ou filtre o estado ativo dos veículos cadastrados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Group by city button option */}
            <button
              type="button"
              onClick={() => {
                setGroupByCity(!groupByCity);
                if (!groupByCity) {
                  // Reset specific filter so all are grouped
                  setFilterCityId('todas');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                groupByCity
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <Layers size={13} />
              {groupByCity ? 'Visualizando por Cidade ✔' : 'Visualizar por Cidade (Agrupado)'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          
          {/* Status Filter buttons */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Estado Operacional</span>
            <div className="flex flex-wrap gap-1 font-mono text-[9.5px]">
              {(['todos', 'disponivel', 'em_viagem', 'em_manutencao', 'reserva'] as const).map((sVal) => (
                <button
                  key={sVal}
                  type="button"
                  onClick={() => setFilterStatus(sVal)}
                  className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                    filterStatus === sVal
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {sVal === 'todos' ? 'Todos' : sVal.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* City Filter / Selection Dropdown */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Filtro Rápido por Cidade</span>
            <div className="flex gap-2">
              <select
                value={filterCityId}
                onChange={(e) => {
                  setFilterCityId(e.target.value);
                  if (e.target.value !== 'todas') {
                    setGroupByCity(false); // disable full group view to focus on single choice
                  }
                }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="todas">Todas as Cidades Operacionais</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} ({city.state})
                  </option>
                ))}
              </select>
              {filterCityId !== 'todas' && (
                <button
                  type="button"
                  onClick={() => setFilterCityId('todas')}
                  className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold border border-slate-250 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* List listing */}
      {filteredFleet.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 border-dashed rounded-xl shadow-sm">
          <p className="text-slate-500 text-xs italic">Nenhum ônibus próprio corresponde aos filtros selecionados.</p>
        </div>
      ) : groupByCity ? (
        // RENDER GROUPED BY CITY
        <div className="space-y-8">
          {cities.map((city) => {
            const cityBuses = filteredFleet.filter((bus) => bus.currentCityId === city.id);
            if (cityBuses.length === 0) return null;

            return (
              <div key={city.id} className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                      <MapPin size={14} />
                    </span>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      {city.name} ({city.state})
                    </h3>
                  </div>
                  <span className="text-xs bg-white border border-slate-200 shadow-xs px-2.5 py-1 rounded-full text-slate-600 font-bold font-mono">
                    {cityBuses.length} {cityBuses.length === 1 ? 'ônibus' : 'ônibus'}
                  </span>
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  {cityBuses.map((bus) => renderBusCard(bus))}
                </div>
              </div>
            );
          })}
          
          {/* Also handle any traveling buses group when grouping if they are currently traveling */}
          {filteredFleet.some((bus) => bus.status === 'em_viagem') && (
            <div className="space-y-3 bg-blue-50/25 p-5 rounded-2xl border border-blue-200/50">
              <div className="flex items-center justify-between pb-2 border-b border-blue-150">
                <div className="flex items-center gap-2 text-blue-800">
                  <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg animate-pulse">
                    <Gauge size={14} />
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    Em Trânsito Rodoviário (Viagens em Curso)
                  </h3>
                </div>
                <span className="text-xs bg-white border border-blue-100 px-2.5 py-1 rounded-full text-blue-700 font-bold font-mono">
                  {filteredFleet.filter((bus) => bus.status === 'em_viagem').length} veículos
                </span>
              </div>

              <div className="flex flex-col gap-3 pt-1">
                {filteredFleet
                  .filter((bus) => bus.status === 'em_viagem')
                  .map((bus) => renderBusCard(bus))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // RENDER STANDARD FLAT LIST
        <div className="flex flex-col gap-3">
          {filteredFleet.map((bus) => renderBusCard(bus))}
        </div>
      )}

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
