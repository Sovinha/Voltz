import { createClient } from '@supabase/supabase-js';

// Definições de Tipos TypeScript para a Base de Dados de Pedidos Logísticos
export type OrdemOrigem = 'web' | 'ifood';
export type OrdemStatus = 
  | 'pendente' 
  | 'preparando' 
  | 'preparo' 
  | 'pronto' 
  | 'despachado' 
  | 'alocado' 
  | 'em_rota' 
  | 'pagamento' 
  | 'devolucao' 
  | 'finalizado' 
  | 'cancelado';

export interface ItemPedido {
  nome: string;
  quantidade: number;
  preco_unitario: number;
}

export type TipoPagamento = 'maquininha' | 'dinheiro' | 'online';

export interface Entregador {
  id: string;
  nome: string;
  status: 'na_fila' | 'em_rota' | 'offline';
  corridasConcluidas: number;
}

export interface ChatMessage {
  id: string;
  sender: 'loja' | 'motoboy';
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: string;
}

export interface Pedido {
  id: string;
  origem: OrdemOrigem;
  id_externo: string;
  nome_cliente: string;
  telefone_cliente?: string;
  endereco_entrega: string;
  latitude: number | null;
  longitude: number | null;
  itens: ItemPedido[];
  valor_total: number;
  status: OrdemStatus;
  created_at: string;
  tipo_pagamento?: TipoPagamento;
  pagamento_na_entrega?: boolean;
  entregador_id?: string;
  entregador_nome?: string;
  codigo_confirmacao?: string;
  link_rastreio?: string;
  notificacao_saida_enviada?: boolean;
  notificacao_proximidade_enviada?: boolean;
  motoboy_latitude?: number | null;
  motoboy_longitude?: number | null;
}

// Força utilização exclusiva do Banco de Dados Local SQLite (sem Supabase)
export const isSupabaseConfigured = false;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
