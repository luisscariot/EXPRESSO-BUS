import React, { useState } from 'react';
import { City, PartnerCompany, Bus } from '../types';
import { generatePartnerCompany } from '../utils/generators';
import { Plus, Globe, MapPin, Sparkles, Trash2, ArrowRight, Bus as BusIcon, Info, Clock } from 'lucide-react';

const REAL_CITIES_COORDS_DB: Record<string, { lat: number; lon: number; population: number; attractiveness: number; vocation: 'metropole' | 'turismo' | 'industrial' | 'interior' }> = {
  'campinas': { lat: -22.9099, lon: -47.0626, population: 1210000, attractiveness: 75, vocation: 'industrial' },
  'santos': { lat: -23.9608, lon: -46.3331, population: 433000, attractiveness: 90, vocation: 'turismo' },
  'saojosedoscampos': { lat: -23.1791, lon: -45.8872, population: 730000, attractiveness: 70, vocation: 'industrial' },
  'sorocaba': { lat: -23.5015, lon: -47.4526, population: 687000, attractiveness: 65, vocation: 'industrial' },
  'ribeiraopreto': { lat: -21.1704, lon: -47.8103, population: 711000, attractiveness: 75, vocation: 'industrial' },
  'saojosedoriopreto': { lat: -20.8114, lon: -49.3737, population: 469000, attractiveness: 60, vocation: 'interior' },
  'bauru': { lat: -22.3145, lon: -49.0587, population: 379000, attractiveness: 55, vocation: 'interior' },
  'piracicaba': { lat: -22.7253, lon: -47.6492, population: 407000, attractiveness: 60, vocation: 'interior' },
  'jundiai': { lat: -23.1857, lon: -46.8978, population: 423000, attractiveness: 70, vocation: 'industrial' },
  'niteroi': { lat: -22.8856, lon: -43.1153, population: 515000, attractiveness: 80, vocation: 'metropole' },
  'petropolis': { lat: -22.5049, lon: -43.1803, population: 306000, attractiveness: 85, vocation: 'turismo' },
  'cabofrio': { lat: -22.8794, lon: -42.0186, population: 230000, attractiveness: 90, vocation: 'turismo' },
  'camposdosgoytacazes': { lat: -21.7538, lon: -41.3251, population: 507000, attractiveness: 55, vocation: 'interior' },
  'uberlandia': { lat: -18.9186, lon: -48.2772, population: 699000, attractiveness: 70, vocation: 'industrial' },
  'juizdefora': { lat: -21.7642, lon: -43.3496, population: 573000, attractiveness: 65, vocation: 'interior' },
  'ipatinga': { lat: -19.4684, lon: -42.5385, population: 265000, attractiveness: 60, vocation: 'industrial' },
  'montesclaros': { lat: -16.7266, lon: -43.8614, population: 413000, attractiveness: 50, vocation: 'interior' },
  'uberaba': { lat: -19.7476, lon: -47.9392, population: 337000, attractiveness: 55, vocation: 'interior' },
  'londrina': { lat: -23.3103, lon: -51.1628, population: 575000, attractiveness: 70, vocation: 'metropole' },
  'maringa': { lat: -23.4210, lon: -51.9331, population: 430000, attractiveness: 65, vocation: 'interior' },
  'joinville': { lat: -26.3044, lon: -48.8456, population: 597000, attractiveness: 75, vocation: 'industrial' },
  'florianopolis': { lat: -27.5954, lon: -48.5480, population: 508000, attractiveness: 95, vocation: 'turismo' },
  'portoalegre': { lat: -30.0346, lon: -51.2177, population: 1488000, attractiveness: 85, vocation: 'metropole' },
  'brasilia': { lat: -15.7942, lon: -47.8822, population: 3015000, attractiveness: 80, vocation: 'metropole' },
  'goiania': { lat: -16.6869, lon: -49.2648, population: 1532000, attractiveness: 75, vocation: 'metropole' },
  'salvador': { lat: -12.9777, lon: -38.5016, population: 2886000, attractiveness: 92, vocation: 'turismo' },
  'vitoria': { lat: -20.3155, lon: -40.3128, population: 365000, attractiveness: 85, vocation: 'turismo' },
};

interface CityManagerProps {
  cities: City[];
  partners: PartnerCompany[];
  fleet: Bus[];
  simTime: { hour: number; minute: number; day: number };
  onAddCity: (city: City, newPartners: PartnerCompany[]) => void;
  onDeleteCity: (id: string) => void;
}

