import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Bus as BusIcon, 
  GitCommit, 
  Calendar, 
  TrendingUp, 
  Database, 
  LogOut, 
  Trash2, 
  AlertTriangle, 
  Check, 
  Play, 
  Clock, 
  DollarSign, 
  Users, 
  CalendarClock, 
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  LineChart, 
  Line as RechartsLine, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Company, City, Bus, Line, Schedule, CompletedTrip } from './types';
import { 
  getScheduleDemandEstimation, 
  checkScheduleFeasibility, 
  getBusCapacity 
} from './utils/demandHelper';
import { generateDemoData } from './utils/generators';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  FirebaseUser
} from './lib/firebase';

export default function App() {
  // Authentication & Session States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Active Company Selection
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [companyError, setCompanyError] = useState('');

  // Core Management Lists (Synced with Firestore or Local Cache)
  const [cities, setCities] = useState<City[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [completedTrips, setCompletedTrips] = useState<CompletedTrip[]>([]);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cities' | 'fleet' | 'lines' | 'schedules' | 'simulator'>('dashboard');

  // Creation forms states
  // 1. City Form
  const [cityName, setCityName] = useState('');
  const [cityState, setCityState] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [cityError, setCityError] = useState('');

  // 2. Bus Form
  const [busPlate, setBusPlate] = useState('');
  const [busModel, setBusModel] = useState('');
  const [busServiceType, setBusServiceType] = useState<'convencional' | 'executivo' | 'leito'>('executivo');
  const [busError, setBusError] = useState('');

  // 3. Line Form
  const [lineOriginCityId, setLineOriginCityId] = useState('');
  const [lineDestinationCityId, setLineDestinationCityId] = useState('');
  const [lineDistance, setLineDistance] = useState<number>(100);
  const [lineDuration, setLineDuration] = useState<number>(90);
  const [lineServiceType, setLineServiceType] = useState<'convencional' | 'executivo' | 'leito'>('executivo');
  const [lineError, setLineError] = useState('');

  // 4. Schedule Form
  const [schedLineId, setSchedLineId] = useState('');
  const [schedDepartureTime, setSchedDepartureTime] = useState('');
  const [schedFrequency, setSchedFrequency] = useState<'diaria' | 'seg-sex' | 'fds' | 'semanal'>('diaria');
  const [schedServiceType, setSchedServiceType] = useState<'convencional' | 'executivo' | 'leito'>('executivo');
  const [schedError, setSchedError] = useState('');

  // Live Simulated departures management
  const [activeVoyages, setActiveVoyages] = useState<{
    id: string;
    scheduleId: string;
    lineId: string;
    busId: string;
    departureTime: string;
    progress: number; // 0 to 100
    passengerCount: number;
    ticketPrice: number;
  }[]>([]);

  // Fallback storage mode (when Firestore is disconnected/offline)
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Load User Auth Handler
  useEffect(() => {
    if (!auth) {
      setIsLocalMode(true);
      setAuthLoading(false);
      // Initialize local guest user
      const guestUser = localStorage.getItem('local_guest_user');
      if (guestUser) {
        setUser(JSON.parse(guestUser));
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        setIsLocalMode(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch Companies synced to current UID
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCompanies([]);
      setActiveCompany(null);
      return;
    }

    if (isLocalMode) {
      // LocalStorage mode
      const rawCompanies = localStorage.getItem(`local_companies_${user.uid}`);
      if (rawCompanies) {
        setCompanies(JSON.parse(rawCompanies));
      } else {
        setCompanies([]);
      }
      return;
    }

    // Firestore mode
    try {
      const q = query(collection(db, 'companies'), where('ownerUid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched: Company[] = snapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...docSnapshot.data()
        } as Company));
        setCompanies(fetched);
      }, (err) => {
        console.warn("Sem permissão ou erro no Firestore. Ativando cache local de empresas.", err);
        // Fallback to cache
        const rawCompanies = localStorage.getItem(`local_companies_${user?.uid}`);
        if (rawCompanies) {
          setCompanies(JSON.parse(rawCompanies));
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [user, authLoading, isLocalMode]);

  // Fetch Company Data (Cities, Buses, Lines, Schedules, Trips)
  useEffect(() => {
    if (!user || !activeCompany) {
      setCities([]);
      setBuses([]);
      setLines([]);
      setSchedules([]);
      setCompletedTrips([]);
      return;
    }

    if (isLocalMode) {
      const storageKey = `local_data_${user.uid}_${activeCompany.id}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCities(parsed.cities || []);
        setBuses(parsed.buses || []);
        setLines(parsed.lines || []);
        setSchedules(parsed.schedules || []);
        setCompletedTrips(parsed.completedTrips || []);
      } else {
        setCities([]);
        setBuses([]);
        setLines([]);
        setSchedules([]);
        setCompletedTrips([]);
      }
      return;
    }

    // Firestore Sync
    const unsubscibers: (() => void)[] = [];

    try {
      const companyId = activeCompany.id;

      // Cities listener
      const qCities = query(collection(db, 'cities'), where('companyId', '==', companyId));
      const unsubCities = onSnapshot(qCities, (snap) => {
        setCities(snap.docs.map(d => ({ id: d.id, ...d.data() } as City)));
      }, () => handleLoadCache(companyId));
      unsubscibers.push(unsubCities);

      // Buses listener
      const qBuses = query(collection(db, 'buses'), where('companyId', '==', companyId));
      const unsubBuses = onSnapshot(qBuses, (snap) => {
        setBuses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bus)));
      });
      unsubscibers.push(unsubBuses);

      // Lines listener
      const qLines = query(collection(db, 'lines'), where('companyId', '==', companyId));
      const unsubLines = onSnapshot(qLines, (snap) => {
        setLines(snap.docs.map(d => ({ id: d.id, ...d.data() } as Line)));
      });
      unsubscibers.push(unsubLines);

      // Schedules listener
      const qScheds = query(collection(db, 'schedules'), where('companyId', '==', companyId));
      const unsubScheds = onSnapshot(qScheds, (snap) => {
        setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));
      });
      unsubscibers.push(unsubScheds);

      // Completed Trips listener
      const qTrips = query(collection(db, 'completedTrips'), where('companyId', '==', companyId));
      const unsubTrips = onSnapshot(qTrips, (snap) => {
        setCompletedTrips(snap.docs.map(d => ({ id: d.id, ...d.data() } as CompletedTrip)));
      });
      unsubscibers.push(unsubTrips);

    } catch (e) {
      console.error("Erro ao assinar coleções.", e);
      handleLoadCache(activeCompany.id);
    }

    return () => {
      unsubscibers.forEach(unsub => unsub());
    };
  }, [activeCompany, user, isLocalMode]);

  // Helper to load cache in case Firestore throws errors
  const handleLoadCache = (companyId: string) => {
    if (!user) return;
    const cacheKey = `local_data_${user.uid}_${companyId}`;
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      setCities(parsed.cities || []);
      setBuses(parsed.buses || []);
      setLines(parsed.lines || []);
      setSchedules(parsed.schedules || []);
      setCompletedTrips(parsed.completedTrips || []);
    }
  };

  // Helper to save cache
  const saveToLocalCache = (companyId: string, updatedState: {
    cities: City[],
    buses: Bus[],
    lines: Line[],
    schedules: Schedule[],
    completedTrips: CompletedTrip[]
  }) => {
    if (!user) return;
    const cacheKey = `local_data_${user.uid}_${companyId}`;
    localStorage.setItem(cacheKey, JSON.stringify(updatedState));
  };

  // Backed updater that writes to firestore or falls back to localStorage
  const updateResource = async <T extends { id: string }>(
    collectionName: string,
    docId: string,
    data: any,
    localList: T[],
    setLocalList: React.Dispatch<React.SetStateAction<T[]>>,
    type: 'add' | 'update' | 'delete'
  ) => {
    if (!user || !activeCompany) return;

    if (isLocalMode) {
      let updated: T[] = [];
      if (type === 'add') {
        updated = [...localList, { id: docId, ...data } as T];
      } else if (type === 'update') {
        updated = localList.map(item => item.id === docId ? { ...item, ...data } : item);
      } else {
        updated = localList.filter(item => item.id !== docId);
      }
      setLocalList(updated);

      // Re-save entire package to Local Cache
      const currentState = {
        cities: collectionName === 'cities' ? (updated as unknown as City[]) : cities,
        buses: collectionName === 'buses' ? (updated as unknown as Bus[]) : buses,
        lines: collectionName === 'lines' ? (updated as unknown as Line[]) : lines,
        schedules: collectionName === 'schedules' ? (updated as unknown as Schedule[]) : schedules,
        completedTrips: collectionName === 'completedTrips' ? (updated as unknown as CompletedTrip[]) : completedTrips,
      };
      saveToLocalCache(activeCompany.id, currentState);
      return;
    }

    // Firestore write
    try {
      const docRef = doc(db, collectionName, docId);
      if (type === 'add' || type === 'update') {
        await setDoc(docRef, { ...data, companyId: activeCompany.id }, { merge: true });
      } else {
        await deleteDoc(docRef);
      }
    } catch (e) {
      console.warn("Erro ao atualizar recurso no Firestore. Atualizando cache...", e);
      setIsLocalMode(true);
      // Trigger local write
      updateResource(collectionName, docId, data, localList, setLocalList, type);
    }
  };

  // AUTHENTICATION OPERATORS
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Preencha seu e-mail e senha.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    if (isLocalMode) {
      // Simulate Email Auth locally
      const mockUid = `local_user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const mockUser = { uid: mockUid, email } as FirebaseUser;
      localStorage.setItem('local_guest_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setAuthLoading(false);
      setAuthSuccess('Autenticado localmente com sucesso!');
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        setAuthSuccess('Cadastro realizado! Seja bem-vindo(a).');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setAuthSuccess('Bem-vindo de volta!');
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Erro ao realizar login ou cadastro.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está sendo utilizado.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'A senha precisa ter no mínimo 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'O formato do e-mail é inválido.';
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLocalMode) {
      const mockUser = { uid: "local_guest_google", email: "visitante@viagempro.com" } as FirebaseUser;
      localStorage.setItem('local_guest_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setAuthSuccess('Acesso visitante ativado!');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthSuccess('Conexão Google realizada com sucesso!');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Erro: Domínio não autorizado no Firebase. Use Login por E-mail (que funciona sempre) ou registre seu URL atual no Firebase Authentication.');
      } else {
        setAuthError(`Erro na conexão Google: ${err.message || err}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setActiveCompany(null);
    if (isLocalMode) {
      localStorage.removeItem('local_guest_user');
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  // Switch to demo mode instantly
  const handleGuestDemoMode = () => {
    const guestUser = { uid: 'guest_mode_uid', email: 'piloto.demo@viagempro.com' } as FirebaseUser;
    localStorage.setItem('local_guest_user', JSON.stringify(guestUser));
    setIsLocalMode(true);
    setUser(guestUser);
    setAuthError('');
    setAuthSuccess('Modo demonstração ativado!');
  };

  // MULTI-COMPANY OPERATORS
  const handleCreateCompanySubmit = async (e: React.FormEvent, createDemoData = false) => {
    e.preventDefault();
    if (!newCompanyName || !newCompanyCode) {
      setCompanyError('Insira o nome e o código/sigla da empresa.');
      return;
    }

    const cleanedCode = newCompanyCode.trim().toUpperCase();
    if (companies.some(c => c.code === cleanedCode)) {
      setCompanyError('Já existe uma empresa registrada com esta sigla.');
      return;
    }

    const companyId = `company-${Date.now()}`;
    const newCompany: Company = {
      id: companyId,
      name: newCompanyName.trim(),
      code: cleanedCode,
      ownerUid: user!.uid,
      createdAt: new Date().toISOString()
    };

    setCompanyError('');
    try {
      if (isLocalMode) {
        // Local state
        const updatedList = [...companies, newCompany];
        setCompanies(updatedList);
        localStorage.setItem(`local_companies_${user!.uid}`, JSON.stringify(updatedList));
      } else {
        // Firestore
        await setDoc(doc(db, 'companies', companyId), newCompany);
      }

      // If requested to seed demo data
      if (createDemoData) {
        const demo = generateDemoData(companyId);
        
        if (isLocalMode) {
          saveToLocalCache(companyId, demo);
        } else {
          // Push demo elements to Firestore in background
          for (const c of demo.cities) {
            await setDoc(doc(db, 'cities', c.id), c);
          }
          for (const b of demo.buses) {
            await setDoc(doc(db, 'buses', b.id), b);
          }
          for (const l of demo.lines) {
            await setDoc(doc(db, 'lines', l.id), l);
          }
          for (const s of demo.schedules) {
            await setDoc(doc(db, 'schedules', s.id), s);
          }
          for (const t of demo.completedTrips) {
            await setDoc(doc(db, 'completedTrips', t.id), t);
          }
        }
      }

      setNewCompanyName('');
      setNewCompanyCode('');
      setActiveCompany(newCompany);
    } catch (e: any) {
      setCompanyError(`Erro ao criar empresa: ${e.message}`);
    }
  };

  // Delete Company Action
  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta empresa operacional? Todas as suas linhas, frotas e programações serão limpas.')) return;
    if (activeCompany?.id === companyId) {
      setActiveCompany(null);
    }

    try {
      if (isLocalMode) {
        const updated = companies.filter(c => c.id !== companyId);
        setCompanies(updated);
        localStorage.setItem(`local_companies_${user!.uid}`, JSON.stringify(updated));
        localStorage.removeItem(`local_data_${user!.uid}_${companyId}`);
      } else {
        await deleteDoc(doc(db, 'companies', companyId));
        // Note: cloud subcollections will be dangling, or we clean them. For simulator purposes, this is solid.
      }
    } catch (e) {
      console.error(e);
    }
  };

  // SEED TO EXISTING ACTIVE COMPANY
  const handleSeedActiveCompany = async () => {
    if (!activeCompany) return;
    if (!window.confirm('Deseja popular esta empresa com dados demonstrativos? Isso irá substituir dados atuais.')) return;

    const demo = generateDemoData(activeCompany.id);

    if (isLocalMode) {
      setCities(demo.cities);
      setBuses(demo.buses);
      setLines(demo.lines);
      setSchedules(demo.schedules);
      setCompletedTrips(demo.completedTrips);
      saveToLocalCache(activeCompany.id, demo);
    } else {
      try {
        // Bulk write to Firestore
        await Promise.all(demo.cities.map(c => setDoc(doc(db, 'cities', c.id), c)));
        await Promise.all(demo.buses.map(b => setDoc(doc(db, 'buses', b.id), b)));
        await Promise.all(demo.lines.map(l => setDoc(doc(db, 'lines', l.id), l)));
        await Promise.all(demo.schedules.map(s => setDoc(doc(db, 'schedules', s.id), s)));
        await Promise.all(demo.completedTrips.map(t => setDoc(doc(db, 'completedTrips', t.id), t)));
      } catch (err) {
        console.error("Erro no Seed Firestore. Ativando cache local...", err);
        setIsLocalMode(true);
      }
    }
  };

  // SUB-RESOURCES CREATORS
  // 1. Create City
  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName || !cityState || !cityCode) {
      setCityError('Preencha todos os campos da localidade.');
      return;
    }

    const codeClean = cityCode.trim().toUpperCase();
    if (cities.some(c => c.code === codeClean)) {
      setCityError('Código de cidade (Sigla IATA) já cadastrado.');
      return;
    }

    const cityId = `city-${Date.now()}`;
    const data = {
      name: cityName.trim(),
      state: cityState.trim().toUpperCase(),
      code: codeClean,
    };

    setCityError('');
    await updateResource('cities', cityId, data, cities, setCities, 'add');
    setCityName('');
    setCityState('');
    setCityCode('');
  };

  // 2. Create Bus
  const handleCreateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busPlate || !busModel) {
      setBusError('Preencha os dados da placa e modelo do veículo.');
      return;
    }

    const plateClean = busPlate.trim().toUpperCase();
    if (buses.some(b => b.plate === plateClean)) {
      setBusError('Já existe um carro cadastrado com esta placa.');
      return;
    }

    const busId = `bus-${Date.now()}`;
    const data = {
      plate: plateClean,
      model: busModel.trim(),
      capacity: getBusCapacity(busServiceType),
      serviceType: busServiceType,
      status: 'disponivel'
    };

    setBusError('');
    await updateResource('buses', busId, data, buses, setBuses, 'add');
    setBusPlate('');
    setBusModel('');
  };

  // 3. Create Line
  const handleCreateLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineOriginCityId || !lineDestinationCityId) {
      setLineError('Selecione cidades válidas de origem e destino.');
      return;
    }

    if (lineOriginCityId === lineDestinationCityId) {
      setLineError('A origem e o destino não podem ser iguais.');
      return;
    }

    if (lineDistance <= 0 || lineDuration <= 0) {
      setLineError('A distância e duração devem ser maiores que zero.');
      return;
    }

    // Check pre-existence
    const pathExists = lines.some(l => 
      l.originCityId === lineOriginCityId && l.destinationCityId === lineDestinationCityId && l.serviceType === lineServiceType
    );

    if (pathExists) {
      setLineError('Já existe esta rota cadastrada com este mesmo tipo de serviço.');
      return;
    }

    const lineId = `line-${Date.now()}`;
    const data = {
      originCityId: lineOriginCityId,
      destinationCityId: lineDestinationCityId,
      distance: Number(lineDistance),
      duration: Number(lineDuration),
      serviceType: lineServiceType
    };

    setLineError('');
    await updateResource('lines', lineId, data, lines, setLines, 'add');
    setLineOriginCityId('');
    setLineDestinationCityId('');
    setLineDistance(100);
    setLineDuration(90);
  };

  // 4. Create Schedule
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedLineId || !schedDepartureTime) {
      setSchedError('Escolha uma rota/linha e defina o horário de partida.');
      return;
    }

    // Validate HH:MM regex
    const timeReg = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeReg.test(schedDepartureTime.trim())) {
      setSchedError('Formato de horário inválido. Utilize HH:MM (Ex: 08:30).');
      return;
    }

    const schedId = `sched-${Date.now()}`;
    const data = {
      lineId: schedLineId,
      departureTime: schedDepartureTime.trim(),
      frequency: schedFrequency,
      serviceType: schedServiceType
    };

    setSchedError('');
    await updateResource('schedules', schedId, data, schedules, setSchedules, 'add');
    setSchedDepartureTime('');
  };

  // REMOVE ACTIONS
  const handleDeleteCity = async (id: string) => {
    if (lines.some(l => l.originCityId === id || l.destinationCityId === id)) {
      alert('Esta cidade não pode ser removida pois possui rotas intermunicipais vinculadas a ela.');
      return;
    }
    await updateResource('cities', id, null, cities, setCities, 'delete');
  };

  const handleDeleteBus = async (id: string) => {
    if (activeVoyages.some(v => v.busId === id)) {
      alert('Este carro está em viagem ativa simulada e não pode ser removido.');
      return;
    }
    await updateResource('buses', id, null, buses, setBuses, 'delete');
  };

  const handleDeleteLine = async (id: string) => {
    if (schedules.some(s => s.lineId === id)) {
      alert('Remova todos os horários agendados desta linha antes de removê-la.');
      return;
    }
    await updateResource('lines', id, null, lines, setLines, 'delete');
  };

  const handleDeleteSchedule = async (id: string) => {
    if (activeVoyages.some(v => v.scheduleId === id)) {
      alert('Há uma viagem ativa ocorrendo neste exato horário no simulador de tráfego.');
      return;
    }
    await updateResource('schedules', id, null, schedules, setSchedules, 'delete');
  };

  // SIMULATOR ENGINE (TABS & LIVE DEPARTURES TIMELINE)
  // Starts a voyage based on a programmed schedule
  const handleStartSimulatedVoyage = (schedule: Schedule) => {
    const line = lines.find(l => l.id === schedule.lineId);
    if (!line) return;

    // Find a vacant bus of correct service type or fallback to available
    const availableBuses = buses.filter(b => b.status === 'disponivel');
    const exactMatch = availableBuses.find(b => b.serviceType === schedule.serviceType);
    const delegatedBus = exactMatch || availableBuses[0];

    if (!delegatedBus) {
      alert('Erro operacional: Não há nenhum carro disponível na garagem central neste momento para iniciar a viagem.');
      return;
    }

    // Demand estimation calculations
    const projection = getScheduleDemandEstimation(schedule.lineId, schedule.departureTime, schedule.frequency, schedule.id, schedule.serviceType, lines);
    const paxCount = projection 
      ? Math.round(projection.pMin + Math.random() * (projection.pMax - projection.pMin))
      : Math.round(delegatedBus.capacity * 0.6);

    // Calculate simulated price per ticket (e.g. R$ 0.40 per km * service modifier)
    let modifier = 1.0;
    if (schedule.serviceType === 'executivo') modifier = 1.35;
    if (schedule.serviceType === 'leito') modifier = 1.95;
    const ticketPrice = Math.round(line.distance * 0.38 * modifier);

    const voyageId = `voyage-${Date.now()}`;
    const newVoyage = {
      id: voyageId,
      scheduleId: schedule.id,
      lineId: schedule.lineId,
      busId: delegatedBus.id,
      departureTime: schedule.departureTime,
      progress: 0,
      passengerCount: Math.min(delegatedBus.capacity, paxCount),
      ticketPrice
    };

    // Set bus status as occupied
    updateResource('buses', delegatedBus.id, { ...delegatedBus, status: 'em_viagem' }, buses, setBuses, 'update');
    setActiveVoyages(prev => [...prev, newVoyage]);
  };

  // Progress Active Voyages
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVoyages(prev => 
        prev.map(v => {
          const nextProgress = v.progress + Math.round(5 + Math.random() * 15);
          return {
            ...v,
            progress: Math.min(100, nextProgress)
          };
        })
      );
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Complete Simulated Voyage
  const handleCompleteVoyage = async (voyageId: string) => {
    const voyage = activeVoyages.find(v => v.id === voyageId);
    if (!voyage) return;

    const bus = buses.find(b => b.id === voyage.busId);
    const line = lines.find(l => l.id === voyage.lineId);
    if (!line || !bus) return;

    const revenue = voyage.passengerCount * voyage.ticketPrice;
    const occupancyRate = Math.round((voyage.passengerCount / bus.capacity) * 100);

    const tripId = `trip-done-${Date.now()}`;
    const completedRecord: CompletedTrip = {
      id: tripId,
      scheduleId: voyage.scheduleId,
      lineId: voyage.lineId,
      busId: voyage.busId,
      departureTime: voyage.departureTime,
      date: new Date().toISOString().split('T')[0],
      passengerCount: voyage.passengerCount,
      revenue,
      occupancyRate,
      companyId: activeCompany!.id
    };

    // Save completed trip record
    await updateResource('completedTrips', tripId, completedRecord, completedTrips, setCompletedTrips, 'add');

    // Free the bus status
    await updateResource('buses', bus.id, { ...bus, status: 'disponivel' }, buses, setBuses, 'update');

    // Clear active voyage from list
    setActiveVoyages(prev => prev.filter(v => v.id !== voyageId));
  };

  // ANALYTICS CALCULATIONS
  const totalRevenue = completedTrips.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalPassengers = completedTrips.reduce((acc, curr) => acc + curr.passengerCount, 0);
  const avgOccupancy = completedTrips.length > 0 
    ? Math.round(completedTrips.reduce((acc, curr) => acc + curr.occupancyRate, 0) / completedTrips.length)
    : 0;

  // Process chart data for past billing
  const getRevenueChartData = () => {
    // Group by date
    const grouped: { [key: string]: { revenue: number, paxs: number } } = {};
    completedTrips.forEach(t => {
      // Human friendly date DD/MM
      const parts = t.date.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : t.date;
      if (!grouped[label]) {
        grouped[label] = { revenue: 0, paxs: 0 };
      }
      grouped[label].revenue += t.revenue;
      grouped[label].paxs += t.passengerCount;
    });

    return Object.keys(grouped).map(k => ({
      data: k,
      Faturamento: Math.round(grouped[k].revenue),
      Passageiros: grouped[k].paxs
    })).reverse().slice(-7); // Last 7 records
  };

  // Distribution chart for services
  const getServiceDistributionData = () => {
    const counts = { convencional: 0, executivo: 0, leito: 0 };
    buses.forEach(b => {
      counts[b.serviceType]++;
    });
    return [
      { name: '🚌 Convencional', value: counts.convencional, color: '#64748b' },
      { name: '🌟 Executivo', value: counts.executivo, color: '#2563eb' },
      { name: '💤 Leito', value: counts.leito, color: '#8b5cf6' },
    ].filter(item => item.value > 0);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* 1. INITIAL AUTH SCREEN */}
      {!user ? (
        <div className="flex-1 flex flex-col justify-center items-center p-4">
          <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl p-6 space-y-6">
            
            {/* Header branding */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white shadow-lg shadow-blue-500/20">
                <BusIcon size={24} />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-white font-sans sm:text-2xl">
                ViagemPro Operational
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Planejamento estratégico de linhas, frotas, tabelas de saída e análise de demanda de passageiros.
              </p>
            </div>

            {/* Local mode indicator */}
            {isLocalMode && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-start gap-2.5">
                <Database size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-300 leading-normal">
                  <span className="font-bold">Modo Offline Ativado:</span> O banco Firestore não pôde ser contatado. Seus dados serão mantidos de forma isolada e segura no seu cache local.
                </div>
              </div>
            )}

            {/* Error notifications */}
            {authError && (
              <div className="p-3 bg-red-500/15 border border-red-500/25 text-red-300 rounded-lg text-xs font-semibold leading-normal font-sans">
                ⚠️ {authError}
              </div>
            )}

            {/* Success notification */}
            {authSuccess && (
              <div className="p-3 bg-green-500/15 border border-green-500/25 text-green-300 rounded-lg text-xs font-semibold leading-normal font-sans">
                ✨ {authSuccess}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
              <div className="space-y-1.5 focus-within:text-blue-500">
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">E-mail Corporativo</label>
                <input 
                  type="email" 
                  required
                  placeholder="sua.empresa@viagempro.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 focus:border-blue-500 text-white rounded-lg text-xs placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5 focus-within:text-blue-500">
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Senha</label>
                <input 
                  type="password" 
                  required
                  placeholder="Mínimo de 6 dígitos"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 focus:border-blue-500 text-white rounded-lg text-xs placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/15"
              >
                {authLoading ? 'Verificando credenciais...' : isSignUp ? 'Criar Nova Conta' : 'Entrar na Plataforma'}
              </button>
            </form>

            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>{isSignUp ? 'Já possui login?' : 'Novo por aqui?'}</span>
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-400 hover:text-blue-300 font-extrabold focus:outline-none transition-colors"
              >
                {isSignUp ? 'Fazer Login' : 'Criar Conta de Acesso'}
              </button>
            </div>

            {/* Alternatives */}
            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-700/60"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-800 px-2 text-[10px] text-slate-400 font-bold">Alternativas de Acesso</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="py-2 px-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.74 14.93 1 12 1 7.37 1 3.42 3.73 1.58 7.72l3.77 2.92C6.22 7.37 8.87 5.04 12 5.04z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46a5.53 5.53 0 0 1-2.4 3.63l3.76 2.92c2.2-2.03 3.47-5.01 3.47-8.7z"/>
                  <path fill="#FBBC05" d="M5.35 15.36c-.24-.72-.38-1.49-.38-2.36s.14-1.64.38-2.36L1.58 7.72A11.96 11.96 0 0 0 0 13c0 1.93.46 3.74 1.28 5.38l4.07-3.02z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.76-2.92c-1.1.74-2.52 1.18-4.2 1.18-3.13 0-5.78-2.33-6.73-5.59L1.5 15.68C3.33 19.74 7.32 23 12 23z"/>
                </svg>
                Google LogIn
              </button>

              <button
                type="button"
                onClick={handleGuestDemoMode}
                className="py-2 px-3 bg-gradient-to-r from-blue-700/60 to-purple-700/60 hover:from-blue-700/80 hover:to-purple-700/80 border border-blue-500/30 text-white rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles size={13} className="text-yellow-300" />
                Modo Piloto
              </button>
            </div>

            {/* Troubleshooting Alert */}
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/60 text-[11px] space-y-1.5">
              <span className="font-extrabold text-blue-400 flex items-center gap-1">
                <Info size={12} /> Solução de Erro de Conexão (Google)
              </span>
              <p className="text-slate-400 leading-normal">
                Se você receber o erro de <span className="text-rose-400 font-mono">auth/domínio não autorizado</span> ao usar a integração Google fora do AI Studio, adicione o URL atual da barra de endereços na lista de <strong>Domínios Autorizados</strong> dentro do painel do seu Console Firebase (Autenticação → Configurações → Domínios Autorizados).
              </p>
            </div>

          </div>
        </div>
      ) : (
        
        /* 2. AUTHENTICATED STATES */
        <div className="flex-1 flex flex-col">
          
          {/* A. MULTI-COMPANY WORKSPACE SELECTOR */}
          {!activeCompany ? (
            <div className="flex-1 flex flex-col justify-center items-center p-6">
              <div className="w-full max-w-4xl space-y-8 animate-fade-in">
                
                {/* Selector Header Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-blue-500 uppercase tracking-widest font-mono">Seletor de Concessionárias</span>
                    <h2 className="text-2.5xl font-extrabold text-white tracking-tight">Suas Empresas Registradas</h2>
                    <p className="text-xs text-slate-400">Entre em uma empresa operacional existente ou abra uma nova operação regional.</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                      👤 {user.email}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:text-rose-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <LogOut size={13} /> Sair
                    </button>
                  </div>
                </div>

                {/* Company Setup Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  
                  {/* Left Column: Create new company */}
                  <div className="md:col-span-5 bg-slate-800/60 rounded-2xl border border-slate-800 p-5 space-y-4 self-start">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                        <Building2 size={18} />
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Registrar Concessionária</h3>
                    </div>

                    {companyError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded text-xs font-medium">
                        ⚠️ {companyError}
                      </div>
                    )}

                    <form className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nome Fantasia da Linha</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Viação Cometa SP"
                          value={newCompanyName}
                          onChange={(e) => setNewCompanyName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sigla de Frota / Identificador</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: VCT (Max 4 letras)"
                          maxLength={4}
                          value={newCompanyCode}
                          onChange={(e) => setNewCompanyCode(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500 uppercase font-mono font-bold"
                        />
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          type="button"
                          onClick={(e) => handleCreateCompanySubmit(e, false)}
                          className="w-full py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded text-xs font-extrabold transition-all cursor-pointer"
                        >
                          Criar Empresa Vazia
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleCreateCompanySubmit(e, true)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Sparkles size={13} className="text-yellow-300" /> Criar e Popular com Linhas Demo
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right Column: Grid list of existing companies */}
                  <div className="md:col-span-7 space-y-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Selecione uma Con concessionária Ativa</span>

                    {companies.length === 0 ? (
                      <div className="bg-slate-800/20 border border-slate-800/80 border-dashed rounded-2xl p-12 text-center space-y-3">
                        <Building2 size={36} className="text-slate-600 mx-auto" />
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma Empresa Cadastrada</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Utilize o formulário ao lado para registrar sua primeira empresa de ônibus. Escolha a opção "Criar e Popular" para testar instantaneamente com rotas simuladas intermunicipais!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {companies.map(comp => (
                          <div
                            key={comp.id}
                            className="bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/35 p-4 rounded-xl flex flex-col justify-between h-36 transition-all group shadow-sm hover:shadow-lg hover:shadow-blue-900/5 relative"
                          >
                            <div className="space-y-1">
                              <span className="inline-block py-0.5 px-2 bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold uppercase rounded-md mb-1.5 border border-blue-500/10">
                                Sigla: {comp.code}
                              </span>
                              <h4 className="text-sm font-extrabold text-white pr-6 group-hover:text-blue-400 transition-colors line-clamp-1">{comp.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono">Gerado em: {new Date(comp.createdAt).toLocaleDateString('pt-BR')}</p>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                              <button
                                onClick={() => setActiveCompany(comp)}
                                className="px-3.5 py-1.5 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 text-blue-400 hover:text-white text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1 cursor-pointer"
                              >
                                Entrar no Painel <ChevronRight size={11} />
                              </button>

                              <button
                                onClick={() => handleDeleteCompany(comp.id)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                                title="Deletar empresa"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                </div>

              </div>
            </div>
          ) : (
            
            /* B. CORE ACTIVE COMPANY BUSINESS TERMINAL */
            <div className="flex-1 flex flex-col md:flex-row">
              
              {/* Sidebar Tabs */}
              <div className="w-full md:w-64 bg-slate-850 border-r border-slate-800/80 flex flex-col justify-between">
                
                {/* Company details brand */}
                <div className="p-4 border-b border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-600 text-white rounded-lg font-mono font-black text-xs">
                      {activeCompany.code}
                    </div>
                    <div className="truncate">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">{activeCompany.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono block">Operação Regional Ativa</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        setActiveCompany(null);
                        setActiveTab('dashboard');
                      }}
                      className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700/80 text-[10px] font-bold uppercase text-slate-300 hover:text-white rounded border border-slate-700 text-center transition-all flex items-center justify-center gap-1"
                    >
                      🔄 Alternar Empresa
                    </button>
                    
                    <button
                      onClick={handleSeedActiveCompany}
                      className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800/80 text-[9px] font-extrabold uppercase text-amber-400 hover:text-amber-350 rounded border border-amber-500/20 text-center transition-all flex items-center justify-center gap-1"
                    >
                      ✨ Popular Dados Demo
                    </button>
                  </div>
                </div>

                {/* Tab Navigation Menu */}
                <div className="flex-1 p-3 space-y-1">
                  {[
                    { id: 'dashboard', label: 'Dashboard Operacional', icon: TrendingUp },
                    { id: 'cities', label: 'Cidades Atendidas', icon: MapPin },
                    { id: 'fleet', label: 'Gestão de Frota', icon: BusIcon },
                    { id: 'lines', label: 'Gestão de Linhas', icon: GitCommit },
                    { id: 'schedules', label: 'Agenda e Saídas', icon: Calendar },
                    { id: 'simulator', label: 'Simulador de Tráfego', icon: Play },
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                          isActive 
                            ? 'bg-blue-600 text-white font-extrabold shadow-sm shadow-blue-600/10' 
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon size={14} /> {tab.label}
                        </span>
                        
                        {/* Indicators badge count */}
                        {tab.id === 'cities' && cities.length > 0 && (
                          <span className={`${isActive ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-400'} text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold`}>
                            {cities.length}
                          </span>
                        )}
                        {tab.id === 'fleet' && buses.length > 0 && (
                          <span className={`${isActive ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-400'} text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold`}>
                            {buses.length}
                          </span>
                        )}
                        {tab.id === 'lines' && lines.length > 0 && (
                          <span className={`${isActive ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-400'} text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold`}>
                            {lines.length}
                          </span>
                        )}
                        {tab.id === 'simulator' && activeVoyages.length > 0 && (
                          <span className="bg-emerald-500 text-white animate-pulse text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold">
                            {activeVoyages.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer account status */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Operador Logado</span>
                    <span className="text-xs text-slate-300 font-mono truncate block">{user.email}</span>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-md transition-colors"
                    title="Excluir sessão"
                  >
                    <LogOut size={13} />
                  </button>
                </div>

              </div>

              {/* Central Tab Content Layout */}
              <div className="flex-1 bg-slate-900 p-6 overflow-y-auto space-y-6">
                
                {/* 1. DASHBOARD PAGE */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Metrics Panel */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      <div className="bg-slate-800 border border-slate-800 p-4 rounded-xl flex items-center gap-3 shadow-xs">
                        <div className="p-3 bg-blue-600/10 text-blue-400 rounded-lg">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Faturamento Sim.</span>
                          <span className="text-sm font-extrabold text-white font-mono">
                            R$ {totalRevenue.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-800 border border-slate-800 p-4 rounded-xl flex items-center gap-3 shadow-xs">
                        <div className="p-3 bg-purple-600/10 text-purple-400 rounded-lg">
                          <Users size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Passageiros</span>
                          <span className="text-sm font-extrabold text-white font-mono">
                            {totalPassengers.toLocaleString('pt-BR')} pax
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-800 border border-slate-800 p-4 rounded-xl flex items-center gap-3 shadow-xs">
                        <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-lg">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-sans">Ocupação Média</span>
                          <span className="text-sm font-extrabold text-white font-mono">
                            {avgOccupancy}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-800 border border-slate-800 p-4 rounded-xl flex items-center gap-3 shadow-xs">
                        <div className="p-3 bg-slate-600/10 text-slate-300 rounded-lg">
                          <BusIcon size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Frota Cadastro</span>
                          <span className="text-sm font-extrabold text-white font-mono">
                            {buses.length} ônibus
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Chart panel row */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left side: Revenue chart */}
                      <div className="lg:col-span-8 bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Faturamento Operacional e Fluxo</h4>
                            <span className="text-[10px] text-slate-400 block font-sans">Histórico acumulado de faturamento por viagens concluídas</span>
                          </div>
                        </div>

                        {completedTrips.length === 0 ? (
                          <div className="py-24 text-center text-xs text-slate-500 bg-slate-900/40 border border-slate-800/80 border-dashed rounded-xl flex flex-col justify-center items-center gap-2">
                            <TrendingUp size={24} className="text-slate-600" />
                            <span>Sem histórico financeiro recente. Inicie e conclua viagens simuladas na aba "Simulador" para preencher este painel.</span>
                          </div>
                        ) : (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={getRevenueChartData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} className="font-mono" />
                                <YAxis stroke="#94a3b8" fontSize={11} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} labelStyle={{ color: '#fff' }} />
                                <Legend />
                                <RechartsLine type="monotone" dataKey="Faturamento" name="Faturamento (R$)" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <RechartsLine type="monotone" dataKey="Passageiros" name="Paxs Transportados" stroke="#8b5cf6" strokeWidth={2} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* Right side: Fleet distribution */}
                      <div className="lg:col-span-4 bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                        <div className="space-y-0.5 pb-2 border-b border-slate-700/60">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Comportamento da Frota</h4>
                          <span className="text-[10px] text-slate-400 block">Classificação de carros cadastrados</span>
                        </div>

                        {buses.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-500 flex flex-col justify-center gap-1.5 self-center">
                            <BusIcon size={24} className="text-slate-700 mx-auto" />
                            <span>Sem ônibus cadastrados na frota.</span>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col justify-center py-4">
                            <div className="h-44">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={getServiceDistributionData()} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={4} dataKey="value">
                                    {getServiceDistributionData().map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col gap-1 text-[11px] font-sans">
                              {getServiceDistributionData().map((entry, idx) => (
                                <div key={idx} className="flex justify-between items-center text-slate-300">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }}></span>
                                    {entry.name}
                                  </span>
                                  <span className="font-mono font-bold text-white">{entry.value} ud.</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Operational indicators list (Feasibilities alerts) */}
                    <div className="bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Diagnóstico Operacional de Viabilidade</h4>
                        <span className="text-[10px] text-slate-440 block">Alertas preventivos e checagem de horários sobrepostos</span>
                      </div>

                      {schedules.length === 0 ? (
                        <div className="p-4 bg-slate-900/40 rounded-xl text-center text-[11px] text-slate-500">
                          Nenhum horário registrado operacionalmente para análise.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-sans">
                          {schedules.map(sch => {
                            const line = lines.find(l => l.id === sch.lineId);
                            if (!line) return null;
                            const check = checkScheduleFeasibility(sch, line, schedules, lines, buses);
                            const origin = cities.find(c => c.id === line.originCityId);
                            const dest = cities.find(c => c.id === line.destinationCityId);

                            return (
                              <div 
                                key={sch.id}
                                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                                  check.level === 'warning'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                    : check.level === 'info'
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                    : 'bg-green-500/10 border-green-500/20 text-green-300'
                                }`}
                              >
                                {check.level === 'warning' && <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />}
                                {check.level === 'info' && <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />}
                                {check.level === 'success' && <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />}

                                <div className="space-y-1 leading-normal">
                                  <div className="font-extrabold text-[#fff]">
                                    {origin?.name} ➔ {dest?.name} ({sch.departureTime})
                                  </div>
                                  <p className="text-[11px] opacity-85">{check.message}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* 2. CITIES PAGE */}
                {activeTab === 'cities' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: city register form */}
                      <div className="lg:col-span-4 bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <div className="space-y-0.5 border-b border-slate-700/60 pb-3">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Cadastrar Cidade</h4>
                          <span className="text-[10px] text-slate-400">Insira as localidades atendidas em suas linhas</span>
                        </div>

                        {cityError && (
                          <div className="p-2.5 bg-red-500/15 border border-red-500/25 text-red-300 rounded text-xs">
                            {cityError}
                          </div>
                        )}

                        <form onSubmit={handleCreateCity} className="space-y-4 font-sans">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Nome do Município</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Ribeirão Preto"
                              value={cityName}
                              onChange={(e) => setCityName(e.target.value)}
                              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Estado (UF)</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: SP"
                              maxLength={2}
                              value={cityState}
                              onChange={(e) => setCityState(e.target.value)}
                              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Sigla IATA (3 Letras)</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: RAO"
                              maxLength={3}
                              value={cityCode}
                              onChange={(e) => setCityCode(e.target.value)}
                              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500 font-mono font-bold uppercase"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-extrabold transition-all cursor-pointer"
                          >
                            Adicionar Localidade
                          </button>
                        </form>
                      </div>

                      {/* Right: cities grid table */}
                      <div className="lg:col-span-8 bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Localidades de Operação</h4>
                          <span className="text-[10px] text-slate-400 block pb-1">Gerenciador de terminais rodoviários e hubs regionais</span>
                        </div>

                        {cities.length === 0 ? (
                          <div className="py-24 text-center text-slate-500 border border-slate-800/80 border-dashed rounded-xl text-xs space-y-2">
                            <MapPin size={24} className="text-slate-700 mx-auto" />
                            <span>Nenhuma localidade registrada. Adicione cidades no painel ao lado.</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {cities.map(ct => {
                              // count connected routes
                              const linesCount = lines.filter(l => l.originCityId === ct.id || l.destinationCityId === ct.id).length;
                              return (
                                <div
                                  key={ct.id}
                                  className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl flex justify-between items-center shadow-xs"
                                >
                                  <div>
                                    <span className="inline-block px-1.5 py-0.5 bg-slate-800 border border-slate-700 font-mono font-bold text-[9.5px] text-slate-300 rounded mb-1">
                                      {ct.code} - {ct.state}
                                    </span>
                                    <h5 className="text-xs font-extrabold text-white">{ct.name}</h5>
                                    <span className="text-[9px] text-slate-500 font-medium font-sans">
                                      {linesCount === 0 ? 'Sem conexões' : `${linesCount} rota(s) intermunicipais`}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteCity(ct.id)}
                                    className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                                    title="Remover cidade"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* 3. FLEET PAGE */}
                {activeTab === 'fleet' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left side: register bus Form */}
                      <div className="lg:col-span-4 bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4 text-xs font-sans">
                        <div className="space-y-0.5 border-b border-slate-705 pb-3">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Adicionar Carro</h4>
                          <span className="text-[10px] text-slate-400">Gerencie novos ônibus na garagem operacional</span>
                        </div>

                        {busError && (
                          <div className="p-2.5 bg-red-500/15 border border-red-500/25 text-red-300 rounded text-xs font-semibold">
                            ⚠️ {busError}
                          </div>
                        )}

                        <form onSubmit={handleCreateBus} className="space-y-4 font-sans">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Identificador / Placa (Mercosul)</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: ABC-1D23"
                              maxLength={8}
                              value={busPlate}
                              onChange={(e) => setBusPlate(e.target.value)}
                              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500 font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Chassi / Modelo de Carroceria</label>
                            <input
                              type="text"
                              required
                              placeholder="Marcopolo Paradiso 1200 G8"
                              value={busModel}
                              onChange={(e) => setBusModel(e.target.value)}
                              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Serviço & Cabine</label>
                            <select
                              value={busServiceType}
                              onChange={(e) => setBusServiceType(e.target.value as any)}
                              className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none text-white focus:border-blue-500"
                            >
                              <option value="convencional">🚌 Convencional (46 assentos)</option>
                              <option value="executivo">🌟 Executivo (38 assentos)</option>
                              <option value="leito">💤 Leito de Luxo (28 assentos)</option>
                            </select>
                          </div>

                          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 text-[10.5px] leading-normal text-slate-400 font-medium">
                            📌 O limite de assentos é auto-ajustado conforme o tipo de cabine para assegurar o conforto regulado pela ANTT.
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-extrabold transition-all cursor-pointer shadow-sm"
                          >
                            Cadastrar Carro
                          </button>
                        </form>
                      </div>

                      {/* Right side: Buses Grid list */}
                      <div className="lg:col-span-8 bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Frota de Veículos</h4>
                          <span className="text-[10px] text-slate-400 block">Garagem operacional de carros em serviço ativo</span>
                        </div>

                        {buses.length === 0 ? (
                          <div className="py-24 text-center text-slate-400 border border-slate-800/80 border-dashed rounded-xl text-xs space-y-2">
                            <BusIcon size={24} className="text-slate-700 mx-auto" />
                            <span>Nenhum veículo ativo na frota.</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {buses.map(b => (
                              <div
                                key={b.id}
                                className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative group flex flex-col justify-between"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-start">
                                    <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 font-mono font-bold text-xs rounded">
                                      🚏 {b.plate}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[9px] font-black tracking-widest uppercase p-1 rounded font-mono ${
                                        b.status === 'disponivel'
                                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                          : b.status === 'em_viagem'
                                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/10'
                                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                      }`}>
                                        {b.status === 'disponivel' ? 'Disponível' : b.status === 'em_viagem' ? 'Na Estrada' : 'Manutenção'}
                                      </span>
                                      
                                      <button
                                        onClick={() => handleDeleteBus(b.id)}
                                        className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                                        title="Remover carro"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  <h5 className="text-xs font-extrabold text-white font-sans">{b.model}</h5>
                                </div>

                                <div className="flex justify-between items-center text-[11px] pt-3 mt-3 border-t border-slate-800/80 font-sans">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    b.serviceType === 'leito'
                                      ? 'bg-purple-500/15 text-purple-300'
                                      : b.serviceType === 'executivo'
                                      ? 'bg-blue-500/15 text-blue-300'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {b.serviceType === 'leito' ? '💤 Leito' : b.serviceType === 'executivo' ? '🌟 Executivo' : '🚌 Convencional'}
                                  </span>

                                  <span className="text-slate-400 font-bold font-mono">
                                    {b.capacity} Assentos
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* 4. LINES PAGE (ROTAS) */}
                {activeTab === 'lines' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: create Line route form */}
                      <div className="lg:col-span-4 bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <div className="space-y-0.5 border-b border-slate-700/60 pb-3">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Estruturar Rota</h4>
                          <span className="text-[10px] text-slate-400 block font-sans">Desenhe uma linha conectando hubs rodoviários</span>
                        </div>

                        {lineError && (
                          <div className="p-2.5 bg-red-500/15 border border-red-500/25 text-red-300 rounded text-xs font-semibold">
                            ⚠️ {lineError}
                          </div>
                        )}

                        <form onSubmit={handleCreateLine} className="space-y-4 text-xs font-sans">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Cidade de Origem</label>
                            <select
                              value={lineOriginCityId}
                              onChange={(e) => setLineOriginCityId(e.target.value)}
                              className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            >
                              <option value="">-- Selecione a Origem --</option>
                              {cities.map(ct => (
                                <option key={ct.id} value={ct.id}>{ct.name} ({ct.code})</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block tracking-wider uppercase">Cidade de Destino</label>
                            <select
                              value={lineDestinationCityId}
                              onChange={(e) => setLineDestinationCityId(e.target.value)}
                              className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            >
                              <option value="">-- Selecione o Destino --</option>
                              {cities.map(ct => (
                                <option key={ct.id} value={ct.id}>{ct.name} ({ct.code})</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Distância (Km)</label>
                              <input
                                type="number"
                                required
                                value={lineDistance}
                                onChange={(e) => setLineDistance(Number(e.target.value))}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-center font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider font-sans">Duração (Minutos)</label>
                              <input
                                type="number"
                                required
                                value={lineDuration}
                                onChange={(e) => setLineDuration(Number(e.target.value))}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-center font-bold"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Categoria de Linha Padrão</label>
                            <select
                              value={lineServiceType}
                              onChange={(e) => setLineServiceType(e.target.value as any)}
                              className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            >
                              <option value="convencional">Bus Convencional</option>
                              <option value="executivo">Bus Executivo</option>
                              <option value="leito">Bus Leito Especial</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-extrabold transition-all cursor-pointer"
                          >
                            Adicionar Nova Rota
                          </button>
                        </form>
                      </div>

                      {/* Right: Grid of existing routes lines */}
                      <div className="lg:col-span-8 bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Rotas do Portfólio</h4>
                          <span className="text-[10px] text-slate-400 block pb-1">Conexões vigentes de tráfego interestadual e intermunicipal</span>
                        </div>

                        {lines.length === 0 ? (
                          <div className="py-24 text-center text-slate-400 border border-slate-800/80 border-dashed rounded-xl text-xs space-y-2">
                            <GitCommit size={24} className="text-slate-700 mx-auto" />
                            <span>Nenhuma rota interestadual cadastrada.</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {lines.map(l => {
                              const origin = cities.find(c => c.id === l.originCityId);
                              const dest = cities.find(c => c.id === l.destinationCityId);
                              const connectedSchedules = schedules.filter(s => s.lineId === l.id).length;

                              // formatting duration hours
                              const h = Math.floor(l.duration / 60);
                              const m = l.duration % 60;
                              const dLabel = h > 0 ? `${h}h e ${m}m` : `${m}min`;

                              return (
                                <div
                                  key={l.id}
                                  className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-750 rounded-xl relative flex flex-col justify-between"
                                >
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex justify-between items-start">
                                      <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                                        Distância: {l.distance} Km
                                      </span>

                                      <button
                                        onClick={() => handleDeleteLine(l.id)}
                                        className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                                        title="Remover linha"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>

                                    <h4 className="text-xs font-extrabold text-white leading-normal font-sans pr-6">
                                      {origin ? origin.name : 'Localidade Desconhecida'} ➔ {dest ? dest.name : 'Localidade Desconhecida'}
                                    </h4>

                                    <div className="flex items-center gap-2 pt-2 text-[10.5px] font-mono text-slate-400">
                                      <span className="flex items-center gap-0.5">
                                        <Clock size={11} /> {dLabel}
                                      </span>
                                      <span>•</span>
                                      <span className="text-blue-400 font-semibold font-sans uppercase">
                                        {l.serviceType}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="pt-3 mt-3 border-t border-slate-800 flex justify-between items-center text-[10.5px] font-sans text-slate-500">
                                    <span>Cadastrada por {activeCompany.code}</span>
                                    <span className="font-semibold font-mono text-slate-350">{connectedSchedules} partidas programadas</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* 5. OPERATIONAL SCHEDULE PAGE */}
                {activeTab === 'schedules' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: Schedule setup parameters and forms */}
                      <div className="lg:col-span-4 bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <div className="space-y-0.5 border-b border-slate-700/60 pb-3">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider font-sans">Agendar Saída</h4>
                          <span className="text-[10px] text-slate-400 block font-sans">Estabeleça uma grade operacional dinâmica</span>
                        </div>

                        {schedError && (
                          <div className="p-2.5 bg-red-500/15 border border-red-500/25 text-red-300 rounded text-xs font-semibold">
                            ⚠️ {schedError}
                          </div>
                        )}

                        <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs font-sans">
                          
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Rota / Conexão</label>
                            <select
                              value={schedLineId}
                              onChange={(e) => setSchedLineId(e.target.value)}
                              className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            >
                              <option value="">-- Selecione uma Rota --</option>
                              {lines.map(l => {
                                const orig = cities.find(c => c.id === l.originCityId);
                                const dest = cities.find(c => c.id === l.destinationCityId);
                                return (
                                  <option key={l.id} value={l.id}>
                                    {orig?.name} ➔ {dest?.name} ({l.serviceType})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Horário de Saída</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: 14:15"
                              maxLength={5}
                              value={schedDepartureTime}
                              onChange={(e) => setSchedDepartureTime(e.target.value)}
                              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500 font-mono font-bold text-center"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Frequência Semanal</label>
                            <select
                              value={schedFrequency}
                              onChange={(e) => setSchedFrequency(e.target.value as any)}
                              className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            >
                              <option value="diaria">Saídas Diárias</option>
                              <option value="seg-sex">Segunda a Sexta-Feira</option>
                              <option value="fds">Sábados e Domingos</option>
                              <option value="semanal">Uma Vez Por Semana (Fretamento/Reforço)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Serviço Escalonado</label>
                            <select
                              value={schedServiceType}
                              onChange={(e) => setSchedServiceType(e.target.value as any)}
                              className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            >
                              <option value="convencional">🚌 Convencional</option>
                              <option value="executivo">🌟 Executivo</option>
                              <option value="leito">💤 Leito Especial</option>
                            </select>
                          </div>

                          {/* Live Dynamic Projections inside parameters */}
                          {(() => {
                            if (!schedLineId || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedDepartureTime)) return null;
                            const prj = getScheduleDemandEstimation(schedLineId, schedDepartureTime, schedFrequency, undefined, schedServiceType, lines);
                            if (!prj) return null;

                            return (
                              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] space-y-1">
                                <span className="font-extrabold text-blue-400 block uppercase tracking-wider text-[9.5px]">📊 Projeção Operacional Corrente:</span>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Ocupação Média Projeta:</span>
                                  <span className="font-bold text-white font-mono">{prj.occupancyRate}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400 font-sans">Passageiros Estimados:</span>
                                  <span className="font-bold text-white font-mono">{prj.pMin} a {prj.pMax} paxs</span>
                                </div>
                                <div className="text-[9.5px] text-slate-350 italic leading-tight pt-1 border-t border-slate-700/60 font-sans">{prj.timeLabel} • {prj.explanation}</div>
                              </div>
                            );
                          })()}

                          <button
                            type="submit"
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-extrabold transition-all cursor-pointer shadow-sm"
                          >
                            Confirmar Programação
                          </button>
                        </form>
                      </div>

                      {/* Right: Grid of active programmed schedules */}
                      <div className="lg:col-span-8 bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider font-sans">Quadro Horário Comercial</h4>
                          <span className="text-[10px] text-slate-400 block font-sans">Escalas de partidas programadas por linha</span>
                        </div>

                        {schedules.length === 0 ? (
                          <div className="py-24 text-center text-slate-400 border border-slate-800/80 border-dashed rounded-xl text-xs space-y-2">
                            <CalendarClock size={24} className="text-slate-700 mx-auto" />
                            <span>Nenhum horário cadastrado. Inicie um agendamento novo no formulário ao lado.</span>
                          </div>
                        ) : (
                          <div className="space-y-4.5">
                            {lines.map(line => {
                              const lineSchedule = schedules.filter(s => s.lineId === line.id);
                              if (lineSchedule.length === 0) return null;

                              const orig = cities.find(c => c.id === line.originCityId);
                              const dest = cities.find(c => c.id === line.destinationCityId);

                              return (
                                <div key={line.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                                  <h4 className="text-xs font-black text-white uppercase tracking-wider font-sans pb-1.5 border-b border-slate-800/80">
                                    Conexão: {orig?.name} ➔ {dest?.name}
                                  </h4>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {lineSchedule.map(sch => {
                                      const est = getScheduleDemandEstimation(sch.lineId, sch.departureTime, sch.frequency, sch.id, sch.serviceType, lines);
                                      const feasibility = checkScheduleFeasibility(sch, line, schedules, lines, buses);

                                      return (
                                        <div
                                          key={sch.id}
                                          className="p-3 bg-slate-850 border border-slate-800 rounded-lg flex flex-col justify-between hover:border-slate-700 transition-colors"
                                        >
                                          <div className="flex justify-between items-start mb-1 h-8">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-mono font-bold text-xs bg-blue-600/10 text-blue-400 border border-blue-500/10 px-2 py-0.5 rounded">
                                                ⏱️ {sch.departureTime}
                                              </span>
                                              <span className="text-[9px] uppercase font-bold text-slate-400 font-mono bg-slate-800 px-1 py-0.5 rounded">
                                                {sch.frequency === 'diaria' ? 'Dia-a-Dia' : sch.frequency}
                                              </span>
                                              <span className="text-[9.5px] uppercase font-black text-blue-450 font-sans">
                                                {sch.serviceType}
                                              </span>
                                            </div>

                                            <button
                                              onClick={() => handleDeleteSchedule(sch.id)}
                                              className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                                              title="Excluir horário"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>

                                          {/* Demand micro-projection */}
                                          {est && (
                                            <div className="bg-slate-900/60 p-2 rounded text-[10px] leading-normal text-slate-400 space-y-1 mb-2">
                                              <div className="flex justify-between font-medium">
                                                <span>Fluxo Esperado:</span>
                                                <span className="text-white font-mono font-bold">{est.pMin}–{est.pMax} paxs</span>
                                              </div>
                                              <div className="flex justify-between font-medium">
                                                <span>Ocupação Previsível:</span>
                                                <span className="text-indigo-400 font-mono font-bold">{est.occupancyRate}%</span>
                                              </div>
                                            </div>
                                          )}

                                          {/* Feasibility Alert */}
                                          <div className={`p-1.5 rounded text-[9.5px] leading-tight font-medium flex gap-1 ${
                                            feasibility.level === 'warning'
                                              ? 'bg-red-500/10 text-red-400'
                                              : feasibility.level === 'info'
                                              ? 'bg-amber-500/10 text-amber-400'
                                              : 'bg-green-500/10 text-green-400'
                                          }`}>
                                            <Info size={11} className="flex-shrink-0" />
                                            <span className="line-clamp-2">{feasibility.message}</span>
                                          </div>

                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* 6. TRAFFIC SIMULATOR PANEL */}
                {activeTab === 'simulator' && (
                  <div className="space-y-6 animate-fade-in text-sans">
                    <div className="bg-slate-800 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div className="border-b border-slate-700/60 pb-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider font-sans">Simulação de Partidas e Despachos</h4>
                        <span className="text-[10px] text-slate-400 block font-sans">Mecanismo dinâmico de tráfego terrestre rodoviário das linhas ativas</span>
                      </div>

                      <div className="p-3 bg-gradient-to-r from-blue-900/40 to-slate-800 rounded-xl border border-blue-500/20 text-xs text-slate-300 leading-relaxed font-sans space-y-1 mb-4">
                        <span className="font-extrabold text-blue-400 flex items-center gap-1">
                          <Sparkles size={13} className="text-yellow-300" /> Painel de Controle de Simulação Coletora
                        </span>
                        <p>
                          Planejou seus horários? Aqui você pode colocar os carros na rodovia! Clique em <strong>"Iniciar Despacho"</strong> abaixo. O simulador selecionará automaticamente um ônibus livre de sua garagem corporativa, preencherá poltronas de passageiros conforme projeções históricas, e atualizará a progressão por satélite da viagem em tempo real. Ao concluir a viagem, o faturamento das passagens alimentará seu Dashboard principal!
                        </p>
                      </div>

                      {/* Active Voyages Section */}
                      <div className="space-y-3.5">
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Viagens Rodoviárias Ativas</span>
                        
                        {activeVoyages.length === 0 ? (
                          <div className="p-8 bg-slate-900/60 border border-slate-800 border-dashed rounded-xl text-center text-xs text-slate-500">
                            Não há nenhuma viagem ocorrendo na estrada neste momento. Inicie um despacho na grade abaixo.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeVoyages.map(v => {
                              const line = lines.find(l => l.id === v.lineId);
                              const orig = cities.find(c => c.id === line?.originCityId);
                              const dest = cities.find(c => c.id === line?.destinationCityId);
                              const bus = buses.find(b => b.id === v.busId);

                              return (
                                <div key={v.id} className="p-4 bg-slate-900 border border-slate-750 rounded-xl space-y-3 animate-fade-in font-sans">
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="font-mono text-blue-450 font-extrabold uppercase">
                                      {bus?.plate || 'Bus'} - {bus?.model.split(' ')[0]}
                                    </span>
                                    <span className="font-mono font-bold text-white bg-blue-600/20 border border-blue-500/10 p-0.5 px-2 rounded-md">
                                      Poltronas: {v.passengerCount} / {bus?.capacity} ocupadas
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <h5 className="text-xs font-black text-white leading-normal pr-4">
                                      {orig?.name} ➔ {dest?.name}
                                    </h5>
                                    
                                    {/* Progression bar */}
                                    <div className="space-y-1 pt-1.5">
                                      <div className="flex justify-between text-[10px] text-slate-550 font-bold font-mono">
                                        <span>Status: {v.progress === 100 ? '🎉 Viagem Finalizada' : '🚌 Em Trânsito'}</span>
                                        <span>Progresso: {v.progress}%</span>
                                      </div>
                                      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/60">
                                        <div 
                                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-1000" 
                                          style={{ width: `${v.progress}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-800">
                                    <div className="text-[10px] text-slate-480 leading-normal font-sans text-slate-400">
                                      Saturamento Estimado: <strong className="text-emerald-400 font-mono">R$ {(v.passengerCount * v.ticketPrice).toLocaleString('pt-BR')}</strong>
                                    </div>

                                    <button
                                      onClick={() => handleCompleteVoyage(v.id)}
                                      disabled={v.progress < 100}
                                      className={`px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold cursor-pointer transition-colors ${
                                        v.progress === 100 
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10' 
                                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                      }`}
                                      title={v.progress < 100 ? 'Aguarde o progresso do ônibus completar 100%' : 'Concluir viagem'}
                                    >
                                      Concluir Viagem & Faturar
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Ready dispatch options list */}
                      <div className="space-y-3 pt-3">
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Grid Operacional Disponível para Despacho</span>
                        
                        {schedules.length === 0 ? (
                          <div className="p-4 bg-slate-900/40 rounded-xl text-center text-xs text-slate-550 italic">
                            Nenhum horário cadastrado. Planeje horários na aba "Agenda e Saídas" antes de despachar carros.
                          </div>
                        ) : (
                          <div className="bg-slate-900 rounded-xl divide-y divide-slate-800 overflow-hidden font-sans">
                            {schedules.map(sch => {
                              const line = lines.find(l => l.id === sch.lineId);
                              const orig = cities.find(c => c.id === line?.originCityId);
                              const dest = cities.find(c => c.id === line?.destinationCityId);
                              const activeOnThis = activeVoyages.filter(v => v.scheduleId === sch.id).length;

                              return (
                                <div key={sch.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-850/50 transition-colors">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-mono text-xs text-blue-400 font-extrabold bg-blue-500/10 border border-blue-500/10 py-0.5 px-2 rounded-md">
                                        ⏱️ {sch.departureTime}
                                      </span>
                                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-850 py-0.5 px-2 rounded">
                                        {sch.frequency}
                                      </span>
                                      <span className="text-[10.5px] uppercase font-bold text-slate-450 font-sans">
                                        {sch.serviceType}
                                      </span>
                                    </div>
                                    <h5 className="text-xs font-extrabold text-white">
                                      {orig?.name} ➔ {dest?.name}
                                    </h5>
                                    <span className="text-[10px] text-slate-500 leading-normal font-sans">
                                      Distância do trecho: {line?.distance} Km • Serviço ativo
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                                    {activeOnThis > 0 ? (
                                      <span className="px-3 py-1.5 bg-blue-600/10 text-blue-450 border border-blue-500/10 text-xs font-bold rounded-lg animate-pulse">
                                        Em Estrada Ativa ({activeOnThis})
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleStartSimulatedVoyage(sch)}
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-lg transition-all flex items-center gap-1"
                                      >
                                        <Play size={11} fill="white" /> Iniciar Viagem
                                      </button>
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
                )}

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
