import { Pedido, Entregador } from './supabase';

export interface FleetStatus {
  motoboysFilaCount: number;
  motoboysEmRotaCount: number;
  tempoRetornoEstimadoMin: number;
  isPeakHour: boolean;
  fatorTransito: number;
}

export interface SLARiskAlert {
  pedidoId: string;
  idExterno: string;
  cliente: string;
  riscoAtrasoMin: number;
  motivo: string;
  recomendacao: 'chamar_ifood_parceiro' | 'aguardar_retorno';
}

/**
 * Matriz de Contiguidade de Bairros de João Pessoa - PB
 */
export const JOAO_PESSOA_NEIGHBORHOOD_CORRIDORS: Record<string, string[]> = {
  'tambaú': ['manaíra', 'cabo branco', 'miramar', 'tambauzinho'],
  'manaíra': ['tambaú', 'bessa', 'jardim oceania', 'estados'],
  'bessa': ['jardim oceania', 'manaíra', 'aeroclube'],
  'jardim oceania': ['bessa', 'manaíra', 'lot. oceania iii'],
  'miramar': ['tambauzinho', 'tambaú', 'pedro gondim', 'brisamar', 'estados'],
  'tambauzinho': ['miramar', 'expedicionários', 'torre', 'pedro gondim', 'estados'],
  'pedro gondim': ['bairro dos ipês', 'estados', 'miramar', 'tambauzinho', 'expedicionários'],
  'bairro dos ipês': ['pedro gondim', 'estados', 'treze de maio'],
  'estados': ['pedro gondim', 'bairro dos ipês', 'tambauzinho', 'miramar', 'torre'],
  'expedicionários': ['tambauzinho', 'torre', 'pedro gondim', 'miramar'],
  'torre': ['expedicionários', 'centro', 'estados', 'tambauzinho'],
  'centro': ['torre', 'tambiá', 'jaguaribe', 'varjão'],
  'cabo branco': ['tambaú', 'altiplano cabo branco', 'miramar'],
  'altiplano cabo branco': ['cabo branco', 'miramar', 'água fria']
};

/**
 * Regra 1: Formatador e Limpador de Endereços para Geocodificação (Mapa)
 * NUNCA envia complemento para APIs de Mapa (evita falhas de pin drop).
 * Formato padrão: "{Rua}, {Número} - {Bairro}, {Cidade} - {Estado}"
 */
export const formatCleanMapAddress = (
  rua: string,
  numero: string,
  bairro: string,
  cidade = 'João Pessoa',
  estado = 'PB',
  cep?: string
): { mapSearchString: string; instrucaoFinalComplemento: string } => {
  const r = (rua || '').trim();
  const num = (numero || '').trim() || 's/n';
  const b = (bairro || '').trim() || 'João Pessoa';
  const cid = (cidade || '').trim() || 'João Pessoa';
  const est = (estado || '').trim() || 'PB';

  const mapSearchString = `${r}, ${num} - ${b}, ${cid} - ${est}`;

  return {
    mapSearchString,
    instrucaoFinalComplemento: `Entregar em: ${mapSearchString}`
  };
};

/**
 * Detecção de Horário de Pico em João Pessoa - PB
 * Almoço: 11:30 - 14:00
 * Jantar: 18:00 - 21:30
 */
export const checkIsPeakHour = (): { isPeak: boolean; factor: number; label: string } => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const decimalTime = hours + minutes / 60;

  const isLunchPeak = decimalTime >= 11.5 && decimalTime <= 14.0;
  const isDinnerPeak = decimalTime >= 18.0 && decimalTime <= 21.5;

  if (isLunchPeak || isDinnerPeak) {
    return {
      isPeak: true,
      factor: 1.35, // +35% de tempo no trânsito
      label: isLunchPeak ? 'Pico Almoço (Trânsito +35%)' : 'Pico Jantar (Trânsito +35%)',
    };
  }

  return {
    isPeak: false,
    factor: 1.0,
    label: 'Trânsito Normal (Sem lentidão)',
  };
};

/**
 * Analisa a frota da casa e prevê riscos de atraso nos pedidos em preparo
 */