export default function CityManager({ cities, partners, fleet, simTime, onAddCity, onDeleteCity }: CityManagerProps) {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [info, setInfo] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');

  const [vocation, setVocation] = useState<'metropole' | 'turismo' | 'industrial' | 'interior'>('interior');
  const [attractiveness, setAttractiveness] = useState(50);
  const [population, setPopulation] = useState('250000');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [loadingAI, setLoadingAI] = useState(false);

  const fetchRealCityInfo = async () => {
    if (!name.trim() || !stateName.trim()) {
      setError('Por favor, digite o Nome da Cidade e o Estado/UF para buscar as informações na IA.');
      return;
    }
    setLoadingAI(true);
    setError('');

    // Pre-check exact matched database on client-side for lightning-fast high precision bypass
    const normInput = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
    const matched = REAL_CITIES_COORDS_DB[normInput];
    if (matched) {
      setTimeout(() => {
        setLatitude(String(matched.lat));
        setLongitude(String(matched.lon));
        setPopulation(String(matched.population));
        setAttractiveness(matched.attractiveness);
        setVocation(matched.vocation);
        setInfo(`Localização geográfica confirmada com coordenadas de precisão real (${matched.lat}, ${matched.lon}). Excelente polo comercial para expansão.`);
        setLoadingAI(false);
      }, 400);
      return;
    }

    try {
      const response = await fetch('/api/city-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: name.trim(),
          stateName: stateName.trim(),
          country: country.trim(),
          existingCities: cities.map(c => ({ name: c.name, state: c.state, latitude: c.latitude, longitude: c.longitude }))
        })
      });
      if (!response.ok) {
        throw new Error('Falha ao obter dados da cidade na API.');
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setLatitude(data.latitude ? String(data.latitude) : '');
      setLongitude(data.longitude ? String(data.longitude) : '');
      setPopulation(data.population ? String(data.population) : '250000');
      setAttractiveness(data.attractiveness ?? 50);
      setVocation(data.vocation ?? 'interior');
      if (data.additionalInfo) {
        setInfo(data.additionalInfo);
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar dados reais da cidade: ' + (err.message || err));
    } finally {
      setLoadingAI(false);
    }
  };

  React.useEffect(() => {
    if (showAddForm) {
      setLatitude('');
      setLongitude('');
    }
  }, [showAddForm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome da cidade.');
      return;
    }
    if (!stateName.trim()) {
      setError('Por favor, informe o estado (UF).');
      return;
    }

    // Check if duplicate
    const isDuplicate = cities.some(
      (c) => c.name.toLowerCase() === name.trim().toLowerCase() && 
             c.state.toLowerCase() === stateName.trim().toLowerCase()
    );

    if (isDuplicate) {
      setError('Esta cidade já está cadastrada no sistema.');
      return;
    }

    // Precise coordinates lookup logic under submission in case AI failed/skipped
    const normInput = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
    const matched = REAL_CITIES_COORDS_DB[normInput];

    const finalLat = latitude ? parseFloat(latitude) : (matched ? matched.lat : parseFloat((-20 - Math.random() * 4).toFixed(4)));
    const finalLon = longitude ? parseFloat(longitude) : (matched ? matched.lon : parseFloat((-46 - Math.random() * 5).toFixed(4)));
    const finalPop = population ? parseInt(population, 10) : (matched ? matched.population : 250000);
    const finalVoc = vocation && vocation !== 'interior' ? vocation : (matched ? matched.vocation : vocation);
    const finalAttr = attractiveness !== 50 ? attractiveness : (matched ? matched.attractiveness : attractiveness);

    const newCity: City = {
      id: `c_${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      state: stateName.trim().toUpperCase(),
      country: country.trim(),
      latitude: finalLat,
      longitude: finalLon,
      population: finalPop,
      attractiveness: finalAttr,
      vocation: finalVoc,
      additionalInfo: info.trim() || (matched ? `Cidade mapeada com sucesso na base geográfica. Excelentes rotas intermunicipais.` : ''),
    };

    const newPartner = generatePartnerCompany(newCity);
    onAddCity(newCity, [newPartner]);
    
    // Reset
    setName('');
    setStateName('');
    setInfo('');
    setPopulation('250000');
    setAttractiveness(50);
    setVocation('interior');
    setShowAddForm(false);
    setError('');
  };  return (
    <div className="space-y-6">
      
      {/* Upper header action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Globe className="text-blue-600" size={20} />
            Cidades & Empresas Parceiras
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Cadastre novas cidades para expandir sua infraestrutura. Cada nova cidade gera empresas parceiras para cooperação operacional de frota.
          </p>
        </div>

        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm hover:shadow-blue-500/15 transition-all"
          id="btn-toggle-add-city"
        >
          <Plus size={16} />
          {showAddForm ? 'Fechar Formulário' : 'Cadastrar Cidade'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">Nova Interface de Cidade</h3>
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5 space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome da Cidade</label>
              <input
                type="text"
                placeholder="Ex: São Paulo, Campinas, Porto Alegre"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                id="input-city-name-field"
              />
            </div>
            
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado / UF</label>
              <input
                type="text"
                placeholder="Ex: SP, RJ"
                value={stateName}
                onChange={(e) => { setStateName(e.target.value); setError(''); }}
                maxLength={4}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 uppercase text-center focus:outline-none focus:border-blue-500"
                id="input-city-state-field"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">País</label>
              <input
                type="text"
                placeholder="Ex: Brasil"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                id="input-city-country-field"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="button"
                onClick={fetchRealCityInfo}
                disabled={loadingAI}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-150 disabled:to-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold cursor-pointer shadow-sm hover:shadow-indigo-500/10 transition-all h-[36px]"
              >
                {loadingAI ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="text-amber-300 fill-amber-300 animate-pulse" />
                    Buscar Dados (IA)
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Informações Opcionais / Terminal</label>
            <input
              type="text"
              placeholder="Ex: Terminal Rodoviário Tietê, plataforma central..."
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              id="input-city-info"
            />
          </div>

          <p className="text-[10px] text-blue-600 bg-blue-50/60 p-2.5 rounded-lg border border-blue-105/50 leading-relaxed">
            💡 <strong>Plano Inteligente:</strong> A geolocalização exata, a população real e o perfil socioeconômico de atratividade desta cidade serão obtidos e calculados de forma automática em tempo real através de dados de satélite da nossa Inteligência Artificial integrando o mapa.
          </p>

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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              id="submit-new-city-btn"
            >
              Confirmar Cadastro
            </button>
          </div>
        </form>
      )}

      {/* Grid displays */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Cities Column */}
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cidades Cadastradas ({cities.length})</span>
            <span className="text-[10px] text-slate-400">Total de polos operacionais ativos</span>
          </div>

          {cities.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
              <p className="text-slate-400 text-xs italic">Nenhuma cidade cadastrada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities.map((city) => {
                const cityPartners = partners.filter((p) => p.baseCityId === city.id);
                const cityBuses = fleet.filter((b) => !b.isPartner && b.currentCityId === city.id && b.status === 'disponivel');
                const isSelected = selectedCityId === city.id;
                
                const convCount = cityBuses.filter(b => b.serviceType === 'convencional').length;
                const execCount = cityBuses.filter(b => b.serviceType === 'executivo').length;
                const leitCount = cityBuses.filter(b => b.serviceType === 'leito').length;

                const serviceBreakdownList: string[] = [];
                if (convCount > 0) serviceBreakdownList.push(`${convCount} convencional${convCount > 1 ? 's' : ''}`);
                if (execCount > 0) serviceBreakdownList.push(`${execCount} executivo${execCount > 1 ? 's' : ''}`);
                if (leitCount > 0) serviceBreakdownList.push(`${leitCount} leito${leitCount > 1 ? 's' : ''}`);

                const breakdownText = serviceBreakdownList.join(' e ');
                
                return (
                  <div
                    key={city.id}
                    onClick={() => {
                      setSelectedCityId(isSelected ? null : city.id);
                    }}
                    className={`p-5 bg-white border rounded-xl flex flex-col justify-between transition-all group shadow-sm id-city-card cursor-pointer ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-500/25 bg-blue-50/5' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    id={`city-card-${city.id}`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg border transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            <MapPin size={14} />
                          </span>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              {city.name}
                              {cityBuses.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono font-bold">
                                  {cityBuses.length} livre{cityBuses.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </h4>
                            {cityBuses.length > 0 && (
                              <p className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-100/40 px-1.5 py-0.5 rounded font-medium mt-0.5 max-w-max">
                                {breakdownText}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-mono mt-0.5">
                              {city.state}, {city.country}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCity(city.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                          title="Remover Cidade"
                          id={`delete-city-${city.id}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Stationed buses panel - FIXED ALWAYS OPEN */}
                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <BusIcon size={12} className="text-blue-500" />
                            Veículos Disponíveis na Cidade ({cityBuses.length})
                          </span>
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-mono">
                            Fila FIFO
                          </span>
                        </div>

                        {cityBuses.length === 0 ? (
                          <div className="p-3 text-center bg-slate-50 rounded-lg border border-slate-150">
                            <p className="text-[10px] text-slate-400 italic flex items-center justify-center gap-1">
                              <Info size={11} /> Nenhum ônibus disponível nesta garagem.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {cityBuses
                              .sort((a,b) => (a.availableSince ?? 0) - (b.availableSince ?? 0))
                              .map((bus, idx) => {
                                const waitMinutes = bus.availableSince !== undefined 
                                  ? (simTime.day * 1440 + simTime.hour * 60 + simTime.minute) - bus.availableSince 
                                  : 0;
                                  
                                const waitText = waitMinutes <= 0
                                  ? 'Chegou agora'
                                  : waitMinutes < 60
                                    ? `Aguardando há ${waitMinutes}m`
                                    : `Aguardando há ${Math.floor(waitMinutes / 60)}h ${waitMinutes % 60}m`;

                                return (
                                  <div key={bus.id} className="p-2 bg-slate-50 border border-slate-200/85 rounded-lg flex items-center justify-between hover:bg-slate-100/50 transition-all font-sans">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded uppercase ${
                                        bus.isPartner 
                                          ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                                      }`}>
                                        {bus.isPartner ? 'Parceiro' : 'Próprio'}
                                      </span>
                                      <div>
                                        <div className="text-[11px] font-extrabold text-slate-800">
                                          #{bus.prefix} <span className="font-medium text-slate-500">({bus.manufacturer} {bus.model})</span>
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-medium">
                                          Capacidade: {bus.capacity} seats • Pos Fila: <strong className="text-slate-600">#{idx + 1}</strong>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-[9px] font-mono text-slate-500 font-medium flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-slate-155">
                                      <Clock size={9} className="text-slate-400" />
                                      {waitText}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
