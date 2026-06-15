import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { City, Line, Schedule, PartnerCompany, Trip } from '../types';
import {
  WEEKDAYS,
  getDayOfWeekName,
  getDayOfWeekIndex,
  getDemandMultiplier,
  calculateProjectedPassengers
} from '../utils/demandHelper';
import {
  TrendingUp,
  Calendar,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Users,
  CheckCircle2,
  Info,
  Sparkles,
  Sliders,
  Bus as BusIcon,
  Search,
  Map,
  ArrowRight
} from 'lucide-react';

interface DemandProjectionProps {
  cities: City[];
  lines: Line[];
  schedules: Schedule[];
  partners: PartnerCompany[];
  trips: Trip[];
  simTime: { hour: number; minute: number; day: number };
}

export default function DemandProjection({
  cities,
  lines,
  schedules,
  partners,
  trips,
  simTime
}: DemandProjectionProps) {
  // We can project 7 days starting from current day
  const currentDay = simTime.day;
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [customMultiplierOverride, setCustomMultiplierOverride] = useState<number>(1.0);
  const [filterQuery, setFilterQuery] = useState<string>('');

  const targetDay = currentDay + selectedDayOffset;
  const targetDayOfWeekName = getDayOfWeekName(targetDay);
  const targetDayOfWeekIndex = getDayOfWeekIndex(targetDay);

  // Generate 7 days projection array
  const projectionDays = Array.from({ length: 7 }, (_, i) => {
    const dayNum = currentDay + i;
    const weekdayName = getDayOfWeekName(dayNum);
    
    // Find all schedule counts and calculate alerts count
    let highAlertCount = 0;
    let overflowAlertCount = 0;

    schedules.forEach((sch) => {
      const line = lines.find((l) => l.id === sch.lineId);
      if (!line) return;
      const origin = cities.find((c) => c.id === line.originCityId);
      const dest = cities.find((c) => c.id === line.destinationCityId);
      
      const rawProj = calculateProjectedPassengers(dayNum, line, origin, dest, "projection");
      // Scale with multiplier slider factor if today
      const finalProj = Math.round(rawProj * (i === selectedDayOffset ? customMultiplierOverride : 1.0));

      if (finalProj > 46) {
        overflowAlertCount++;
      } else if (finalProj > 40) {
        highAlertCount++;
      }
    });

    return {
      offset: i,
      dayNumber: dayNum,
      weekdayName,
      highAlertCount,
      overflowAlertCount
    };
  });

  // Fetch projections for selected Day
  const projectedSchedules = schedules
    .map((sch) => {
      const line = lines.find((l) => l.id === sch.lineId);
      if (!line) return null;
      
      const origin = cities.find((c) => c.id === line.originCityId);
      const dest = cities.find((c) => c.id === line.destinationCityId);
      
      const rawProj = calculateProjectedPassengers(targetDay, line, origin, dest, "projection");
      const multiplierFactor = selectedDayOffset === selectedDayOffset ? customMultiplierOverride : 1.0;
      const projVal = Math.round(rawProj * multiplierFactor);

      const dMultiplierDetails = getDemandMultiplier(targetDay, line, origin, dest);
      
      return {
        schedule: sch,
        line,
        origin,
        dest,
        projectedPassengers: projVal,
        demandMultiplier: dMultiplierDetails.multiplier * multiplierFactor,
        seasonalityType: dMultiplierDetails.seasonalityType,
        explanation: dMultiplierDetails.explanation
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    // Filter with interactive query search
    .filter((item) => {
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return (
        item.origin?.name.toLowerCase().includes(q) ||
        item.dest?.name.toLowerCase().includes(q) ||
        item.schedule.departureTime.includes(q) ||
        item.seasonalityType.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.schedule.departureTime.localeCompare(b.schedule.departureTime));

  const totalSchedulesForSelected = projectedSchedules.length;
  const criticalSchedulesCount = projectedSchedules.filter((x) => x.projectedPassengers > 46).length;
  const warningSchedulesCount = projectedSchedules.filter((x) => x.projectedPassengers > 40 && x.projectedPassengers <= 46).length;

  return (
    <div className="space-y-6" id="demand-projection-page">
      
      {/* 1. Header Hero Panel */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 text-white relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 opacity-10 animate-pulse pointer-events-none">
          <TrendingUp size={280} className="text-blue-500 translate-x-12 translate-y-12" />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-350 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest rounded-full">
                Módulo Preditivo de Inteligência
              </span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-full flex items-center gap-1">
                <Sparkles size={10} /> Sazonalidade Ativa
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight font-sans">
              Projeção de Demanda & Ocupação
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-xl font-medium leading-relaxed">
              Mapeamento de tendências regionais com análises baseadas na vocação econômica das cidades ({cities.length} polos ativos) e no histórico de dias da semana para prever lotações máximas antes das saídas.
            </p>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl text-center md:text-left min-w-[200px]">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Operação CCO</span>
            <div className="text-2xl font-black text-blue-400 tracking-wide font-mono mt-0.5">
              DIA {simTime.day}
            </div>
            <p className="text-xs text-slate-350 mt-1">
              Hoje é <strong className="text-white">{getDayOfWeekName(simTime.day)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Horizontal 7-Day Slider Projections */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" />
            Agenda de Visibilidade dos Próximos 7 Dias
          </h3>
          <span className="text-xs text-slate-500 font-medium">Selecione para ver projeções de cada dia</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {projectionDays.map((dayObj) => {
            const isSelected = selectedDayOffset === dayObj.offset;
            const isToday = dayObj.dayNumber === currentDay;
            
            return (
              <button
                key={dayObj.offset}
                onClick={() => {
                  setSelectedDayOffset(dayObj.offset);
                  // reset multiplier slider transition when switching days for hygiene
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 shadow-sm text-white scale-[1.03] ring-2 ring-blue-600/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] pb-0.5 font-bold uppercase tracking-wider ${
                    isSelected ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    {isToday ? 'HOJE' : `Dia ${dayObj.dayNumber}`}
                  </span>
                  
                  {/* Alert indicators */}
                  {(dayObj.overflowAlertCount > 0 || dayObj.highAlertCount > 0) && (
                    <div className="flex gap-1">
                      {dayObj.overflowAlertCount > 0 && (
                        <span className={`w-2.5 h-2.5 rounded-full bg-rose-500 block ${isSelected ? 'ring-1 ring-white' : ''}`} title={`${dayObj.overflowAlertCount} alertas críticos de lotação física excedida.`} />
                      )}
                      {dayObj.highAlertCount > 0 && (
                        <span className={`w-2.5 h-2.5 rounded-full bg-amber-505 bg-amber-500 block ${isSelected ? 'ring-1 ring-white' : ''}`} title={`${dayObj.highAlertCount} horários com ocupação acima de 90%.`} />
                      )}
                    </div>
                  )}
                </div>

                <div className="text-sm font-extrabold truncate mt-1">
                  {dayObj.weekdayName.split('-')[0]}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] font-medium leading-none">
                  <span className={isSelected ? 'text-blue-150' : 'text-slate-500'}>
                    Avisos / Alertas:
                  </span>
                  <span className={`font-mono font-bold ${
                    dayObj.overflowAlertCount > 0
                      ? isSelected ? 'text-white bg-rose-700 px-1 rounded' : 'text-rose-600 font-black'
                      : isSelected ? 'text-blue-100' : 'text-slate-700'
                  }`}>
                    {dayObj.overflowAlertCount + dayObj.highAlertCount}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Seasonality simulator and filters row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Simulator controls */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-blue-600" />
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Simulador de Coeficiente Especial
            </h4>
          </div>
          
          <p className="text-xs text-slate-500 font-medium">
            Ajuste a taxa de demanda para projetar feriados locais, vésperas de férias ou flutuações sazonais extremas adicionais.
          </p>

          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Fator de Demanda Extra:</span>
              <span className="text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-mono">
                {customMultiplierOverride.toFixed(2)}x
              </span>
            </div>
            
            <input
              type="range"
              min="0.5"
              max="2.2"
              step="0.05"
              value={customMultiplierOverride}
              onChange={(e) => setCustomMultiplierOverride(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer text-xs"
            />
            
            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
              <span>Baixa (0.5x)</span>
              <span>Padrão (1.0x)</span>
              <span>Pico Feriado (2.2x)</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-1.5">
            <h5 className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wide flex items-center gap-1">
              <Sparkles size={11} /> Impacto Simulado
            </h5>
            <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
              {customMultiplierOverride === 1
                ? "As previsões abaixo estão usando as métricas nativas do dia de acordo com a vocação regional."
                : customMultiplierOverride > 1.3
                  ? `Simulando altíssimo movimento de feriado turístico ou festividades regionais. ${criticalSchedulesCount} saídas correm o risco crítico de excesso de lotação física instantânea.`
                  : customMultiplierOverride < 0.8
                    ? "Simulando dia atípico de baixo fluxo, possivelmente devido a condições do tempo ou greves locais."
                    : "Simulação ativada com pequena calibração de tendência operacional temporária."
              }
            </p>
            {customMultiplierOverride !== 1.0 && (
              <button
                onClick={() => setCustomMultiplierOverride(1.0)}
                className="text-[9px] text-blue-700 font-bold hover:underline cursor-pointer block pt-1"
              >
                Resetar para o Padrão do Calendário
              </button>
            )}
          </div>
        </div>

        {/* Region vocation summary widgets */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Map size={16} className="text-blue-600" />
              Previsão Inteligente por Tipo de Vocação Econômica
            </h4>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Consolidado das Regiões</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-3 border border-slate-150 rounded-lg hover:border-blue-150 transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Turismo 🏖️</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${targetDayOfWeekIndex >= 4 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
                  {targetDayOfWeekIndex >= 4 ? 'Alta Demanda' : 'Padrão Regular'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal font-medium">
                Picos focados no fim de semana (Sexta à Domingo). Regiões litorâneas e estâncias serranas recebem forte aporte turístico. 
              </p>
              <div className="mt-1 text-[10px] text-blue-600 font-bold">
                Impacto estimado: {targetDayOfWeekIndex >= 4 ? '+50% a +85% passageiros' : '-20% a -30% passageiros'}
              </div>
            </div>

            <div className="p-3 border border-slate-150 rounded-lg hover:border-blue-150 transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Metrópoles 🏢</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${targetDayOfWeekIndex === 0 || targetDayOfWeekIndex === 4 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                  {targetDayOfWeekIndex === 0 || targetDayOfWeekIndex === 4 ? 'Pico Corporativo' : 'Padrão Regular'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal font-medium">
                Rotas intermunicipais corporativas de negócios. Fluxo muito forte de segunda cedo e sexta-feira final de tarde.
              </p>
              <div className="mt-1 text-[10px] text-blue-600 font-bold">
                Impacto estimado: {targetDayOfWeekIndex === 0 || targetDayOfWeekIndex === 4 ? '+30% a +45% passageiros' : '-10% a -15% passageiros'}
              </div>
            </div>

            <div className="p-3 border border-slate-150 rounded-lg hover:border-blue-150 transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Industrial 🏭</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${targetDayOfWeekIndex <= 4 ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-500'}`}>
                  {targetDayOfWeekIndex <= 4 ? 'Útil Comercial' : 'Refluxo Comercial'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal font-medium">
                Semicorporativa de polos fabris e manufatura. Demanda estável de segunda a sexta, com esvaziamento total nos fins de semana.
              </p>
              <div className="mt-1 text-[10px] text-blue-600 font-bold">
                Impacto estimado: {targetDayOfWeekIndex <= 4 ? '+10% a +20% passageiros' : '-35% a -45% passageiros'}
              </div>
            </div>

            <div className="p-3 border border-slate-150 rounded-lg hover:border-blue-150 transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Interior/Familiar 🏡</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${targetDayOfWeekIndex === 4 || targetDayOfWeekIndex === 6 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
                  {targetDayOfWeekIndex === 4 || targetDayOfWeekIndex === 6 ? 'Pico Regresso' : 'Padrão Regular'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal font-medium">
                Deslocamentos familiares de estudantes e trabalhadores retornando às origens. Picos nas sextas e domingos de noite.
              </p>
              <div className="mt-1 text-[10px] text-blue-600 font-bold">
                Impacto estimado: {targetDayOfWeekIndex === 4 || targetDayOfWeekIndex === 6 ? '+35% a +55% passageiros' : '-15% a -20%'}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 4. Active Alerts Box */}
      {(criticalSchedulesCount > 0 || warningSchedulesCount > 0) ? (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl space-y-3.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-rose-600" size={20} />
            <h4 className="text-sm font-black text-rose-800 uppercase tracking-wide">
              Aviso do Sistema: Alertas Preditivos de Sobrecarga física ({targetDayOfWeekName})
            </h4>
          </div>
          
          <p className="text-xs text-rose-700 font-medium">
            Com base no comportamento sazonal de {targetDayOfWeekName} (Dia {targetDay}), foram identificados <strong>{criticalSchedulesCount + warningSchedulesCount} horários</strong> vulneráveis. Veja os detalhes e providências recomendadas abaixo:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectedSchedules
              .filter((x) => x.projectedPassengers > 40)
              .map((alertItem, idx) => {
                const isCritical = alertItem.projectedPassengers > 46;
                const excessSeats = alertItem.projectedPassengers - 46;
                
                return (
                  <div key={idx} className={`p-4 rounded-xl border flex gap-3 ${
                    isCritical
                      ? 'bg-white border-rose-200 text-rose-900 shadow-sm'
                      : 'bg-white border-amber-200 text-amber-950 shadow-sm'
                  }`}>
                    <div className="mt-0.5">
                      {isCritical ? (
                        <AlertCircle className="text-rose-600" size={18} />
                      ) : (
                        <AlertTriangle className="text-amber-500" size={18} />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex justify-between items-start">
                        <strong className="text-xs font-black">
                          {alertItem.schedule.departureTime} • ROTA: {alertItem.origin?.name} ➔ {alertItem.dest?.name}
                        </strong>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono ${
                          isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isCritical ? 'Lotação Máxima' : 'Alta Ocupação'}
                        </span>
                      </div>

                      <div className="text-[11px] leading-relaxed text-slate-600 font-medium pt-1">
                        Sazonalidade: <strong className="text-slate-800">{alertItem.seasonalityType}</strong><br/>
                        Demanda esperada de <strong className="text-blue-600">{alertItem.projectedPassengers} passageiros</strong> ({excessSeats > 0 ? `supera o ônibus convencional em ${excessSeats} poltronas` : 'ocupação próxima de 95%'}).
                      </div>

                      <div className="text-[10px] text-indigo-700 font-bold bg-indigo-50/70 p-2 border border-indigo-100 rounded mt-2">
                        💡 Ação Recomendada: {isCritical 
                          ? `Despachar veículo de REFORÇO DE APOIO para às ${alertItem.schedule.departureTime} ou contratar ônibus terceirizado extra.`
                          : "Monitorar bilheteria e escalar preferencialmente veículo com mais poltronas."
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-800">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <div className="text-xs">
            <span className="font-extrabold uppercase block text-[10px] tracking-wider text-emerald-600">Margem Segura Monitorada</span>
            Todas as saídas programadas de <strong>{targetDayOfWeekName} (Dia {targetDay})</strong> estão com previsões de ocupação seguras abaixo da capacidade máxima física de 46 seats.
          </div>
        </div>
      )}

      {/* 5. Comprehensive Projections List */}
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Quadro Geral de Passageiros Projetados ({targetDayOfWeekName})
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Previsão detalhada de embarques por horário e rota de destino.</p>
          </div>

          {/* Interactive filter search */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 text-slate-450" size={14} />
            <input
              type="text"
              placeholder="Filtrar por rota, hora ou vocação..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-xs text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {projectedSchedules.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold">
            Nenhuma rota coincide com os critérios de busca "{filterQuery}".
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-150 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-3.5">Horário</th>
                  <th className="p-3.5">Percurso / Rota</th>
                  <th className="p-3.5">Tipo Rota</th>
                  <th className="p-3.5">Sazonalidade Preditiva</th>
                  <th className="p-3.5">Estimativa de Embarques</th>
                  <th className="p-3.5 text-right">Ação Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {projectedSchedules.map((item, idx) => {
                  const percent = Math.min(100, Math.round((item.projectedPassengers / 46) * 100));
                  const isCritical = item.projectedPassengers > 46;
                  const isWarning = item.projectedPassengers > 40 && item.projectedPassengers <= 46;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-850 text-sm">
                        {item.schedule.departureTime}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-800">{item.origin?.name}</strong>
                          <ArrowRight size={12} className="text-slate-400" />
                          <strong className="text-slate-800">{item.dest?.name}</strong>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                          Atravessa: {item.line.stops.length > 0 ? item.line.stops.join(' • ') : 'Rota Direta'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                          {item.line.serviceType}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-800 font-semibold">{item.seasonalityType}</div>
                        <span className="text-[9px] text-slate-400 font-medium block leading-tight max-w-sm">
                          {item.explanation}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className={`font-mono font-black ${
                            isCritical ? 'text-rose-600' : isWarning ? 'text-amber-500' : 'text-slate-800'
                          }`}>
                            {item.projectedPassengers} / 46 passageiros
                          </span>
                          <span className={`text-[10px] font-bold ${
                            isCritical ? 'text-rose-600' : isWarning ? 'text-amber-500' : 'text-slate-400'
                          }`}>
                            {percent}%
                          </span>
                        </div>
                        
                        {/* Fill visualizer bar */}
                        <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden block">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-2 bg-rose-50 border border-rose-100 text-[10px] font-bold text-rose-600 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                            Reforçar Apoio
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1 px-2 bg-amber-50 border border-amber-100 text-[10px] font-bold text-amber-700 rounded">
                            Upgrade DD/Leito
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700 rounded">
                            Garagem Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
