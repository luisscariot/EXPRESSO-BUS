import React, { useState } from 'react';
import { Bus, Route, Globe, Shield, Star, Play, Settings, Sparkles } from 'lucide-react';

interface CompanySetupProps {
  onSetupComplete: (setup: {
    name: string;
    hqName: string;
    hqState: string;
    hqCountry: string;
    themeColor: string;
    logoIcon: string;
    seedDemo: boolean;
  }) => void;
}

const THEME_COLORS = [
  { name: 'Indigo Nobre', value: 'indigo', bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', border: 'border-indigo-600' },
  { name: 'Esmeralda Rápido', value: 'emerald', bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', border: 'border-emerald-600' },
  { name: 'Ouro Executivo', value: 'amber', bg: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-amber-500', border: 'border-amber-500' },
  { name: 'Crimson Linhas', value: 'rose', bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-600', border: 'border-rose-600' },
  { name: 'Azul Celeste', value: 'sky', bg: 'bg-sky-600', hover: 'hover:bg-sky-700', text: 'text-sky-600', border: 'border-sky-600' },
];

const ICONS = [
  { name: 'Ônibus', label: 'bus', component: Bus },
  { name: 'Rotas', label: 'route', component: Route },
  { name: 'Global', label: 'globe', component: Globe },
  { name: 'Segurança', label: 'shield', component: Shield },
  { name: 'Estrela', label: 'star', component: Star },
];

export default function CompanySetup({ onSetupComplete }: CompanySetupProps) {
  const [name, setName] = useState('');
  const [hqName, setHqName] = useState('');
  const [hqState, setHqState] = useState('SP');
  const [hqCountry, setHqCountry] = useState('Brasil');
  const [themeColor, setThemeColor] = useState('indigo');
  const [logoIcon, setLogoIcon] = useState('bus');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, defina o nome da sua empresa.');
      return;
    }
    if (!hqName.trim()) {
      setError('Por favor, defina uma cidade para a Sede.');
      return;
    }

    onSetupComplete({
      name: name.trim(),
      hqName: hqName.trim(),
      hqState: hqState.trim(),
      hqCountry: hqCountry.trim(),
      themeColor,
      logoIcon,
      seedDemo: false,
    });
  };

  const handleDemo = () => {
    onSetupComplete({
      name: 'Expresso Atlântico',
      hqName: 'São Paulo',
      hqState: 'SP',
      hqCountry: 'Brasil',
      themeColor: 'indigo',
      logoIcon: 'route',
      seedDemo: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 z-10">
        
        {/* Banner Column */}
        <div className="md:col-span-5 flex flex-col justify-between p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-2xl border border-indigo-500/20 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-semibold mb-4 tracking-wider uppercase">
              <Sparkles size={12} />
              Simulação Operacional
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Expresso Bus</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Assuma o comando de sua própria empresa de transporte rodoviário. Planeje rotas, configure horários, gerencie frotas e lidere operações integradas com empresas parceiras em tempo real.
            </p>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6">
            <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider mb-3">Principais Funcionalidades</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Sem pressões financeiras, foco na pontualidade
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Interação e terceirização com Parceiros
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Escala operacional automática e retorno lógico
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Simulador de viagem e mapa da malha rodoviária
              </li>
            </ul>
          </div>

          <div className="mt-8">
            <button
              onClick={handleDemo}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-medium shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer group"
              id="btn-seed-demo"
            >
              <Play size={18} className="group-hover:scale-110 transition-transform" />
              <span>Iniciar com Dados de Demonstração</span>
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-2">
              Recomendado para testar instantaneamente com cidades e frotas prontas.
            </p>
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-7 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 p-8 shadow-xl flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="text-indigo-400" size={18} />
              Criar Empresa do Zero
            </h2>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="Ex: Expresso do Sol, Viação Progresso..."
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                id="input-company-name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Cidade Sede (Central)
                </label>
                <input
                  type="text"
                  value={hqName}
                  onChange={(e) => { setHqName(e.target.value); setError(''); }}
                  placeholder="Ex: Florianópolis, São Paulo..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  id="input-hq-name"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Estado
                </label>
                <input
                  type="text"
                  value={hqState}
                  onChange={(e) => setHqState(e.target.value)}
                  placeholder="Ex: SC, SP..."
                  maxLength={4}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase text-center"
                  id="input-hq-state"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Identidade Visual (Cor do Painel)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {THEME_COLORS.map((color) => {
                  const isSelected = themeColor === color.value;
                  return (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setThemeColor(color.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? `bg-slate-900 ${color.border} text-white shadow-lg`
                          : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${color.bg}`} />
                      {color.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Símbolo Operacional (Logotipo)
              </label>
              <div className="grid grid-cols-5 gap-2.5">
                {ICONS.map((iconItem) => {
                  const IconComp = iconItem.component;
                  const isSelected = logoIcon === iconItem.label;
                  return (
                    <button
                      key={iconItem.label}
                      type="button"
                      onClick={() => setLogoIcon(iconItem.label)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 font-medium'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <IconComp size={20} />
                      <span className="text-[10px]">{iconItem.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer"
                id="btn-create-company"
              >
                Criar Empresa do Zero & Começar
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
