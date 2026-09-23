# 📋 PLANO DE AÇÃO & DOCUMENTAÇÃO MESTRE - VOLTZ DELIVERY LOGISTICS

> **DOCUMENTO DE MEMÓRIA PERMANENTE DO PROJETO**  
> Este arquivo serve como a base de conhecimento oficial e histórico incremental de atualizações do **Voltz Delivery**. Nenhuma funcionalidade ou padrão arquitetural deve ser ignorado ao iniciar novas sessões de desenvolvimento.

---

## 📌 1. Visão Geral da Arquitetura

* **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS + Leaflet / Canvas.
* **Backend**: Python 3.10 (Flask REST API + Gunicorn 4 Workers / 2 Threads).
* **Banco de Dados**: SQLite Local (`backend/pedidos.db`) em **Modo WAL (`PRAGMA journal_mode=WAL;`)** com timeout de 5.0s e índices SQL de alta performance. **100% independente do Supabase**.
* **Motor de Roteamento**: OSRM (Open Source Routing Machine) Self-Hosted local + Fallback OSRM Demo + Manhattan Grid fallback.
* **Geocodificação**: Pipeline Multi-Provedor Cascata: Google Maps (opcional) → Photon (Komoot) → ViaCEP + Nominatim Estruturado → Nominatim Free-Form → Bairros Hardcoded. Cache SQLite integrado.

---

## 🗄️ 2. Modelo do Banco de Dados SQLite (`backend/pedidos.db`)

### 📦 Tabela: `pedidos`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | UUID único do pedido |
| `origem` | `TEXT` | `'web'` (Cardápio Web) ou `'ifood'` |
| `id_externo` | `TEXT` | Código visível (ex: `#0090`, `iFood-12`) |
| `nome_cliente` | `TEXT` | Nome do cliente |
| `telefone_cliente` | `TEXT` | Telefone / WhatsApp do cliente |
| `endereco_entrega` | `TEXT` | Endereço completo de entrega |
| `latitude` | `REAL` | Coordenada Latitude para o mapa |
| `longitude` | `REAL` | Coordenada Longitude para o mapa |
| `itens` | `TEXT` | JSON ou texto formatado da comanda |
| `valor_total` | `REAL` | Valor total em R$ |
| `status` | `TEXT` | `'preparo'`, `'pronto'`, `'alocado'`, `'em_rota'`, `'finalizado'`, `'cancelado'` |
| `tipo_pagamento` | `TEXT` | `'maquininha'`, `'dinheiro'`, `'online'` |
| `entregador_id` | `TEXT` | ID do motoboy alocado |
| `entregador_nome` | `TEXT` | Nome do motoboy alocado |
| `codigo_confirmacao`| `TEXT` | PIN de 4 dígitos para validação da entrega |
| `link_rastreio` | `TEXT` | Link individual do cliente em tempo real |
| `created_at` | `TEXT` | Timestamp ISO da criação do pedido |

### 🛵 Tabela: `entregadores`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | UUID único do entregador |
| `nome` | `TEXT` | Nome completo |
| `telefone` | `TEXT UNIQUE` | Telefone (usado para login no App) |
| `placa_veiculo` | `TEXT` | Placa do veículo/moto |
| `status` | `TEXT` | `'disponivel'` (na fila), `'em_rota'`, `'offline'` |
| `total_entregas` | `INTEGER` | Total de corridas concluídas no dia |
| `frete_acumulado` | `REAL` | Valor acumulado de fretes em R$ |
| `latitude` | `REAL` | Último sinal GPS Lat enviado do celular |
| `longitude` | `REAL` | Último sinal GPS Lng enviado do celular |
| `last_seen` | `TEXT` | Timestamp do último sinal online |
| `created_at` | `TEXT` | Timestamp ISO do cadastro |

### ⚡ Índices SQL de Alta Performance Ativos:
* `idx_pedidos_status` ON `pedidos(status)`
* `idx_pedidos_created_at` ON `pedidos(created_at)`
* `idx_pedidos_id_externo` ON `pedidos(id_externo)`
* `idx_entregadores_status` ON `entregadores(status)`

---

## 🚀 3. Funcionalidades Ativas & Módulos do Sistema

