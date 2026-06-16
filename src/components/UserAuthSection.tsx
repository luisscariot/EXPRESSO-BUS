import React, { useState, useEffect } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { LogIn, LogOut, Database, Users, CheckCircle, RefreshCw, X, Shield, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DbUser {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export default function UserAuthSection() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncedUser, setSyncedUser] = useState<DbUser | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<DbUser[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Monitor Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setSyncing(true);
        setErrorMessage(null);
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: currentUser.displayName,
              photoUrl: currentUser.photoURL
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Falha ao salvar no banco relacional.');
          }

          const data = await res.json();
          setSyncedUser(data.user);
          // Auto load database users list
          loadRegisteredUsers();
        } catch (err: any) {
          console.error('Error syncing auth state with PostgreSQL:', err);
          setErrorMessage(err.message || 'Erro ao sincronizar informações.');
        } finally {
          setSyncing(false);
        }
      } else {
        setSyncedUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadRegisteredUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setRegisteredUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load registered users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Login action failed:', err);
      setErrorMessage(err.message || 'Interrupção ou falha na autenticação via popup.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setSyncedUser(null);
    } catch (err) {
      console.error('Failed logging out:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUsersModal = () => {
    if (!showUsersModal) {
      loadRegisteredUsers();
    }
    setShowUsersModal(!showUsersModal);
  };

  if (loading && !user) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-xl text-slate-500 text-xs font-medium">
        <RefreshCw size={14} className="animate-spin text-slate-400" />
        <span>Conectando...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2 border bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 rounded-xl p-1.5 pr-3 transition-all select-none">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg shrink-0 object-cover ring-2 ring-emerald-500/40"
              />
            )}
            <div className="text-left max-w-[130px] hidden sm:block">
              <span className="block text-[11px] font-black leading-tight text-emerald-800 uppercase tracking-wide truncate">
                {user.displayName || 'Colaborador'}
              </span>
              <span className="text-[9.5px] text-emerald-600 block font-mono truncate leading-none mt-0.5">
                {user.email}
              </span>
            </div>

            <div className="flex items-center gap-1.5 ml-2 border-l border-emerald-500/15 pl-2 shrink-0">
              {/* Database indicator */}
              <button
                type="button"
                onClick={toggleUsersModal}
                className="p-1 hover:bg-emerald-500/10 text-emerald-700 hover:text-emerald-800 rounded-lg transition-colors cursor-pointer"
                title="Ver contas sincronizadas no PostgreSQL"
              >
                {syncing ? (
                  <RefreshCw size={14} className="animate-spin text-amber-500" />
                ) : syncedUser ? (
                  <Database size={14} className="text-emerald-600" />
                ) : (
                  <Database size={14} className="text-slate-400" />
                )}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1 hover:bg-rose-500/10 text-rose-600 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                title="Desconectar do CCO"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {errorMessage && (
              <div
                className="hidden md:block text-[10px] text-rose-600 font-bold max-w-xs truncate bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg"
                title={errorMessage}
              >
                {errorMessage}
              </div>
            )}
            <button
              onClick={handleLogin}
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shrink-0"
              title="Acesse com sua conta para salvar seu perfil no banco relacional"
            >
              <LogIn size={14} />
              <span>Entrar com Google</span>
            </button>
          </div>
        )}
      </div>

      {/* Database Registered Users Drawer/Modal */}
      <AnimatePresence>
        {showUsersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={toggleUsersModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-md w-full flex flex-col max-h-[75vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Database size={15} />
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      PostgreSQL • Contas Salvas
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Banco de dados relacional Supabasic (Cloud SQL)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleUsersModal}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 flex items-start gap-2.5 text-[11px] text-slate-600 leading-relaxed">
                  <Shield size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-700">Autenticação & Registro On-The-Fly</p>
                    <p className="mt-0.5 text-slate-500 font-medium">
                      Cada novo colaborador que realiza o login com o Google tem seus dados validados pelo Firebase Auth e imediatamente persistidos no banco relacional via UPSERT transacional.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Lista de Contas ({registeredUsers.length})</span>
                    {loadingUsers && <RefreshCw size={10} className="animate-spin text-slate-400" />}
                  </div>

                  {registeredUsers.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                      <Users size={24} className="mx-auto text-slate-350 mb-2" />
                      <p className="text-slate-500 text-xs font-bold">Nenhum usuário registrado</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                      {registeredUsers.map((u) => {
                        const isLogged = u.uid === user?.uid;
                        return (
                          <div
                            key={u.id}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs transition-colors ${
                              isLogged
                                ? 'bg-blue-50/60 border-blue-200/80 ring-1 ring-blue-500/10'
                                : 'bg-slate-50/40 border-slate-200/80'
                            }`}
                          >
                            {u.photoUrl ? (
                              <img
                                src={u.photoUrl}
                                alt={u.name || 'User'}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg shrink-0 object-cover bg-slate-100"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg shrink-0 bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                {(u.name || u.email).slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-700 truncate block">
                                  {u.name || 'Sem Nome'}
                                </span>
                                {isLogged && (
                                  <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                    Você
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono block truncate mt-0.5">
                                {u.email}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[9px] text-slate-400 font-mono">
                                ID #{u.id}
                              </span>
                              <span className="block text-[8px] text-slate-400">
                                {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-2xl">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase font-mono">
                  <CheckCircle size={12} className="text-emerald-500" />
                  <span>Postgres Ativo</span>
                </div>
                <button
                  onClick={toggleUsersModal}
                  type="button"
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs font-sans"
                >
                  Fechar Painel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
