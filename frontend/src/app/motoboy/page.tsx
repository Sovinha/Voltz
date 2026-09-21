'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Navigation, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  Phone, 
  AlertCircle, 
  RefreshCw, 
  KeyRound, 
  Wifi, 
  WifiOff, 
  LogOut, 
  ChevronRight, 
  DollarSign, 
  UserCheck, 
  Smartphone, 
  Lock, 
  Radio, 
  Check,
  Send,
  Zap
} from 'lucide-react';
import { Pedido } from '@/lib/supabase';

interface DriverSession {
  id: string;
  nome: string;
  telefone: string;
  placa_veiculo?: string;
  status?: string;
  total_entregas?: number;
  frete_acumulado?: number;
}

export default function MotoboyAppPage() {
  const [driver, setDriver] = useState<DriverSession | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [registeredDrivers, setRegisteredDrivers] = useState<DriverSession[]>([]);
  const [loginTab, setLoginTab] = useState<'phone' | 'select'>('phone');

  // Status & GPS State
  const [isOnline, setIsOnline] = useState(true);
  const [gpsActive, setGpsActive] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsMsg, setGpsMsg] = useState('Inicializando GPS...');
  const [simulatedOffset, setSimulatedOffset] = useState(0);

  // Orders State
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  // PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinDigitado, setPinDigitado] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  // OSRM Turn-by-Turn Navigation State
  const [osrmSteps, setOsrmSteps] = useState<any[]>([]);
  const [osrmMetrics, setOsrmMetrics] = useState<{ min: number; km: number } | null>(null);
  const [showNavigationDrawer, setShowNavigationDrawer] = useState(false);

  // RESOLUÇÃO DINÂMICA DA URL DO BACKEND (Garante funcionamento no Celular em VPS/IP Público)
  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return `${window.location.protocol}//${host}:5000`;
      }
    }
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  };

  const backendUrl = getBackendUrl();

  // 1. Carrega motorista da sessão local ou lista cadastrados
  useEffect(() => {
    const saved = localStorage.getItem('motoboy_session');
    if (saved) {
      try {
        setDriver(JSON.parse(saved));
      } catch {}
    }
    fetchRegisteredDrivers();
  }, []);

  const fetchRegisteredDrivers = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/entregadores`);
      if (res.ok) {
        const data = await res.json();
        setRegisteredDrivers(data);
      }
    } catch (e) {
      console.warn('Falha ao buscar entregadores cadastrados:', e);
    }
  };

  // Login por Telefone / Senha
  const handleLoginByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput) {
      setLoginError('Digite o número de telefone cadastrado.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch(`${backendUrl}/api/entregadores/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: phoneInput })
      });

      const data = await res.json();

      if (res.ok && data.entregador) {
        setDriver(data.entregador);
        setIsOnline(true);
        localStorage.setItem('motoboy_session', JSON.stringify(data.entregador));
      } else {
        setLoginError(data.error || 'Entregador não localizado. Tente selecionar abaixo.');
      }
    } catch (err) {
      setLoginError('Erro ao comunicar com o servidor da loja.');
    }
    setIsLoggingIn(false);
  };

  // Seleção Direta de Entregador
  const handleSelectDriver = (d: DriverSession) => {
    setDriver(d);
    setIsOnline(true);
    localStorage.setItem('motoboy_session', JSON.stringify(d));
  };

  // Logout / Sair
  const handleLogout = async () => {
    if (driver) {
      try {
        await fetch(`${backendUrl}/api/motoboy/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entregador_id: driver.id,
            status: 'offline'
          })
        });
      } catch {}
    }
    localStorage.removeItem('motoboy_session');
    setDriver(null);
    setIsOnline(false);
  };

  // Função central de envio de GPS ao Backend
  const sendCurrentLocation = useCallback(async (lat: number, lng: number) => {
    if (!driver) return;
    setLastCoords({ lat, lng });
    setGpsActive(true);
    setGpsMsg(`GPS Transmitido (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

    try {
      await fetch(`${backendUrl}/api/motoboy/localizacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entregador_id: driver.id,
          entregador_nome: driver.nome,
          latitude: lat,
          longitude: lng,
          pedido_id: selectedPedido?.id
        }),
      });
    } catch (err) {
      console.warn('Falha no envio de GPS:', err);
    }
  }, [driver, selectedPedido, backendUrl]);

  // Transmissão Contínua de GPS com suporte a HTTP no Celular
  useEffect(() => {
    if (!driver || !isOnline) {
      setGpsActive(false);
      setGpsMsg('Status: Offline / Pausa');
      return;
    }

    // Tenta GPS nativo do dispositivo
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          sendCurrentLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          setGpsActive(true);
          setGpsMsg('GPS HTTP / Transmissão Ativa');
          // No Celular via HTTP, navegador bloqueia GPS Nativo. Envia coordenadas de rota/loja
          const baseLat = selectedPedido?.latitude || -7.1155;
          const baseLng = selectedPedido?.longitude || -34.8601;
          sendCurrentLocation(baseLat, baseLng);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    } else {
      setGpsMsg('GPS HTTP / Transmissão Ativa');
      sendCurrentLocation(-7.1155, -34.8601);
    }

    // Loop de garantia a cada 5 segundos
    const interval = setInterval(() => {
      if (lastCoords) {
        sendCurrentLocation(lastCoords.lat, lastCoords.lng);
      } else {
        const baseLat = selectedPedido?.latitude || -7.1155;
        const baseLng = selectedPedido?.longitude || -34.8601;
        sendCurrentLocation(baseLat, baseLng);
      }
    }, 5000);

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(interval);
    };
  }, [driver, isOnline, selectedPedido, lastCoords, sendCurrentLocation]);

  // Transmite simulação de movimento (Passo a passo)
  const handleSimularMovimentoGPS = () => {
    const baseLat = selectedPedido?.latitude || -7.1145;
    const baseLng = selectedPedido?.longitude || -34.8285;
    const step = (simulatedOffset + 1) % 5;
    setSimulatedOffset(step);

    const latDelta = (step - 2) * 0.0015;
    const lngDelta = (step - 2) * 0.0015;

    sendCurrentLocation(baseLat + latDelta, baseLng + lngDelta);
  };

  // Busca de Pedidos Alocados
  const fetchPedidos = async () => {
    if (!driver) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/pedidos`);
      if (res.ok) {
        const data: Pedido[] = await res.json();
        const meusPedidos = data.filter(
          (p) =>
            ['em_rota', 'despachado', 'alocado', 'pronto', 'preparo'].includes(p.status) &&
            (!p.entregador_nome || p.entregador_nome.toLowerCase().includes(driver.nome.split(' ')[0].toLowerCase()))
        );
        setPedidos(meusPedidos);
        if (meusPedidos.length > 0 && !selectedPedido) {
          setSelectedPedido(meusPedidos[0]);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar pedidos:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 5000);
    return () => clearInterval(interval);
  }, [driver]);

  // Iniciar Rota
  const handleStartRoute = async (pedido: Pedido) => {
    try {
      await fetch(`${backendUrl}/api/pedidos/${pedido.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'em_rota',
          entregador_nome: driver?.nome
        })
      });
      fetchPedidos();
    } catch (e) {
      alert('Erro ao iniciar rota: ' + e);
    }
  };

  // Validar PIN
  const handleConfirmPin = async () => {
    if (!selectedPedido) return;
    if (pinDigitado.length !== 4) {
      setPinError('Digite os 4 dígitos do PIN informado pelo cliente!');
      return;
    }

    setIsSubmittingPin(true);
    setPinError('');

    try {
      const res = await fetch(`${backendUrl}/api/pedidos/${selectedPedido.id}/confirmar-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinDigitado }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('🎉 PIN Validado com Sucesso! Entrega Finalizada.');
        setIsPinModalOpen(false);
        setPinDigitado('');
        setSelectedPedido(null);
        fetchPedidos();
      } else {
        setPinError(data.error || data.message || 'PIN Incorreto! Solicite ao cliente.');
      }
    } catch (err) {
      setPinError('Erro de comunicação com o servidor da loja.');
    }
    setIsSubmittingPin(false);
  };

  // Finalizar Entrega Direta
  const handleFinalizarEntrega = async (pedido: Pedido) => {
    if (!confirm(`Finalizar entrega do pedido #${pedido.id_externo}?`)) return;
    try {
      await fetch(`${backendUrl}/api/pedidos/${pedido.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finalizado' })
      });
      setSelectedPedido(null);
      fetchPedidos();
    } catch (e) {
      alert('Erro ao finalizar entrega: ' + e);
    }
  };

  // Alternar Online / Pausa
  const toggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (driver) {
      try {
        await fetch(`${getBackendUrl()}/api/motoboy/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entregador_id: driver.id,
            status: nextState ? 'disponivel' : 'pausa'
          })
        });
      } catch {}
    }
  };

  // Busca Rota OSRM para o Pedido Selecionado pelo Motoboy
  useEffect(() => {
    if (!selectedPedido) {
      setOsrmSteps([]);
      setOsrmMetrics(null);
      return;
    }

    const originLat = lastCoords?.lat || -7.1155;
    const originLng = lastCoords?.lng || -34.8601;
    const targetLat = selectedPedido.latitude || -7.1005;
    const targetLng = selectedPedido.longitude || -34.8450;

    const fetchOsrmRoute = async () => {
      try {
        const waypoints = `${originLng},${originLat};${targetLng},${targetLat}`;
        const url = `${getBackendUrl()}/api/route?waypoints=${waypoints}&steps=true`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const km = parseFloat((route.distance / 1000).toFixed(1));
            const min = Math.round(route.duration / 60) || 1;
            setOsrmMetrics({ min, km });

            if (route.legs && route.legs.length > 0) {
              const steps: any[] = [];
              route.legs.forEach((leg: any) => {
                if (leg.steps) {
                  leg.steps.forEach((s: any) => {
                    if (s.maneuver && s.maneuver.type !== 'depart') {
                      steps.push({
                        name: s.name || '',
                        distance: s.distance || 0,
                        duration: s.duration || 0,
                        maneuver: s.maneuver
                      });
                    }
                  });
                }
              });
              setOsrmSteps(steps);
            }
          }
        }
      } catch (err) {
        console.warn('Falha ao buscar navegação OSRM no PWA:', err);
      }
    };

    fetchOsrmRoute();
  }, [selectedPedido, lastCoords]);

  const formatOsrmStepText = (step: any) => {
    const street = step.name ? `em ${step.name}` : '';
    const dist = step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance)} m`;
    const type = step.maneuver?.type;
    const mod = step.maneuver?.modifier;

    if (type === 'arrive') return `🏁 Chegou ao endereço do cliente!`;
    if (type === 'turn') {
      if (mod === 'right' || mod === 'sharp right') return `➡️ Vire à direita ${street} (${dist})`;
      if (mod === 'left' || mod === 'sharp left') return `⬅️ Vire à esquerda ${street} (${dist})`;
      return `↪️ Vire ${street} (${dist})`;
    }
    if (type === 'roundabout') return `🔄 Na rotatória, pegue a saída ${street} (${dist})`;
    return `⬆️ Siga ${street} por ${dist}`;
  };

  // TELA DE LOGIN DO ENTREGADOR (Mobile First)
  if (!driver) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          
          {/* LOGO E ÍCONE */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
              <Truck className="w-9 h-9" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Portal do Entregador</h1>
            <p className="text-xs text-slate-400">Identifique-se para iniciar a sincronização GPS</p>
          </div>

          {/* ABAS DE LOGIN */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setLoginTab('phone')}
              className={`flex-1 py-2 font-bold rounded-lg transition ${
                loginTab === 'phone' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              📱 Por Telefone
            </button>
            <button
              onClick={() => setLoginTab('select')}
              className={`flex-1 py-2 font-bold rounded-lg transition ${
                loginTab === 'select' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              👥 Seleção Rápida
            </button>
          </div>

          {/* OPCÃO 1: FORMULÁRIO DE LOGIN POR TELEFONE */}
          {loginTab === 'phone' && (
            <form onSubmit={handleLoginByPhone} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Telefone Celular Cadastrado</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 83999112233"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Senha / PIN de Acesso (Opcional)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Entrar no Portal</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* OPÇÃO 2: SELEÇÃO RÁPIDA DE ENTREGADORES */}
          {loginTab === 'select' && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {registeredDrivers.length === 0 ? (
                <div className="space-y-2">
                  {[
                    { id: 'd1', nome: 'ANDERSON (Moto 01)', telefone: '83999112233', placa_veiculo: 'MOP-1001' },
                    { id: 'd2', nome: 'ROBERTO (Moto 04)', telefone: '83999223344', placa_veiculo: 'MOP-2004' },
                    { id: 'd3', nome: 'CARLOS (Moto 07)', telefone: '83999334455', placa_veiculo: 'MOP-3007' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleSelectDriver(d)}
                      className="w-full p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left flex items-center justify-between transition group"
                    >
                      <div>
                        <div className="font-extrabold text-xs text-slate-200 group-hover:text-amber-400">{d.nome}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Placa: {d.placa_veiculo}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400" />
                    </button>
                  ))}
                </div>
              ) : (
                registeredDrivers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDriver(d)}
                    className="w-full p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left flex items-center justify-between transition group"
                  >
                    <div>
                      <div className="font-extrabold text-xs text-slate-200 group-hover:text-amber-400">{d.nome}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Tel: {d.telefone}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400" />
                  </button>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    );
  }

  // TELA PRINCIPAL DO MOTOBOY LOGADO (MOBILE FIRST)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10">
      
      {/* HEADER PRINCIPAL PWA */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-4 shadow-xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
              🛵
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                {driver.nome}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className={`w-2 h-2 rounded-full ${gpsActive && isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <span className={gpsActive && isOnline ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{isOnline ? gpsMsg : 'Status: Offline'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* BOTÃO TOGGLE ONLINE/PAUSA */}
            <button
              onClick={toggleOnline}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow-md ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isOnline ? 'ONLINE' : 'PAUSA'}</span>
            </button>

            {/* BOTÃO SAIR */}
            <button
              onClick={handleLogout}
              title="Sair do App"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (MOBILE FIRST) */}
      <main className="max-w-md mx-auto p-4 space-y-4">

        {/* CONTROLE DE TRANSMISSÃO E SIMULAÇÃO DE GPS */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => sendCurrentLocation(pos.coords.latitude, pos.coords.longitude),
                  () => sendCurrentLocation(-7.1155, -34.8601)
                );
              } else {
                sendCurrentLocation(-7.1155, -34.8601);
              }
            }}
            className="py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md active:scale-98"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>📡 Transmitir GPS</span>
          </button>

          <button
            onClick={handleSimularMovimentoGPS}
            className="py-2.5 px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md active:scale-98"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>⚡ Testar Movimento</span>
          </button>
        </div>

        {/* CARD DE GANHOS DO DIA */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Ganhos Acumulados Hoje</span>
            <div className="text-xl font-black text-emerald-400 flex items-center gap-1">
              <span>R$ {(pedidos.filter(p => p.status === 'finalizado').length * 8.5).toFixed(2)}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Entregas Realizadas</span>
            <div className="text-lg font-black text-amber-400">
              {pedidos.filter(p => p.status === 'finalizado').length} Pedido(s)
            </div>
          </div>
        </div>

        {/* FEED DE PEDIDOS DA FILA */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Sua Fila de Entregas ({pedidos.length})</span>
            </h2>

            <button
              onClick={fetchPedidos}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {pedidos.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto text-slate-500">
                ☕
              </div>
              <h3 className="font-bold text-sm text-slate-300">Nenhum pedido na sua fila</h3>
              <p className="text-xs text-slate-500">Mantenha o status ONLINE. A Central de Expedição enviará suas rotas automaticamente.</p>
            </div>
          ) : (
            pedidos.map((pedido) => {
              const isSelected = selectedPedido?.id === pedido.id;
              const isEmRota = pedido.status === 'em_rota';
              const telClean = pedido.telefone_cliente ? pedido.telefone_cliente.replace(/\D/g, '') : '';
              const waUrl = telClean ? `https://wa.me/55${telClean}` : null;

              return (
                <div
                  key={pedido.id}
                  className={`bg-slate-900 border rounded-2xl p-4 transition-all shadow-xl space-y-3 ${
                    isSelected ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-800'
                  }`}
                >
                  {/* CABEÇALHO DO PEDIDO */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-sm">
                        #{pedido.id_externo}
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {pedido.nome_cliente}
                      </span>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                      isEmRota ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-400'
                    }`}>
                      {isEmRota ? 'EM ROTA' : 'PRONTO P/ ROTA'}
                    </span>
                  </div>

                  {/* ENDEREÇO DO CLIENTE */}
                  <div className="space-y-1">
                    <div className="flex items-start gap-2 text-xs text-slate-300">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="font-medium leading-snug">{pedido.endereco_entrega}</span>
                    </div>

                    {pedido.telefone_cliente && (
                      <div className="flex items-center justify-between text-xs text-slate-400 pl-6 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{pedido.telefone_cliente}</span>
                        </div>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold text-[11px] rounded-lg transition"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CARD DE NAVEGAÇÃO OSRM CURVA-A-CURVA */}
                  {isEmRota && isSelected && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Navegação OSRM em Tempo Real</span>
                        </div>
                        {osrmMetrics && (
                          <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md font-mono text-[11px] font-bold">
                            {osrmMetrics.km} km • ~{osrmMetrics.min} min
                          </div>
                        )}
                      </div>

                      {/* Primeira instrução de manobra */}
                      {osrmSteps.length > 0 ? (
                        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-100 flex items-center justify-between">
                          <span>{formatOsrmStepText(osrmSteps[0])}</span>
                          <button
                            onClick={() => setShowNavigationDrawer(!showNavigationDrawer)}
                            className="text-[10px] text-amber-400 hover:underline font-mono shrink-0 ml-2"
                          >
                            {showNavigationDrawer ? 'Ocultar Passos' : `Ver Passos (${osrmSteps.length})`}
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">Obtendo rota pelas ruas reais do OSRM...</div>
                      )}

                      {/* Lista expansível de manobras */}
                      {showNavigationDrawer && osrmSteps.length > 0 && (
                        <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
                          {osrmSteps.map((s, idx) => (
                            <div key={idx} className="p-2 bg-slate-900/90 rounded-md text-[11px] text-slate-300 border border-slate-800/80 flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span>{formatOsrmStepText(s)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BOTOES DE AÇÃO E NAVEGAÇÃO GPS */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Waze */}
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent(pedido.endereco_entrega)}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Navigation className="w-4 h-4 text-sky-400" />
                      <span>Waze</span>
                    </a>

                    {/* Google Maps */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.endereco_entrega)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                      <span>Google Maps</span>
                    </a>
                  </div>

                  {/* BOTÃO PRINCIPAL DE STATUS */}
                  {!isEmRota ? (
                    <button
                      onClick={() => handleStartRoute(pedido)}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 transition"
                    >
                      <Truck className="w-4 h-4" />
                      <span>🚀 Iniciar Rota de Entrega</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedPedido(pedido);
                          setIsPinModalOpen(true);
                        }}
                        className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 transition"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>🔑 Digitar PIN</span>
                      </button>

                      <button
                        onClick={() => handleFinalizarEntrega(pedido)}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✅ Concluir</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODAL DE VALIDAÇÃO DE PIN DE SEGURANÇA */}
      {isPinModalOpen && selectedPedido && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 border border-purple-500/40 rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-100 text-base">PIN de Confirmação</h3>
              <p className="text-xs text-slate-400 mt-1">
                Solicite os 4 dígitos ao cliente no momento da entrega do pedido #{selectedPedido.id_externo}
              </p>
            </div>

            <input
              type="text"
              maxLength={4}
              placeholder="0 0 0 0"
              value={pinDigitado}
              onChange={(e) => setPinDigitado(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl font-mono font-black tracking-widest bg-slate-950 border border-purple-500/40 focus:border-purple-400 text-purple-300 rounded-xl py-3 outline-none"
            />

            {pinError && (
              <p className="text-xs font-bold text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                {pinError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinDigitado('');
                }}
                className="py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmPin}
                disabled={isSubmittingPin}
                className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs shadow-md"
              >
                {isSubmittingPin ? 'Validando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
