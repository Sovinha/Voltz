-- ==============================================================================
-- SISTEMA DE GESTÃO E EXPEDIÇÃO LOGÍSTICA PARA DELIVERY
-- Script de Modelagem do Banco de Dados (Supabase / PostgreSQL)
-- ==============================================================================

-- 1. Criação dos tipos enumerados (ENUMs) para Origem e Status do Pedido
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ordem_origem') THEN
        CREATE TYPE ordem_origem AS ENUM ('web', 'ifood');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ordem_status') THEN
        CREATE TYPE ordem_status AS ENUM ('pendente', 'preparando', 'pronto', 'despachado');
    END IF;
END $$;

-- 2. Criação da Tabela 'pedidos'
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origem ordem_origem NOT NULL,
    id_externo VARCHAR(255) NOT NULL,
    nome_cliente VARCHAR(255) NOT NULL,
    telefone_cliente VARCHAR(20),
    endereco_entrega TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ordem_status NOT NULL DEFAULT 'pendente',
    entregador_id VARCHAR(255),
    entregador_nome VARCHAR(255),
    codigo_confirmacao VARCHAR(4),
    link_rastreio TEXT,
    notificacao_saida_enviada BOOLEAN DEFAULT FALSE,
    notificacao_proximidade_enviada BOOLEAN DEFAULT FALSE,
    motoboy_latitude DOUBLE PRECISION,
    motoboy_longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Criação de Índices para Otimização de Performance
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_origem ON public.pedidos(origem);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public.pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_id_externo ON public.pedidos(id_externo);

-- 4. Habilitar Row Level Security (RLS) - Opcional/Recomendado no Supabase
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Política simples para permitir leitura e escrita pública/autenticada (Ajustar conforme regra de negócio)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pedidos' AND policyname = 'Permitir acesso total à tabela pedidos'
    ) THEN
        CREATE POLICY "Permitir acesso total à tabela pedidos" 
        ON public.pedidos 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 5. Habilitar Realtime no Supabase para a tabela de pedidos
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