### 🗺️ A. Mapa Interativo (80% da Tela) & Roteirizador
* **Aproveitamento de Tela**: O Canvas do mapa ocupa 9 colunas do grid (`xl:col-span-9`), garantindo ~80% de largura visível.
* **Bloqueio do Menu Nativo do Navegador**: O clique com botão direito ativa o menu customizado do mapa sem abrir o menu do Chrome/Edge.
* **Arraste & Solte de Pinos (Drag & Drop)**: O operador pode arrastar qualquer pino no mapa para ajustar a casa exata do cliente; a nova coordenada é salva automaticamente no banco (`PATCH /api/pedidos/<id>`).
* **Menu de Contexto do Pino / Mapa**:
  * 📍 *Mover pino para este ponto*
  * ✏️ *Editar Pedido*
  * 🛵 *Alocar Entregador*
  * 🟢 / 🔵 *Alterar Status*
  * 👁️ *Ver Comanda / Detalhes*
  * 📋 *Copiar Coordenadas*

### 🧠 B. Pipeline Multi-Provedor de Geocodificação (Precisão Cascata)
* **Parsing Multi-Linhas**: Processa blocos de texto do iFood com rua/número na 1ª linha, CEP/bairro na 2ª linha, complementos e referências.
* **Consulta ViaCEP**: Obtém o nome oficial e acentuado do logradouro e bairro pela base dos Correios através do CEP de 8 dígitos.
* **Isolamento de Complementos**: Remove ruídos como *"Apto 200"*, *"Próximo ao Saint Michel"* ou *"Condomínio"* da busca do mapa para evitar centroides genéricos.
* **Provedores em Cascata** (do mais preciso para o menos):
  1. 🏆 **Google Maps API** (opcional, se `GOOGLE_MAPS_API_KEY` configurado) → Precisão de porta/número exato
  2. 🥈 **Photon API** (Komoot, gratuito) → OSM com busca inteligente + bias para João Pessoa
  3. 🥉 **Nominatim Estruturado** → Viewbox JP + formato BR correto ("Rua, Número" não "Número Rua")
  4. 🔶 **Nominatim Free-Form** → Candidatos progressivos com bounded viewbox
  5. 🔴 **Bairros Hardcoded** → 31 bairros de João Pessoa com centróide
* **Cache SQLite** (`geocode_cache`): Evita chamadas repetidas para o mesmo endereço. Registra provedor e nível de precisão.
* **Logging por Provedor**: Cada resultado logga qual provedor foi usado e o tipo de precisão retornado.

### 🔄 C. Esteira Logística de Status nos Botões
Os cards de pedido possuem um botão dinâmico de status:
1. `preparo`: Button **`[ 🟢 Marcar Pronto ]`** ➔ altera status para `'pronto'`.
2. `pronto`: Button **`[ 🛵 Alocar Motoboy ]`** ➔ abre o modal de alocação de entregadores.
3. `alocado`: Button **`[ 🚀 Despachar ]`** ➔ altera status para `'em_rota'`.
4. `em_rota`: Pílula de status **`[ 🟡 Em Rota ]`**.

### ✏️ D. Modal de Edição Completa (`EditPedidoModal`)
* Permite editar Nome do Cliente, WhatsApp, Endereço de Entrega, Latitude/Longitude manuais, Itens da Comanda, Valor Total, Forma de Pagamento e Status.

### 🥤 E. Destaque de Bebidas Geladas e Sobremesas
* Utilitário `beverageDetection.ts` identifica bebidas/sobremesas nos itens do pedido.
* Adiciona faixa brilhante de aviso `⚠️ ATENÇÃO: INCLUI BEBIDA GELADA / SOBREMESA ⚠️` no comprovante térmico de 80mm e traz badges nos cards para o motoboy não esquecer os refrigerantes na geladeira.

### 🛵 F. Gestão de Entregadores & App do Motoboy
* **Sincronização Real**: 0 dados mocks/fakes. Tudo reflete a tabela `entregadores` do SQLite local.
* **App do Motoboy (`/motoboy`)**:
  * Botão de Auto-Despacho *"🛵 Cheguei na Loja! Puxar Rota Automática (DeepSeek AI)"*.
  * Modal iFood com link direto para o iFood Merchant e campo de PIN de 4 dígitos.
  * GPS em tempo real enviando latitude/longitude para o servidor.

---

## 📜 4. Histórico Incremental de Atualizações (Log de Mudanças)

