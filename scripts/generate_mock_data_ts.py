import json

def generate_mock_data():
    with open("backend/real_orders_joao_pessoa.json", "r", encoding="utf-8") as f:
        orders = json.load(f)

    print(f"Loaded {len(orders)} real orders for mockData.ts generation.")

    ts_content = """export interface Driver {
  id: string;
  nome: string;
  avatar: string;
  veiculo: 'moto' | 'carro';
  modeloVeiculo: string;
  placa: string;
  status: 'online' | 'em_rota' | 'em_pausa' | 'offline';
  rating: number;
  freteAcumulado: number;
  pedidosAtivosCount: number;
  pedidosAtivosIds: string[];
  telefone: string;
  ultimaLocalizacao?: string;
  latitude?: number;
  longitude?: number;
}

export interface ExpandedPedido {
  id: string;
  id_externo: string;
  cliente: string;
  telefone?: string;
  endereco: string;
  endereco_limpo_mapa?: string;
  bairro: string;
  tipoComida: 'pizza' | 'burger' | 'sushi' | 'massa' | 'bebidas' | 'texmex' | 'salada';
  foodIcon: string;
  itensResumo: string;
  valorTotal: number;
  taxaEntrega: number;
  distanciaKm: number;
  origem: 'ifood' | 'web' | 'whatsapp';
  status: string;
  horaPedido: string;
  tempoEsperaMin: number;
  isCritico: boolean;
  entregadorAssinado?: {
    id: string;
    nome: string;
    avatar: string;
    veiculo: 'moto' | 'carro';
  };
  latitude: number;
  longitude: number;
  created_at?: string;
}

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv-1',
    nome: 'Carlos "Speed" Silva',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    veiculo: 'moto',
    modeloVeiculo: 'Honda CG 160 Fan',
    placa: 'ABC-4567',
    status: 'online',
    rating: 4.9,
    freteAcumulado: 185.50,
    pedidosAtivosCount: 2,
    pedidosAtivosIds: ['#VOL-0001', '#VOL-0004'],
    telefone: '(83) 99812-3456',
    ultimaLocalizacao: 'Manaíra, João Pessoa',
    latitude: -7.100,
    longitude: -34.832
  },
  {
    id: 'drv-2',
    nome: 'Lucas Mendes',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    veiculo: 'moto',
    modeloVeiculo: 'Yamaha Fazer 250',
    placa: 'DEF-8901',
    status: 'em_rota',
    rating: 4.85,
    freteAcumulado: 162.00,
    pedidosAtivosCount: 1,
    pedidosAtivosIds: ['#VOL-0002'],
    telefone: '(83) 99123-4567',
    ultimaLocalizacao: 'Bessa, João Pessoa',
    latitude: -7.070,
    longitude: -34.835
  },
  {
    id: 'drv-3',
    nome: 'Rafael Oliveira',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    veiculo: 'moto',
    modeloVeiculo: 'Honda Biz 125',
    placa: 'GHI-2345',
    status: 'online',
    rating: 4.95,
    freteAcumulado: 124.00,
    pedidosAtivosCount: 0,
    pedidosAtivosIds: [],
    telefone: '(83) 98877-6655',
    ultimaLocalizacao: 'Base Central - Tambaú',
    latitude: -7.116,
    longitude: -34.825
  },
  {
    id: 'drv-4',
    nome: 'Mariana Santos',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    veiculo: 'carro',
    modeloVeiculo: 'Fiat Uno Mille 1.0',
    placa: 'JKL-6789',
    status: 'online',
    rating: 5.0,
    freteAcumulado: 210.00,
    pedidosAtivosCount: 1,
    pedidosAtivosIds: ['#VOL-0005'],
    telefone: '(83) 99344-5566',
    ultimaLocalizacao: 'Jardim Oceania, João Pessoa',
    latitude: -7.085,
    longitude: -34.839
  }
];

export const INITIAL_PEDIDOS: ExpandedPedido[] = """ + json.dumps(orders, ensure_ascii=False, indent=2) + ";\n"

    with open("frontend/src/lib/mockData.ts", "w", encoding="utf-8") as f:
        f.write(ts_content)

    print(f"[OK] Successfully wrote {len(orders)} real orders to frontend/src/lib/mockData.ts")

if __name__ == "__main__":
    generate_mock_data()
