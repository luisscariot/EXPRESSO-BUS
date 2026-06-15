import React from 'react';
import { Bus, City, Trip, Line } from '../types';
import { Bus as BusIcon, X, Clock, MapPin, MoveRight, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BusHistoryModalProps {
  isOpen: boolean;
  bus: Bus | null;
  cities: City[];
  trips: Trip[];
  lines: Line[];
  onClose: () => void;
}

export default function BusHistoryModal({
  isOpen,
  bus,
  cities,
  trips,
  lines,
  onClose,
}: BusHistoryModalProps) {
  if (!isOpen || !bus) return null;

  const formatSimulationTime = (minutes: number) => {
    const day = Math.floor(minutes / 1440);
    const hour = Math.floor((minutes % 1440) / 60);
    const min = (minutes % 1440) % 60;
    return `Dia ${day} às ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  // Only consider own fleet trips for this bus history, sorted newest to oldest
  const busTrips = trips
    .filter((t) => t.busId === bus.id && !t.isPartnerTrip)
    .sort((a, b) => b.departureTimestamp - a.departureTimestamp)
    .slice(0, 10);

  const currentCity = cities.find((c) => c.id === bus.currentCityId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                  <BusIcon size={16} />
                </span>
                <h3 className="text-base font-bold text-slate-800">
                  Histórico de Viagens • Ônibus #{bus.prefix}
                </h3>
              </div>
              <p className="text-slate-500 text-xs">
                {bus.manufacturer} {bus.model} ({bus.year}) • {bus.capacity} poltronas
              </p>
              <div className="flex gap-2 items-center text-[10px] text-slate-400 font-medium">
                <span>Serviço: <strong className="text-slate-600 uppercase">{bus.serviceType}</strong></span>
                <span>•</span>
                <span>Local Atual: <strong className="text-slate-600 uppercase">{currentCity ? `${currentCity.name} (${currentCity.state})` : 'Em Rodovia'}</strong></span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Últimas {Math.min(10, busTrips.length)} viagens operadas
            </h4>

            {busTrips.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl space-y-2">
                <Clock size={28} className="mx-auto text-slate-350" />
                <p className="text-slate-500 text-xs font-semibold">Nenhuma viagem registrada</p>
                <p className="text-slate-400 text-[10px] max-w-xs mx-auto">
                  Este veículo ainda não completou nenhuma viagem (ou traslado) na simulação atual.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {busTrips.map((trip) => {
                  let originCityName = 'Desconhecida';
                  let destCityName = 'Desconhecida';
                  
                  if (trip.isTransfer) {
                    const oCity = cities.find(c => c.id === trip.transferOriginCityId);
                    const dCity = cities.find(c => c.id === trip.transferDestCityId);
                    originCityName = oCity ? oCity.name : 'Origem';
                    destCityName = dCity ? dCity.name : 'Destino';
                  } else {
                    const line = lines.find(l => l.id === trip.lineId);
                    if (line) {
                      const oCity = cities.find(c => c.id === line.originCityId);
                      const dCity = cities.find(c => c.id === line.destinationCityId);
                      originCityName = oCity ? oCity.name : 'Origem';
                      destCityName = dCity ? dCity.name : 'Destino';
                    }
                  }

                  // Colors based on trip category/type
                  const typeStyles = trip.isTransfer
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : trip.isExtraTrip
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200";

                  const typeLabel = trip.isTransfer
                    ? "Translado"
                    : trip.isExtraTrip
                    ? "Viagem Extra"
                    : "Viagem Comum";

                  return (
                    <div
                      key={trip.id}
                      className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50/50 transition-colors space-y-2 shadow-xs animate-fade-in text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wider ${typeStyles}`}>
                          {typeLabel}
                        </span>
                        <span className={`text-[9.5px] uppercase font-bold px-2 py-0.5 rounded border ${
                          trip.status === 'concluida'
                            ? 'bg-green-50 text-green-700 border-green-255'
                            : trip.status === 'em_curso'
                            ? 'bg-blue-50 text-blue-700 border-blue-255 animate-pulse'
                            : 'bg-rose-50 text-rose-700 border-rose-255'
                        }`}>
                          {trip.status === 'concluida' ? 'Concluída' : trip.status === 'em_curso' ? 'Em Curso' : 'Cancelada'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-extrabold text-slate-800">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{originCityName}</span>
                        <MoveRight size={12} className="text-slate-400 shrink-0 mx-1" />
                        <span className="truncate">{destCityName}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-100/60 leading-relaxed font-mono">
                        <div className="space-y-0.5">
                          <span className="block font-semibold text-slate-450 text-[8.5px] uppercase">Partida</span>
                          <span className="text-slate-650 font-bold">{formatSimulationTime(trip.departureTimestamp)}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block font-semibold text-slate-450 text-[8.5px] uppercase">Previsão Chegada</span>
                          <span className="text-slate-650 font-bold">{formatSimulationTime(trip.estimatedArrivalTimestamp)}</span>
                        </div>
                      </div>

                      {!trip.isTransfer && (
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100/40 text-[10px] text-slate-500 font-sans">
                          <Users size={12} className="text-slate-400 shrink-0" />
                          <span>
                            Transportados: <strong className="text-slate-700 font-bold">{trip.passengerCount}</strong> passageiros
                          </span>
                        </div>
                      )}

                      {trip.status === 'em_curso' && (
                        <div className="pt-1.5 space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-450 font-bold uppercase overflow-hidden">
                            <span>Progresso da Viagem</span>
                            <span>{Math.round(trip.progress)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1">
                            <div className="bg-blue-600 h-1 rounded-full transition-all duration-300" style={{ width: `${trip.progress}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Fechar Histórico
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