### 🗓️ Versão 3.5.0 - 22/09/2026 (Atual)
* 🗺️ **Navegação do Motoboy Exclusiva no Google Maps**: Removido botão do Waze e unificado em um botão único destacado `🗺️ Abrir Rota no Google Maps`.
* 🗺️ **Sanitização Inteligente de Endereço para GPS (`getGoogleMapsUrl`)**:
  - Se o pedido possuir coordenadas salvas (`latitude`, `longitude`), abre rota direta via coordenadas GPS (porta exata).
  - Se for busca por texto, corta automaticamente complementos ruidosos após o CEP (ex: `) Apto 101 Perto do McDonald's`), garantindo que o Google Maps abra com precisão absoluta.

### 🗓️ Versão 3.4.0 - 22/09/2026
* ⚡ **Otimização de Desempenho**: Geocodificação não-bloqueante em segundo plano (`threading.Thread`). O salvamento de pedidos passou de ~3.000ms-8.000ms para **< 15ms**!
* ⚡ **Otimização de Servidor**: Servidor Flask dev/prod habilitado com `threaded=True` para suportar requisições concorrentes paralelas sem enfileiramento.
* ⚡ **Otimização de SQLite**: Removidos PRAGMAs de journal WAL redundantes a cada SELECT; PRAGMA WAL configurado 1x na inicialização do DB e `timeout=30.0s`.
* ⚡ **Otimização de Frontend**: `KanbanBoard.tsx` teve o indicador de carregamento (spinner) restrito apenas à carga inicial em tela vazia, eliminando travamentos/piscadas durante o polling em segundo plano.

### 🗓️ Versão 3.3.0 - 22/09/2026
* ➕ **Adicionado**: Pipeline Multi-Provedor de Geocodificação Cascata Gratuita & Reativa (Google Maps opcional → Photon → ViaCEP + Nominatim Estruturado Multi-Estratégia → Free-Form → Fallback Bairros).
* ➕ **Adicionado**: Endpoints `/api/pedidos/<id>/regeocode` e `/api/pedidos/regeocode_all` para recalcular coordenadas sob demanda.
* ➕ **Adicionado**: Suporte a chaves gratuitas/opcionais (`LOCATIONIQ_API_KEY`, `OPENCAGE_API_KEY`, `MAPBOX_API_KEY`, `GOOGLE_MAPS_API_KEY`).
* ➕ **Adicionado**: Tabela `geocode_cache` no SQLite — armazena coordenadas validadas e atualizações de arraste do marcador no mapa.
* ➕ **Adicionado**: Suite de testes automatizados `test_geocode_precision.py` — 6/6 testes de endereços reais de João Pessoa aprovados com **distância média de 33m** (precisão de quarteirão/rua exata!).
* ✏️ **Editado**: Nominatim Estruturado recalibrado com estratégias de busca em português ("Rua, Número, Bairro, Cidade, UF").
* ✏️ **Editado**: `.env.example` atualizado com documentação de chaves opcionais de geocodificação.

### 🗓️ Versão 3.2.0 - 22/09/2026
* ➕ **Adicionado**: Documento de memória mestra `PLANO_DE_ACAO.md`.
* ➕ **Adicionado**: Inteligência de parsing de endereços iFood multi-linhas com extrator de CEP e integração ViaCEP.
* ➕ **Adicionado**: Modal de Edição Completa de Pedidos (`EditPedidoModal.tsx`).
* ➕ **Adicionado**: Botão `🗑️ Resete Todos Entregadores` na aba de gestão de frota.
* ✏️ **Editado**: Canvas do mapa expandido para 80% da tela (`xl:col-span-9`).
* ✏️ **Editado**: `CompactOrderBar` atualizado com a esteira de status (`🟢 Pronto` ➔ `🛵 Alocar` ➔ `🚀 Despachar`).
* ✏️ **Editado**: `MotoboySidebar` reescrito para buscar entregadores reais do SQLite local via `/api/entregadores`.
* ✏️ **Editado**: `app.py` configurado com modo SQLite WAL (`PRAGMA journal_mode=WAL;`), busy timeout de 5.0s e índices SQL.
* ❌ **Removido**: Todos os mocks hardcoded de entregadores (Anderson, Marco, Roberto, Carlos).
* ❌ **Removido**: Flag e suporte ao Supabase (`isSupabaseConfigured = false`), tornando o sistema 100% local.

---

## 🚀 5. Comandos de Deploy & Atualização na VPS

No terminal da VPS (`root@vps-15433727:~/Voltz#`):

```bash
cd /root/Voltz
git pull origin main
docker compose up -d --build
```