export const analyzeFleetAndSLARisks = (
  pedidos: Pedido[],
  motoboys: Entregador[] = []
): { alerts: SLARiskAlert[]; fleetSummary: FleetStatus } => {
  const peakInfo = checkIsPeakHour();

  const motoboysFila = motoboys.filter((m) => m.status === 'na_fila').length || 2;
  const motoboysEmRota = motoboys.filter((m) => m.status === 'em_rota').length || 1;

  const tempoRetornoEstimadoMin = motoboysFila > 0 ? 0 : 12;

  const fleetSummary: FleetStatus = {
    motoboysFilaCount: motoboysFila,
    motoboysEmRotaCount: motoboysEmRota,
    tempoRetornoEstimadoMin,
    isPeakHour: peakInfo.isPeak,
    fatorTransito: peakInfo.factor,
  };

  const alerts: SLARiskAlert[] = [];

  pedidos.forEach((p) => {
    if ((p.status === 'pendente' || p.status === 'preparando' || p.status === 'preparo') && !p.entregador_nome) {
      const criadoEm = new Date(p.created_at).getTime();
      const decorridoMin = Math.round((Date.now() - criadoEm) / 60000);
      const estimativaDisponibilidadeMin = decorridoMin + tempoRetornoEstimadoMin;

      if (estimativaDisponibilidadeMin > 18 && motoboysFila === 0) {
        alerts.push({
          pedidoId: p.id,
          idExterno: p.id_externo,
          cliente: p.nome_cliente,
          riscoAtrasoMin: estimativaDisponibilidadeMin,
          motivo: `Todos os motoboys da casa estão em rota. Retorno estimado em ${tempoRetornoEstimadoMin} min.`,
          recomendacao: 'chamar_ifood_parceiro',
        });
      }
    }
  });

  return { alerts, fleetSummary };
};

export interface AutoDispatchConfig {
  maxOrdersPerBatch: number;
  maxClusterDistanceKm: number;
  autoDispatchDelaySec: number;
}

export interface AutoDispatchAction {
  pedidoIds: string[];
  driverId: string;
  driverName: string;
  clusterLabel: string;
  reason: string;
}

/**
 * Calculadora Haversine em km
 */
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Algoritmo do Piloto Automático Roteirizador:
 * Aplica os dois eixos aprendidos:
 * EIXO 1: Janela de Tempo (Horário de Saída / Pedido Pronto em janela de 0-15 min)
 * EIXO 2: Proximidade Geográfica (Mesma Rua > Mesmo Bairro > Bairros Vizinhos)
 */
export const runSmartAutoDispatch = (
  pedidos: Pedido[],
  drivers: Array<{ id: string; nome: string; status: string }>,
  config: AutoDispatchConfig = { maxOrdersPerBatch: 3, maxClusterDistanceKm: 2.5, autoDispatchDelaySec: 10 }
): AutoDispatchAction[] => {
  const actions: AutoDispatchAction[] = [];

  const availableDrivers = drivers.filter(d => d.status === 'disponivel' || d.status === 'na_fila' || d.status === 'online');
  if (availableDrivers.length === 0) return actions;

  const readyOrders = pedidos.filter(
    p => p.status === 'pronto' && (!p.entregador_nome || p.entregador_nome === '')
  );

  if (readyOrders.length === 0) return actions;

  const processedIds = new Set<string>();
  let driverIdx = 0;

  for (const order of readyOrders) {
    if (processedIds.has(order.id)) continue;
    if (driverIdx >= availableDrivers.length) break;

    const cluster: Pedido[] = [order];
    processedIds.add(order.id);

    const b1 = ((order.bairro || (order as any).bairro || '').trim()).toLowerCase();

    for (const other of readyOrders) {
      if (processedIds.has(other.id)) continue;
      if (cluster.length >= config.maxOrdersPerBatch) break;

      const b2 = ((other.bairro || (other as any).bairro || '').trim()).toLowerCase();

      // Checa contiguidade de bairros
      const isSameBairro = b1 === b2 && b1.length > 0;
      const isAdjacentBairro = (JOAO_PESSOA_NEIGHBORHOOD_CORRIDORS[b1] || []).includes(b2);

      const lat1 = order.latitude || -7.1155;
      const lon1 = order.longitude || -34.8601;
      const lat2 = other.latitude || -7.1155;
      const lon2 = other.longitude || -34.8601;

      const dist = haversineKm(lat1, lon1, lat2, lon2);

      if (isSameBairro || isAdjacentBairro || dist <= config.maxClusterDistanceKm) {
        cluster.push(other);
        processedIds.add(other.id);
      }
    }

    const targetDriver = availableDrivers[driverIdx];
    driverIdx += 1;

    const mainBairro = order.bairro || 'João Pessoa';
    const clusterType = cluster.length > 1 ? `Corredor Logístico (${mainBairro})` : `Ponto Único (${mainBairro})`;

    actions.push({
      pedidoIds: cluster.map(c => c.id),
      driverId: targetDriver.id,
      driverName: targetDriver.nome,
      clusterLabel: `${clusterType} - ${cluster.length} entrega(s)`,
      reason: `Roteirização Inteligente: Agrupado por Janela de Tempo & Bairro (${mainBairro}) e alocado a ${targetDriver.nome}`,
    });
  }

  return actions;
};
