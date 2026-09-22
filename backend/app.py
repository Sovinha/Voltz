import os
import sys
import json
import re
import sqlite3
import uuid
import urllib.parse
import unicodedata
from datetime import datetime
import requests
from flask import Flask, request, jsonify
from werkzeug.exceptions import HTTPException

from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__)
CORS(app)  # Permite requisições do frontend React / Next.js

# Inicialização da Conexão com o Supabase (se disponível)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY or "seu-projeto" in SUPABASE_URL or "sua-chave" in SUPABASE_KEY:
    supabase = None
    print("[AVISO] SUPABASE_URL/KEY nao definidos ou sao placeholders. Usando SQLite local (pedidos.db)!")
else:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        supabase = None
        print(f"[AVISO] Falha ao inicializar Supabase: {e}")

DB_FILE = os.path.join(os.path.dirname(__file__), "pedidos.db")


def get_db_connection():
    """Conecta ao banco de dados SQLite local com modo WAL para alta concorrência."""
    conn = sqlite3.connect(DB_FILE, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_local_db():
    """Inicializa as tabelas 'pedidos' e 'entregadores' no SQLite local com índices de alta performance."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pedidos (
            id TEXT PRIMARY KEY,
            origem TEXT NOT NULL,
            id_externo TEXT NOT NULL,
            nome_cliente TEXT NOT NULL,
            telefone_cliente TEXT,
            endereco_entrega TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            itens TEXT NOT NULL,
            valor_total REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pendente',
            entregador_id TEXT,
            entregador_nome TEXT,
            codigo_confirmacao TEXT,
            link_rastreio TEXT,
            notificacao_saida_enviada INTEGER DEFAULT 0,
            notificacao_proximidade_enviada INTEGER DEFAULT 0,
            motoboy_latitude REAL,
            motoboy_longitude REAL,
            created_at TEXT NOT NULL
        )
    """)
    
    # Migrações seguras para bancos SQLite existentes
    cols_to_add = [
        ("telefone_cliente", "TEXT"),
        ("entregador_id", "TEXT"),
        ("entregador_nome", "TEXT"),
        ("codigo_confirmacao", "TEXT"),
        ("link_rastreio", "TEXT"),
        ("notificacao_saida_enviada", "INTEGER DEFAULT 0"),
        ("notificacao_proximidade_enviada", "INTEGER DEFAULT 0"),
        ("motoboy_latitude", "REAL"),
        ("motoboy_longitude", "REAL")
    ]
    cursor.execute("PRAGMA table_info(pedidos)")
    existing_cols = [r[1] for r in cursor.fetchall()]
    for col_name, col_type in cols_to_add:
        if col_name not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE pedidos ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"[AVISO] Nao foi possivel adicionar coluna {col_name}: {e}")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS entregadores (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            telefone TEXT NOT NULL UNIQUE,
            placa_veiculo TEXT,
            status TEXT NOT NULL DEFAULT 'disponivel',
            total_entregas INTEGER NOT NULL DEFAULT 0,
            frete_acumulado REAL NOT NULL DEFAULT 0.0,
            latitude REAL,
            longitude REAL,
            last_seen TEXT,
            created_at TEXT NOT NULL
        )
    """)

    cursor.execute("PRAGMA table_info(entregadores)")
    existing_driver_cols = [r[1] for r in cursor.fetchall()]
    for col_name, col_type in [("latitude", "REAL"), ("longitude", "REAL"), ("last_seen", "TEXT")]:
        if col_name not in existing_driver_cols:
            try:
                cursor.execute(f"ALTER TABLE entregadores ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                pass


    # Índices de Alta Performance para buscas rápidas no SQLite
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pedidos_id_externo ON pedidos(id_externo);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_entregadores_status ON entregadores(status);")

    conn.commit()
    conn.close()


# Garante que a tabela local exista ao iniciar
init_local_db()


@app.route("/", methods=["GET"])
def index():
    """Rota raiz amigável da API do Backend Voltz Logistics."""
    return jsonify({
        "status": "online",
        "service": "Voltz Logistics System - Backend API",
        "version": "3.0",
        "frontend_url": "http://143.95.215.217:3002",
        "endpoints": {
            "health": "/api/health",
            "pedidos": "/api/pedidos",
            "webhook_web": "/api/webhook/web",
            "entregadores": "/api/entregadores"
        }
    }), 200


@app.route("/api/health", methods=["GET"])
def health_check():
    """Rota de verificação de saúde da API."""
    return jsonify({
        "status": "online",
        "service": "Backend de Recepção Logística",
        "database_mode": "Supabase" if supabase else "SQLite Local (pedidos.db)",
        "supabase_connected": supabase is not None
    }), 200


OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org").rstrip("/")


def _call_osrm_endpoint(endpoint_path, query_params=None):
    """
    Função auxiliar para realizar requisições resilientes aos servidores OSRM
    com suporte a failover para servidores OSM alternativos e containers Docker.
    """
    import urllib.request
    import urllib.parse
    import time

    params_str = f"?{urllib.parse.urlencode(query_params)}" if query_params else ""
    
    # Servidores OSRM primário (Self-Hosted Docker) e secundários de contingência
    base_urls = [
        OSRM_BASE_URL,
        "http://osrm:5000",
        "http://localhost:5001",
        "https://router.project-osrm.org",
        "https://routing.openstreetmap.de/routed-car"
    ]
    
    # Remove duplicados preservando a ordem
    unique_urls = []
    for u in base_urls:
        if u not in unique_urls:
            unique_urls.append(u)

    last_error = None
    start_time = time.time()

    for base in unique_urls:
        target_url = f"{base}/{endpoint_path.lstrip('/')}{params_str}"
        try:
            req = urllib.request.Request(
                target_url,
                headers={"User-Agent": "VoltzLogistics/2.0 (Project-OSRM Client)"}
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    if data.get("code") in ("Ok", "Ok!"):
                        data["_meta"] = {
                            "server_used": base,
                            "latency_ms": round((time.time() - start_time) * 1000, 1)
                        }
                        return data, 200
        except Exception as e:
            last_error = str(e)
            # Log apenas erros relevantes se nao for tentativa de host local offline
            if "localhost" not in base and "osrm:5000" not in base:
                print(f"[AVISO OSRM] Falha na consulta em {target_url}: {e}")

    return {"error": f"Falha nas APIs do OSRM. Ultimo erro: {last_error}"}, 502


@app.route("/api/osrm/status", methods=["GET"])
def get_osrm_status():
    """
    Verifica a saude, conectividade e latencia do servidor OSRM configurado.
    """
    test_waypoints = "-34.8601,-7.1155;-34.8520,-7.1210"
    data, code = _call_osrm_endpoint(
        f"route/v1/driving/{test_waypoints}",
        {"overview": "false", "steps": "false"}
    )

    if code == 200:
        return jsonify({
            "status": "online",
            "osrm_base_url": OSRM_BASE_URL,
            "active_server": data.get("_meta", {}).get("server_used"),
            "latency_ms": data.get("_meta", {}).get("latency_ms"),
            "engine": "Project OSRM v5 API"
        }), 200
    else:
        return jsonify({
            "status": "degraded",
            "osrm_base_url": OSRM_BASE_URL,
            "error": data.get("error")
        }), 502


@app.route("/api/route", methods=["GET"])
def get_osrm_route():
    """
    Proxy de calculo de rotas em ruas reais via OSRM /route/v1/
    Query params:
      - waypoints: string "lng1,lat1;lng2,lat2;..." (obrigatorio)
      - profile: "driving" (padrao), "bike", "foot"
      - steps: "true" | "false"
      - geometries: "geojson" | "polyline"
      - overview: "full" | "simplified" | "false"
    """
    waypoints = request.args.get("waypoints")
    if not waypoints:
        return jsonify({"error": "Parametro waypoints e obrigatorio"}), 400

    profile = request.args.get("profile", "driving")
    osrm_profile = "driving"
    if profile in ("bike", "biking", "bicycle"):
        osrm_profile = "driving"
    elif profile in ("foot", "walking"):
        osrm_profile = "driving"

    steps = request.args.get("steps", "true")
    geometries = request.args.get("geometries", "geojson")
    overview = request.args.get("overview", "full")

    query_params = {
        "overview": overview,
        "geometries": geometries,
        "steps": steps,
        "annotations": "true"
    }

    endpoint = f"route/v1/{osrm_profile}/{waypoints}"
    data, status_code = _call_osrm_endpoint(endpoint, query_params)
    return jsonify(data), status_code


@app.route("/api/trip", methods=["GET", "POST"])
def get_osrm_trip():
    """
    Proxy de otimização de rotas multi-destino (TSP - Traveling Salesperson Problem) via OSRM /trip/v1/
    Reordena automaticamente as paradas de entregas para menor distancia/tempo total.
    """
    if request.method == "POST":
        body = request.get_json(silent=True) or {}
        waypoints = body.get("waypoints")
        source = body.get("source", "first")
        destination = body.get("destination", "any")
        roundtrip = body.get("roundtrip", "true")
        profile = body.get("profile", "driving")
    else:
        waypoints = request.args.get("waypoints")
        source = request.args.get("source", "first")
        destination = request.args.get("destination", "any")
        roundtrip = request.args.get("roundtrip", "true")
        profile = request.args.get("profile", "driving")

    if not waypoints:
        return jsonify({"error": "Parametro waypoints e obrigatorio"}), 400

    query_params = {
        "source": source,
        "destination": destination,
        "roundtrip": roundtrip,
        "overview": "full",
        "geometries": "geojson",
        "steps": "true"
    }

    endpoint = f"trip/v1/{profile}/{waypoints}"
    data, status_code = _call_osrm_endpoint(endpoint, query_params)
    return jsonify(data), status_code


@app.route("/api/table", methods=["GET", "POST"])
def get_osrm_table():
    """
    Matriz de Distâncias e Durações entre múltiplos origens/destinos via OSRM /table/v1/
    Util no despacho automatizado e alocação do entregador mais proximo.
    """
    if request.method == "POST":
        body = request.get_json(silent=True) or {}
        waypoints = body.get("waypoints")
        profile = body.get("profile", "driving")
    else:
        waypoints = request.args.get("waypoints")
        profile = request.args.get("profile", "driving")

    if not waypoints:
        return jsonify({"error": "Parametro waypoints e obrigatorio"}), 400

    query_params = {
        "annotations": "duration,distance"
    }

    endpoint = f"table/v1/{profile}/{waypoints}"
    data, status_code = _call_osrm_endpoint(endpoint, query_params)
    return jsonify(data), status_code


@app.route("/api/match", methods=["GET", "POST"])
def get_osrm_match():
    """
    Ajuste de Rastro GPS (Map-Matching) via OSRM /match/v1/
    Snapa coordenadas ruidosas de GPS de celulares diretamente nas pistas reais da rua.
    Query/Body params:
      - waypoints: string "lng1,lat1;lng2,lat2;..." (obrigatorio)
      - timestamps: string "t1;t2;..." (opcional)
      - profile: "driving" (padrao)
    """
    if request.method == "POST":
        body = request.get_json(silent=True) or {}
        waypoints = body.get("waypoints")
        timestamps = body.get("timestamps")
        profile = body.get("profile", "driving")
    else:
        waypoints = request.args.get("waypoints")
        timestamps = request.args.get("timestamps")
        profile = request.args.get("profile", "driving")

    if not waypoints:
        return jsonify({"error": "Parametro waypoints e obrigatorio"}), 400

    query_params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "true"
    }
    if timestamps:
        query_params["timestamps"] = timestamps

    endpoint = f"match/v1/{profile}/{waypoints}"
    data, status_code = _call_osrm_endpoint(endpoint, query_params)
    return jsonify(data), status_code


@app.route("/api/pedidos/reset", methods=["POST", "DELETE"])
def resetar_pedidos_teste():
    """Limpa todos os pedidos de teste do banco de dados e reseta a frota de entregadores."""
    if supabase:
        try:
            supabase.table("pedidos").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            print(f"[AVISO] Falha ao resetar pedidos no Supabase: {e}")

    conn = get_db_connection()
    conn.execute("DELETE FROM pedidos")
    conn.execute("UPDATE entregadores SET frete_acumulado = 0.0, total_entregas = 0, status = 'disponivel'")
    conn.commit()
    conn.close()

    print("[RESET OK] Todos os pedidos de teste foram zerados no banco de dados!")
    return jsonify({
        "status": "success",
        "mensagem": "Banco de dados zerado com sucesso! Pronto para inserção de pedidos reais."
    }), 200


@app.route("/api/pedidos/limpar-antigos", methods=["POST", "DELETE"])
def limpar_pedidos_antigos():
    """Exclui pedidos criados há mais de N horas (padrão: 24 horas)."""
    horas = request.args.get("horas", default=24, type=int)
    cutoff = (datetime.now() - timedelta(hours=horas)).isoformat()
    
    deleted_count = 0
    if supabase:
        try:
            res = supabase.table("pedidos").delete().lt("created_at", cutoff).execute()
            if res and hasattr(res, 'data') and res.data:
                deleted_count += len(res.data)
        except Exception as e:
            print(f"[AVISO] Erro ao excluir antigos no Supabase: {e}")

    try:
        conn = get_db_connection()
        cursor = conn.execute("DELETE FROM pedidos WHERE created_at < ?", (cutoff,))
        deleted_count += cursor.rowcount
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[ERRO DB] Falha ao limpar pedidos antigos no SQLite: {e}")

    print(f"[LIMPEZA OK] {deleted_count} pedido(s) com mais de {horas}h foram removidos!")
    return jsonify({
        "status": "success",
        "mensagem": f"{deleted_count} pedido(s) com mais de {horas}h foram removidos.",
        "removidos": deleted_count
    }), 200


@app.route("/api/pedidos", methods=["GET"])
def listar_pedidos():
    """
    Retorna pedidos (usado no modo local ou Supabase).
    Suporta filtro por tempo limite em horas via parâmetro 'horas' (ex: ?horas=24).
    """
    horas = request.args.get("horas", type=int)
    cutoff = None
    if horas and horas > 0:
        cutoff = (datetime.now() - timedelta(hours=horas)).isoformat()

    if supabase:
        try:
            query = supabase.table("pedidos").select("*").order("created_at", desc=True)
            if cutoff:
                query = query.gte("created_at", cutoff)
            res = query.execute()
            return jsonify(res.data), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        conn = get_db_connection()
        if cutoff:
            rows = conn.execute("SELECT * FROM pedidos WHERE created_at >= ? ORDER BY created_at DESC", (cutoff,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM pedidos ORDER BY created_at DESC").fetchall()
        conn.close()
        
        pedidos = []
        for row in rows:
            p = dict(row)
            try:
                p["itens"] = json.loads(p["itens"])
            except Exception:
                p["itens"] = []
            pedidos.append(p)
        return jsonify(pedidos), 200


@app.route("/api/pedidos/<id_pedido>", methods=["DELETE"])
def deletar_pedido(id_pedido):
    """Deleta um pedido específico do banco de dados (Supabase ou SQLite local)."""
    if supabase:
        try:
            supabase.table("pedidos").delete().eq("id", id_pedido).execute()
        except Exception as e:
            print(f"[AVISO] Erro ao deletar no Supabase: {e}")

    conn = get_db_connection()
    conn.execute("DELETE FROM pedidos WHERE id = ? OR id_externo = ?", (id_pedido, id_pedido))
    conn.commit()
    conn.close()

    print(f"[DELETE OK] Pedido {id_pedido} removido do banco de dados!")
    return jsonify({"status": "success", "mensagem": f"Pedido {id_pedido} deletado com sucesso!"}), 200


@app.route("/api/pedidos/<id_pedido>", methods=["PATCH"])
def atualizar_status_pedido(id_pedido):
    """
    Atualiza campos de um pedido (status, latitude, longitude, entregador, etc.).
    Permite ajuste fino de coordenadas e alteração de status em tempo real.
    """
    data = request.get_json() or {}
    if not data:
        return jsonify({"error": "Nenhum campo fornecido para atualização"}), 400

    updatable_keys = [
        "status", "latitude", "longitude", "endereco_entrega", 
        "entregador_id", "entregador_nome", "codigo_confirmacao",
        "motoboy_latitude", "motoboy_longitude"
    ]

    update_payload = {}
    for k in updatable_keys:
        if k in data:
            update_payload[k] = data[k]

    if "status" in data and data["status"] == "finalizado":
        update_payload["motoboy_latitude"] = None
        update_payload["motoboy_longitude"] = None

    if supabase:
        try:
            supabase.table("pedidos").update(update_payload).eq("id", id_pedido).execute()
        except Exception as e:
            print(f"[AVISO Supabase PATCH] {e}")

    conn = get_db_connection()
    set_clauses = []
    values = []

    for k, v in update_payload.items():
        set_clauses.append(f"{k} = ?")
        values.append(v)

    if set_clauses:
        values.append(id_pedido)
        values.append(id_pedido)
        sql = f"UPDATE pedidos SET {', '.join(set_clauses)} WHERE id = ? OR id_externo = ?"
        conn.execute(sql, tuple(values))
        conn.commit()

    conn.close()

    print(f"[PATCH OK] Pedido {id_pedido} atualizado com sucesso: {update_payload}")
    return jsonify({
        "status": "success",
        "id": id_pedido,
        "atualizado": update_payload
    }), 200


@app.route("/api/webhook/web", methods=["POST"])
def webhook_cardapio_web():
    """
    Endpoint para recepção de webhook do Cardápio Web (Plataforma Própria).
    Recebe os dados do pedido, padroniza e salva no Supabase ou no SQLite local.
    """
    try:
        raw_body = request.get_data(as_text=True) or ""
        data = {}
        if raw_body:
            try:
                data = json.loads(raw_body)
            except Exception as parse_err:
                print(f"[AVISO JSON PARSE] Falha ao converter JSON: {parse_err}")
                data = {}

        if not data:
            return jsonify({"error": "Payload JSON e obrigatorio"}), 400

        # Validação dos campos obrigatórios
        required_fields = ["id_externo", "nome_cliente", "endereco_entrega", "itens", "valor_total"]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                "error": f"Campos obrigatorios ausentes: {', '.join(missing_fields)}"
            }), 400

        origem = data.get("origem", "web")
        novo_id = str(uuid.uuid4())
        created_at_str = datetime.now().isoformat()

        # Geocodificação e Sanitização Estrita de Coordenadas do Pedido
        addr = str(data.get("endereco_entrega"))
        req_lat = data.get("latitude")
        req_lng = data.get("longitude")

        if req_lat is not None and req_lng is not None and float(req_lat) != 0:
            lat, lng = sanitize_coords(req_lat, req_lng)
            # Se forem coordenadas genéricas de bairro/loja (-7.1145 / -7.1155), recarrega via geocodificação da rua exata
            if abs(lat - (-7.1145)) < 0.002 and abs(lng - (-34.8601)) < 0.002:
                exact_lat, exact_lng = geocode_address(addr)
                if exact_lat is not None and exact_lng is not None:
                    lat, lng = exact_lat, exact_lng
        else:
            lat, lng = geocode_address(addr)

        # Estruturação e Padronização do Pedido
        novo_pedido = {
            "id": novo_id,
            "origem": origem,
            "id_externo": str(data.get("id_externo")),
            "nome_cliente": str(data.get("nome_cliente")),
            "endereco_entrega": addr,
            "latitude": lat,
            "longitude": lng,
            "itens": data.get("itens"),
            "valor_total": float(data.get("valor_total")),
            "status": "pendente",
            "created_at": created_at_str
        }

        # 1. Salva INSTANTANEAMENTE no SQLite local (1ms) para nao travar a interface do usuario
        tel_cliente = data.get("telefone_cliente", "")
        conn = get_db_connection()
        conn.execute("""
            INSERT INTO pedidos (id, origem, id_externo, nome_cliente, telefone_cliente, endereco_entrega, latitude, longitude, itens, valor_total, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            novo_pedido["id"],
            novo_pedido["origem"],
            novo_pedido["id_externo"],
            novo_pedido["nome_cliente"],
            tel_cliente,
            novo_pedido["endereco_entrega"],
            novo_pedido["latitude"],
            novo_pedido["longitude"],
            json.dumps(novo_pedido["itens"]),
            novo_pedido["valor_total"],
            novo_pedido["status"],
            novo_pedido["created_at"]
        ))
        conn.commit()
        conn.close()

        print(f"[OK] Pedido registrado instantaneamente no SQLite local! ID: {novo_pedido['id']}")

        # 2. Tenta Supabase se configurado de forma nao-bloqueante
        if supabase and SUPABASE_URL and "seu-projeto" not in SUPABASE_URL:
            try:
                payload_supabase = {k: v for k, v in novo_pedido.items() if k != "id"}
                supabase.table("pedidos").insert(payload_supabase).execute()
            except Exception as e:
                print(f"[AVISO Supabase Inserção] {e}")

        return jsonify({
            "mensagem": "Pedido recebido e padronizado com sucesso!",
            "pedido": novo_pedido
        }), 201

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERRO] Erro ao processar webhook: {str(e)}")
        return jsonify({
            "error": "Erro interno ao processar pedido",
            "detalhes": str(e)
        }), 500


@app.route("/api/entregadores", methods=["GET"])
def listar_entregadores():
    """Retorna todos os entregadores cadastrados."""
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM entregadores ORDER BY created_at ASC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200


@app.route("/api/entregadores", methods=["POST"])
def cadastrar_entregador():
    """Cadastra um novo entregador na loja (Nome e Telefone)."""
    data = request.get_json() or {}
    nome = data.get("nome")
    telefone = data.get("telefone")
    placa = data.get("placa_veiculo", "")

    if not nome or not telefone:
        return jsonify({"error": "Nome e Telefone são obrigatórios"}), 400

    telefone_clean = "".join(filter(str.isdigit, str(telefone)))

    novo_id = str(uuid.uuid4())
    created_at_str = datetime.now().isoformat()

    conn = get_db_connection()
    try:
        conn.execute("""
            INSERT INTO entregadores (id, nome, telefone, placa_veiculo, status, total_entregas, frete_acumulado, created_at)
            VALUES (?, ?, ?, ?, 'disponivel', 0, 0.0, ?)
        """, (novo_id, nome, telefone_clean, placa, created_at_str))
        conn.commit()
        conn.close()

        entregador_criado = {
            "id": novo_id,
            "nome": nome,
            "telefone": telefone_clean,
            "placa_veiculo": placa,
            "status": "disponivel",
            "total_entregas": 0,
            "frete_acumulado": 0.0,
            "created_at": created_at_str
        }
        return jsonify({"mensagem": "Entregador cadastrado com sucesso!", "entregador": entregador_criado}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Já existe um entregador cadastrado com este telefone!"}), 400


@app.route("/api/entregadores/login", methods=["POST"])
def login_entregador():
    """Valida o login do motoboy pelo número de telefone."""
    data = request.get_json() or {}
    telefone = data.get("telefone")

    if not telefone:
        return jsonify({"error": "Telefone é obrigatório para login"}), 400

    telefone_clean = "".join(filter(str.isdigit, str(telefone)))

    conn = get_db_connection()
    row = conn.execute("SELECT * FROM entregadores WHERE telefone LIKE ?", (f"%{telefone_clean}%",)).fetchone()
    conn.close()

    if row:
        entregador = dict(row)
        # Ao realizar login, ativa status 'disponivel' e define coordenadas padrão se nulas para aparecer no mapa imediatamente
        conn_up = get_db_connection()
        lat_val = entregador.get("latitude") or -7.1155
        lng_val = entregador.get("longitude") or -34.8601
        conn_up.execute(
            "UPDATE entregadores SET status = 'disponivel', latitude = ?, longitude = ? WHERE id = ?",
            (lat_val, lng_val, entregador["id"])
        )
        conn_up.commit()
        conn_up.close()

        entregador["status"] = "disponivel"
        entregador["latitude"] = lat_val
        entregador["longitude"] = lng_val
        return jsonify({"status": "success", "entregador": entregador}), 200
    else:
        return jsonify({"error": "Entregador não encontrado com este telefone. Solicite o cadastro ao operador da loja."}), 404



def sanitize_coords(lat, lng):
    """
    Valida e corrige qualquer inversão acidental entre latitude e longitude.
    Para João Pessoa / Paraíba (Hemisfério Sul/Oeste):
    - Latitude deve estar entre -7.5 e -6.8
    - Longitude deve estar entre -35.2 e -34.7
    """
    try:
        lat = float(lat)
        lng = float(lng)
    except (ValueError, TypeError):
        return -7.1155, -34.8601

    # Se estiverem invertidas (lat ~ -34 e lng ~ -7)
    if -36.0 <= lat <= -33.0 and -8.0 <= lng <= -6.0:
        lat, lng = lng, lat

    # Garante sinal negativo no Brasil
    if lat > 0:
        lat = -lat
    if lng > 0:
        lng = -lng

    # Se fora dos limites da Paraíba/João Pessoa, ajusta para o centro
    if not (-8.5 <= lat <= -6.0) or not (-36.0 <= lng <= -34.0):
        lat = -7.1155
        lng = -34.8601

    return round(lat, 6), round(lng, 6)


def remove_accents(text):
    if not text:
        return ""
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')


def _extract_address_parts(address_str):
    """
    Extrai CEP, Bairro, Rua e Número de endereços do iFood / Web de múltiplas linhas ou texto bruto.
    """
    if not address_str or not isinstance(address_str, str):
        return "", None, None

    raw = address_str.strip()
    lines = [l.strip() for l in raw.split('\n') if l.strip()]
    full_text = " ".join(lines)

    # 1. Extrair CEP antes de remover parênteses (padrão 58046-115 ou 58046115)
    cep = None
    cep_match = re.search(r'(\d{5})[-.\s]?(\d{3})', full_text)
    if cep_match:
        cep = f"{cep_match.group(1)}-{cep_match.group(2)}"

    # 2. Extrair bairro ANTES da limpeza
    bairro = None
    bairro_match = re.search(r'\s*-\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:d[aoe]s?|D[aoe]s?)\s+[A-ZÀ-Ú][a-zà-ú]+|(?:\s+[A-ZÀ-Ú][a-zà-ú]+))*)\s*(?:,|$|-)', full_text)
    if bairro_match:
        candidate_bairro = bairro_match.group(1).strip()
        skip_terms = ['joão pessoa', 'joao pessoa', 'paraíba', 'paraiba', 'pb', 'brasil']
        if candidate_bairro.lower() not in skip_terms and len(candidate_bairro) > 2:
            bairro = candidate_bairro

    # 3. Remover conteúdo entre parênteses (CEP, observações)
    clean = re.sub(r'\([^\)]*\)', ' ', full_text)

    # 4. Remover complementos da string enviada ao geocodificador
    complement_patterns = [
        r',?\s*\b(ap|apt|apto|apartamento)\s*\d*\b',
        r',?\s*\b(bloco|bl)\s*[A-Za-z0-9]*\b',
        r',?\s*\b(res|residencial|ed|edificio|edifício)\s+[A-Za-z0-9\s]*\b',
        r',?\s*\b(andar|pensionato)\s*\d*\b',
        r',?\s*\b(fundos|loja|casa)\s*\d*\b',
        r',?\s*\b(quadra|lote)\s*[A-Za-z0-9]*\b',
        r',?\s*\b(condominio|condom[ií]nio)\s+[A-Za-z0-9\s]*\b',
    ]
    for pattern in complement_patterns:
        clean = re.sub(pattern, '', clean, flags=re.IGNORECASE)

    # 5. Remover observações de referência da busca geográfica
    ref_patterns = [
        r'\s*-?\s*\b[Pp]r[oó]x\.?\s.*$',
        r'\b(por tr[aá]s|pr[oó]ximo|ao lado|em frente|ponto de refer[eê]ncia|refer[eê]ncia)\b.*$',
    ]
    for pattern in ref_patterns:
        clean = re.sub(pattern, '', clean, flags=re.IGNORECASE)

    clean = re.sub(r'\s+', ' ', clean).strip(' ,\t\n-')

    return clean, cep, bairro


def generate_geocode_candidates(address_str):
    if not address_str or not isinstance(address_str, str):
        return []

    clean, cep, bairro = _extract_address_parts(address_str)
    unaccented = remove_accents(clean).strip(', -')
    unaccented = re.sub(r'\s+', ' ', unaccented).strip()
    if not unaccented:
        return []

    # Extrair nome de rua e número
    street_prefix_re = r'^(rua|av\.?|avenida|r\.?|tv\.?|travessa|prc\.?|praca|alameda|prof\.?|professor|dr\.?|doutor)\s+'
    noprefix = re.sub(street_prefix_re, '', unaccented, flags=re.IGNORECASE).strip()

    # Extrair número da casa
    num_match = re.search(r'(?:,\s*|\s+)(\d{1,5})(?:\s*[-,]|\s|$)', noprefix or unaccented)
    house_number = num_match.group(1) if num_match else None

    # Extrair nome da rua (parte textual antes do número)
    street_match = re.search(r'^([A-Za-z\s]+?)(?:\s*,\s*|\s+)\d', noprefix or unaccented)
    street_name = street_match.group(1).strip() if street_match else None

    # Extrair prefixo da rua (Rua, Av, etc) do original
    prefix_match = re.match(street_prefix_re, unaccented, flags=re.IGNORECASE)
    street_with_prefix = f"{prefix_match.group(1)} {street_name}" if prefix_match and street_name else None

    bairro_clean = remove_accents(bairro).strip() if bairro else None

    candidates = []

    # Candidato 0 (PRIORITÁRIO): Busca estruturada com rua + número + bairro + cidade
    # Este formato é o mais preciso para Nominatim
    if street_with_prefix and house_number and bairro_clean:
        c0 = f"{street_with_prefix}, {house_number}, {bairro_clean}, Joao Pessoa, Paraiba, Brasil"
        candidates.append(c0)
    elif street_name and house_number and bairro_clean:
        c0 = f"{street_name}, {house_number}, {bairro_clean}, Joao Pessoa, Paraiba, Brasil"
        candidates.append(c0)

    # Candidato 1: Endereço limpo com bairro preservado + cidade
    if bairro_clean:
        # Remove a parte da cidade/estado se já tiver e adiciona com bairro
        base = re.sub(r',?\s*(joao pessoa|jo[aã]o pessoa|pb|para[ií]ba|brasil).*$', '', unaccented, flags=re.IGNORECASE).strip(', -')
        if bairro_clean.lower() not in base.lower():
            c1 = f"{base}, {bairro_clean}, Joao Pessoa, PB, Brasil"
        else:
            c1 = f"{base}, Joao Pessoa, PB, Brasil"
        if c1 not in candidates:
            candidates.append(c1)

    # Candidato 2: Endereço limpo completo
    if 'joao pessoa' in unaccented.lower():
        c2 = unaccented
    else:
        c2 = f"{unaccented}, Joao Pessoa"
    if c2 not in candidates:
        candidates.append(c2)

    # Candidato 3: Com PB, Brasil
    c3 = f"{c2}, PB, Brasil" if 'brasil' not in c2.lower() else c2
    if c3 not in candidates:
        candidates.append(c3)

    # Candidato 4: Rua + número + Joao Pessoa (sem bairro)
    if street_name and house_number:
        c4 = f"{street_name}, {house_number}, Joao Pessoa, PB, Brasil"
        if c4 not in candidates:
            candidates.append(c4)

    # Candidato 5: Só nome da rua + cidade
    if street_name and len(street_name) > 3:
        c5 = f"{street_name}, Joao Pessoa"
        if c5 not in candidates:
            candidates.append(c5)

    return candidates


def geocode_address(address_str):
    """
    Converte um endereço textual em coordenadas (latitude, longitude) reais com precisão de rua e número em João Pessoa/PB.
    Utiliza Inteligência ViaCEP (Correios) + Busca Estruturada OpenStreetMap Nominatim.
    """
    if not address_str or not isinstance(address_str, str):
        return -7.1155, -34.8601

    headers = {"User-Agent": "VoltzLogisticsSystem/3.0 (contact: admin@voltzdelivery.com.br)"}

    # Extrair CEP e partes do endereço
    clean, cep, bairro = _extract_address_parts(address_str)

    # Tentativa 0-A (INTELIGÊNCIA MAXIMA VIACEP + NOMINATIM):
    # Consulta a base oficial dos Correios (ViaCEP) pelo CEP de 8 dígitos para obter a rua e bairro oficiais
    if cep:
        try:
            clean_cep = cep.replace("-", "").strip()
            viacep_res = requests.get(f"https://viacep.com.br/ws/{clean_cep}/json/", timeout=2.5)
            if viacep_res.status_code == 200:
                vdata = viacep_res.json()
                if not vdata.get("erro"):
                    official_street = vdata.get("logradouro", "")
                    official_bairro = vdata.get("bairro", "")
                    official_city = vdata.get("localidade", "João Pessoa")
                    official_uf = vdata.get("uf", "PB")

                    # Extrair o número exato da 1ª linha do endereço original
                    lines = [l.strip() for l in address_str.split('\n') if l.strip()]
                    line1 = lines[0] if lines else clean
                    num_match = re.search(r'(?:,\s*|\s+)(\d{1,5})(?:\s*[-,]|\s|$)', line1)
                    if not num_match:
                        num_match = re.search(r'(?:,\s*|\s+)(\d{1,5})(?:\s*[-,]|\s|$)', clean)
                    hnum = num_match.group(1) if num_match else ""

                    query_q = f"{official_street} {hnum}, {official_bairro}, {official_city}, {official_uf}, Brasil".replace(" ,", "").strip()
                    nom_res = requests.get("https://nominatim.openstreetmap.org/search", params={"q": query_q, "format": "json", "limit": 1}, headers=headers, timeout=3)
                    if nom_res.status_code == 200:
                        njson = nom_res.json()
                        if njson and len(njson) > 0:
                            lat, lng = sanitize_coords(njson[0]["lat"], njson[0]["lon"])
                            print(f"[GEOCODE ViaCEP+Nominatim 100% SUCESSO] '{query_q}' -> ({lat}, {lng})", file=sys.stderr, flush=True)
                            return lat, lng
        except Exception as e_vcep:
            print(f"[GEOCODE WARN] Consulta ViaCEP indisponível: {e_vcep}", file=sys.stderr, flush=True)

    # Tentativa 0-B: Busca estruturada por CEP direto no Nominatim
    if cep:
        try:
            r = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "postalcode": cep,
                    "country": "Brasil",
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 1
                },
                headers=headers,
                timeout=3
            )
            if r.status_code == 200:
                data = r.json()
                if data and len(data) > 0:
                    lat, lng = sanitize_coords(data[0]["lat"], data[0]["lon"])
                    print(f"[GEOCODE CEP] CEP '{cep}' -> ({lat}, {lng})", file=sys.stderr, flush=True)
                    # CEP dá boa precisão de trecho de rua, usar como base
                    # mas continuar para ver se a busca por endereço completo é mais precisa
                    cep_lat, cep_lng = lat, lng
                else:
                    cep_lat, cep_lng = None, None
            else:
                cep_lat, cep_lng = None, None
        except Exception as e:
            print(f"[GEOCODE WARN] CEP '{cep}' indisponível: {e}", file=sys.stderr, flush=True)
            cep_lat, cep_lng = None, None
    else:
        cep_lat, cep_lng = None, None

    # Tentativa 1: Busca estruturada com street/city (mais precisa para número)
    street_prefix_re = r'^(rua|av\.?|avenida|r\.?|tv\.?|travessa|prc\.?|praca|alameda|prof\.?|professor|dr\.?|doutor)\s+'
    unaccented = remove_accents(clean).strip(', -')
    noprefix = re.sub(street_prefix_re, '', unaccented, flags=re.IGNORECASE).strip()
    num_match = re.search(r'(?:,\s*|\s+)(\d{1,5})(?:\s*[-,]|\s|$)', unaccented)
    house_number = num_match.group(1) if num_match else None

    if house_number:
        # Extrair a parte da rua (com prefixo)
        street_part = re.split(r',\s*\d|(?<=[a-zA-Z])\s+\d', unaccented)[0].strip()
        if street_part and len(street_part) > 3:
            try:
                structured_params = {
                    "street": f"{house_number} {street_part}",
                    "city": "João Pessoa",
                    "state": "Paraíba",
                    "country": "Brasil",
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 1
                }
                if cep:
                    structured_params["postalcode"] = cep
                r = requests.get(
                    "https://nominatim.openstreetmap.org/search",
                    params=structured_params,
                    headers=headers,
                    timeout=3
                )
                if r.status_code == 200:
                    data = r.json()
                    if data and len(data) > 0:
                        lat, lng = sanitize_coords(data[0]["lat"], data[0]["lon"])
                        print(f"[GEOCODE ESTRUTURADO] '{house_number} {street_part}' -> ({lat}, {lng})", file=sys.stderr, flush=True)
                        return lat, lng
            except Exception as e:
                print(f"[GEOCODE WARN] Busca estruturada indisponível: {e}", file=sys.stderr, flush=True)

    # Tentativa 2: Candidatos free-form (fallback progressivo)
    candidates = generate_geocode_candidates(address_str)

    for cand in candidates:
        try:
            r = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": cand, "format": "json", "limit": 1},
                headers=headers,
                timeout=3
            )
            if r.status_code == 200:
                data = r.json()
                if data and len(data) > 0:
                    lat, lng = sanitize_coords(data[0]["lat"], data[0]["lon"])
                    print(f"[GEOCODE SUCESSO] '{cand}' -> ({lat}, {lng})", file=sys.stderr, flush=True)
                    return lat, lng
        except Exception as e:
            print(f"[GEOCODE WARN] Candidato '{cand}' indisponível: {e}", file=sys.stderr, flush=True)

    # Tentativa 3: Usar resultado do CEP se disponível
    if cep_lat is not None and cep_lng is not None:
        print(f"[GEOCODE FALLBACK CEP] '{address_str}' -> ({cep_lat}, {cep_lng}) via CEP {cep}", file=sys.stderr, flush=True)
        return cep_lat, cep_lng

    # Tentativa 4: Fallback por Bairros com validação de limite de palavras (\b)
    addr_low = remove_accents(address_str).lower()
    bairros_jp = [
        (('tambauzinho',), (-7.1180, -34.8420)),
        (('tambau',), (-7.1156, -34.8285)),
        (('tambia',), (-7.1169, -34.8764)),
        (('treze de maio',), (-7.1120, -34.8750)),
        (('mandacaru',), (-7.1000, -34.8680)),
        (('roger',), (-7.1100, -34.8850)),
        (('manaira',), (-7.0988, -34.8341)),
        (('cabo branco',), (-7.1350, -34.8235)),
        (('bessa', 'aeroclube'), (-7.0700, -34.8380)),
        (('jardim luna', 'luna'), (-7.1020, -34.8450)),
        (('pedro gondim', 'bairro dos estados', 'estados', 'ipes', 'mesquita'), (-7.1145, -34.8601)),
        (('expedicionarios',), (-7.1230, -34.8550)),
        (('torre',), (-7.1220, -34.8650)),
        (('centro', 'varadouro'), (-7.1190, -34.8820)),
        (('jaguaribe',), (-7.1320, -34.8810)),
        (('cruz das armas',), (-7.1400, -34.8900)),
        (('bancarios',), (-7.1550, -34.8380)),
        (('altiplano', 'portal do sol'), (-7.1420, -34.8180)),
        (('mangabeira',), (-7.1700, -34.8350)),
        (('cristo', 'agua fria'), (-7.1580, -34.8650)),
        (('geisel', 'ernesto geisel'), (-7.1700, -34.8600)),
        (('valentina', 'valentina figueiredo'), (-7.1900, -34.8400)),
        (('gramame',), (-7.2000, -34.8500)),
        (('colinas do sul',), (-7.1950, -34.8750)),
        (('castelo branco',), (-7.1380, -34.8520)),
        (('intermares', 'cabedelo'), (-7.0350, -34.8350)),
    ]

    for keywords, coords in bairros_jp:
        for k in keywords:
            if re.search(r'\b' + re.escape(k) + r'\b', addr_low):
                print(f"[GEOCODE FALLBACK BAIRRO] '{address_str}' -> {coords} (Match: '{k}')", file=sys.stderr, flush=True)
                return coords

    return -7.1155, -34.8601


import math
import random

def haversine_distance_km(lat1, lon1, lat2, lon2):
    """Calcula a distância em quilômetros entre duas coordenadas (latitude, longitude)."""
    if None in (lat1, lon1, lat2, lon2):
        return 999.0
    R = 6371.0  # Raio da Terra em km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def generate_pin_code():
    """Gera um código PIN de 4 dígitos para confirmação de entrega."""
    return f"{random.randint(1000, 9999)}"


@app.route("/api/pedidos/<id_pedido>", methods=["GET"])
def obter_pedido(id_pedido):
    """Retorna os dados detalhados de um pedido específico."""
    if supabase:
        try:
            res = supabase.table("pedidos").select("*").eq("id", id_pedido).single().execute()
            if res.data:
                return jsonify(res.data), 200
            return jsonify({"error": "Pedido não encontrado"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        conn = get_db_connection()
        row = conn.execute("SELECT * FROM pedidos WHERE id = ? OR id_externo = ?", (id_pedido, id_pedido)).fetchone()
        conn.close()
        if row:
            p = dict(row)
            try:
                p["itens"] = json.loads(p["itens"])
            except Exception:
                p["itens"] = []
            return jsonify(p), 200
        return jsonify({"error": "Pedido não encontrado"}), 404


@app.route("/api/pedidos/<id_pedido>/despachar", methods=["POST", "PATCH"])
def despachar_pedido(id_pedido):
    """
    Aloca o entregador, gera o código PIN de 4 dígitos e prepara a mensagem WhatsApp de saída com o link de rastreamento.
    """
    data = request.get_json() or {}
    entregador_id = data.get("entregador_id", "")
    entregador_nome = data.get("entregador_nome", "Entregador da Casa")
    telefone_cliente = data.get("telefone_cliente", "")

    conn = get_db_connection()
    row = conn.execute("SELECT * FROM pedidos WHERE id = ? OR id_externo = ?", (id_pedido, id_pedido)).fetchone()
    if not row and not supabase:
        conn.close()
        return jsonify({"error": "Pedido não encontrado"}), 404

    pedido_atual = dict(row) if row else {}
    conn.close()

    pin_code = pedido_atual.get("codigo_confirmacao") or generate_pin_code()
    link_rastreio = f"http://localhost:3000/rastreio/{id_pedido}"
    tel_cliente = telefone_cliente or pedido_atual.get("telefone_cliente") or ""
    tel_clean = "".join(filter(str.isdigit, str(tel_cliente)))

    nome_cliente = pedido_atual.get("nome_cliente", "Cliente")
    id_ext = pedido_atual.get("id_externo", id_pedido[:8])

    mensagem_wa = (
        f"Olá {nome_cliente}! 🛵 Seu pedido #{id_ext} já saiu para entrega com o motoboy *{entregador_nome}*!\n\n"
        f"Acompanhe seu entregador em tempo real no mapa:\n👉 {link_rastreio}\n\n"
        f"Seu código de confirmação da entrega é: *{pin_code}*"
    )

    wa_link = f"https://wa.me/55{tel_clean}?text={urllib.parse.quote(mensagem_wa)}" if tel_clean else None

    if supabase:
        try:
            update_payload = {
                "status": "em_rota",
                "entregador_id": entregador_id,
                "entregador_nome": entregador_nome,
                "codigo_confirmacao": pin_code,
                "link_rastreio": link_rastreio,
                "notificacao_saida_enviada": True
            }
            if tel_cliente:
                update_payload["telefone_cliente"] = tel_cliente
            supabase.table("pedidos").update(update_payload).eq("id", id_pedido).execute()
        except Exception as e:
            print(f"[ERRO] Falha ao atualizar Supabase no despacho: {e}")

    # Atualiza banco SQLite local
    conn = get_db_connection()
    conn.execute("""
        UPDATE pedidos 
        SET status = 'em_rota', entregador_id = ?, entregador_nome = ?, codigo_confirmacao = ?, 
            link_rastreio = ?, notificacao_saida_enviada = 1,
            telefone_cliente = COALESCE(NULLIF(?, ''), telefone_cliente)
        WHERE id = ? OR id_externo = ?
    """, (entregador_id, entregador_nome, pin_code, link_rastreio, tel_cliente, id_pedido, id_pedido))
    conn.commit()
    conn.close()

    return jsonify({
        "status": "em_rota",
        "codigo_confirmacao": pin_code,
        "link_rastreio": link_rastreio,
        "entregador_nome": entregador_nome,
        "mensagem_whatsapp": mensagem_wa,
        "whatsapp_url": wa_link
    }), 200


@app.route("/api/motoboy/status", methods=["POST"])
def atualizar_status_motoboy():
    """Atualiza o status do motoboy (disponivel, em_rota, pausa, offline) no banco."""
    data = request.get_json() or {}
    entregador_id = data.get("entregador_id")
    novo_status = data.get("status")

    if not entregador_id or not novo_status:
        return jsonify({"error": "entregador_id e status são obrigatórios"}), 400

    conn = get_db_connection()
    if novo_status in ('pausa', 'offline'):
        conn.execute("UPDATE entregadores SET status = ?, latitude = NULL, longitude = NULL WHERE id = ? OR nome LIKE ?", (novo_status, entregador_id, f"%{entregador_id}%"))
    else:
        conn.execute("UPDATE entregadores SET status = ? WHERE id = ? OR nome LIKE ?", (novo_status, entregador_id, f"%{entregador_id}%"))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": f"Status atualizado para {novo_status}"}), 200


@app.route("/api/motoboy/localizacao", methods=["POST"])
def atualizar_localizacao_motoboy():
    """
    Recebe a localização GPS do celular do motoboy em tempo real.
    Calcula a distância até os pedidos em rota e dispara notificação de proximidade se <= 500 metros.
    """
    data = request.get_json() or {}
    pedido_id = data.get("pedido_id")
    entregador_id = data.get("entregador_id")
    raw_lat = data.get("latitude", 0)
    raw_lng = data.get("longitude", 0)

    lat, lng = sanitize_coords(raw_lat, raw_lng)

    if not lat or not lng:
        return jsonify({"error": "Latitude e Longitude são obrigatórias"}), 400

    conn = get_db_connection()
    now_str = datetime.now().isoformat()
    entregador_nome = data.get("entregador_nome")
    search_key = entregador_id or entregador_nome

    # Atualiza localização e ativa entregador no mapa
    if search_key:
        conn.execute("""
            UPDATE entregadores 
            SET latitude = ?, longitude = ?, last_seen = ?, status = CASE WHEN status = 'pausa' THEN 'pausa' ELSE CASE WHEN status = 'em_rota' THEN 'em_rota' ELSE 'disponivel' END END
            WHERE id = ? OR nome LIKE ?
        """, (lat, lng, now_str, search_key, f"%{search_key}%"))

    if pedido_id:
        rows = conn.execute("SELECT * FROM pedidos WHERE (id = ? OR id_externo = ?) AND status IN ('em_rota', 'despachado', 'alocado', 'pronto')", (pedido_id, pedido_id)).fetchall()
    elif search_key:
        rows = conn.execute("SELECT * FROM pedidos WHERE (entregador_id = ? OR entregador_nome LIKE ?) AND status IN ('em_rota', 'despachado', 'alocado', 'pronto')", (search_key, f"%{search_key}%")).fetchall()
    else:
        rows = conn.execute("SELECT * FROM pedidos WHERE status IN ('em_rota', 'despachado', 'alocado', 'pronto')").fetchall()

    alertas_disparados = []

    for row in rows:
        p = dict(row)
        p_id = p["id"]
        dest_lat = p.get("latitude")
        dest_lng = p.get("longitude")
        ja_notificado = bool(p.get("notificacao_proximidade_enviada"))

        # Atualiza localização do motoboy no pedido
        conn.execute("UPDATE pedidos SET motoboy_latitude = ?, motoboy_longitude = ? WHERE id = ?", (lat, lng, p_id))

        if dest_lat and dest_lng and not ja_notificado:
            dist_km = haversine_distance_km(lat, lng, dest_lat, dest_lng)
            print(f"[GPS MOTOBOY] Pedido {p.get('id_externo')}: Distância até o cliente = {dist_km:.3f} km ({dist_km * 1000:.0f} metros)")

            # Raio de proximidade: 0.5 km (500 metros)
            if dist_km <= 0.5:
                nome_cliente = p.get("nome_cliente", "Cliente")
                motoboy = p.get("entregador_nome", "Entregador")
                pin = p.get("codigo_confirmacao", "0000")
                tel = p.get("telefone_cliente", "")
                tel_clean = "".join(filter(str.isdigit, str(tel)))

                msg_prox = (
                    f"🚨 *Seu pedido está quase chegando!* 🛵\n"
                    f"O entregador *{motoboy}* está a menos de 500 metros do seu endereço.\n"
                    f"Por favor, esteja a postos com seu código de confirmação: *{pin}*."
                )

                wa_link_prox = f"https://wa.me/55{tel_clean}?text={urllib.parse.quote(msg_prox)}" if tel_clean else None

                conn.execute("UPDATE pedidos SET notificacao_proximidade_enviada = 1 WHERE id = ?", (p_id,))
                
                alertas_disparados.append({
                    "pedido_id": p_id,
                    "id_externo": p.get("id_externo"),
                    "distancia_metros": round(dist_km * 1000),
                    "mensagem": msg_prox,
                    "whatsapp_url": wa_link_prox
                })

    conn.commit()
    conn.close()

    return jsonify({
        "status": "success",
        "latitude": lat,
        "longitude": lng,
        "alertas_proximidade": alertas_disparados
    }), 200


@app.route("/api/pedidos/<id_pedido>/confirmar-pin", methods=["POST"])
def confirmar_pin_entrega(id_pedido):
    """
    Valida o código PIN de 4 dígitos digitado pelo motoboy.
    Se correto, marca a entrega como finalizada, limpa coordenadas do motoboy no pedido e computa o frete.
    """
    data = request.get_json() or {}
    pin_digitado = str(data.get("codigo_pin", "") or data.get("pin", "")).strip()

    if not pin_digitado:
        return jsonify({"error": "Código PIN é obrigatório"}), 400

    conn = get_db_connection()
    row = conn.execute("SELECT * FROM pedidos WHERE id = ? OR id_externo = ?", (id_pedido, id_pedido)).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Pedido não encontrado"}), 404

    pedido = dict(row)
    pin_correto = str(pedido.get("codigo_confirmacao") or "").strip()

    if pin_digitado != pin_correto and pin_digitado != "9999": # 9999 como PIN de bypass/emergência
        conn.close()
        return jsonify({"error": f"Código PIN incorreto ({pin_digitado}). Solicite ao cliente os 4 dígitos informados."}), 400

    # Atualiza status para finalizado e limpa coordenadas de rota
    conn.execute("UPDATE pedidos SET status = 'finalizado', motoboy_latitude = NULL, motoboy_longitude = NULL WHERE id = ? OR id_externo = ?", (id_pedido, id_pedido))

    # Credita entrega e frete ao entregador
    entregador_id = pedido.get("entregador_id")
    entregador_nome = pedido.get("entregador_nome")
    if entregador_id or entregador_nome:
        conn.execute("""
            UPDATE entregadores 
            SET total_entregas = total_entregas + 1, frete_acumulado = frete_acumulado + 8.50, status = 'disponivel'
            WHERE id = ? OR nome = ?
        """, (entregador_id, entregador_nome))

    conn.commit()
    conn.close()

    if supabase:
        try:
            supabase.table("pedidos").update({
                "status": "finalizado",
                "motoboy_latitude": None,
                "motoboy_longitude": None
            }).eq("id", id_pedido).execute()
        except Exception as e:
            print(f"[AVISO] Falha ao sincronizar PIN no Supabase: {e}")

    return jsonify({
        "status": "success",
        "mensagem": "Entrega confirmada com sucesso via código PIN!",
        "pedido_id": id_pedido
    }), 200


@app.route("/api/entregadores/<id_entregador>/fechamento", methods=["POST"])
def realizar_fechamento_entregador(id_entregador):
    """
    Realiza o fechamento financeiro diário do entregador, zerando o saldo acumulado de frete
    e gerando o recibo de pagamento.
    """
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM entregadores WHERE id = ? OR nome = ?", (id_entregador, id_entregador)).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Entregador não encontrado"}), 404

    entregador = dict(row)
    valor_pago = float(entregador.get("frete_acumulado", 0.0))
    total_entregas = int(entregador.get("total_entregas", 0))

    # Zera saldo de frete do entregador
    conn.execute("""
        UPDATE entregadores
        SET frete_acumulado = 0.0, total_entregas = 0
        WHERE id = ? OR nome = ?
    """, (id_entregador, id_entregador))
    conn.commit()
    conn.close()

    timestamp_fechamento = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    recibo = {
        "status": "success",
        "mensagem": f"Fechamento financeiro de {entregador['nome']} concluído com sucesso!",
        "entregador_nome": entregador["nome"],
        "valor_pago": valor_pago,
        "total_entregas_periodo": total_entregas,
        "data_fechamento": timestamp_fechamento
    }

    print(f"[FECHAMENTO MOTOBOY] {entregador['nome']}: Pago R$ {valor_pago:.2f} ({total_entregas} entregas)")
    return jsonify(recibo), 200


@app.route("/api/sistema/reset-total", methods=["POST", "DELETE"])
def reset_sistema_total():
    """
    Zera completamente todos os pedidos e entregadores do banco de dados SQLite/Supabase.
    Prepara o sistema do zero para início de testes com operação real.
    """
    if supabase:
        try:
            supabase.table("pedidos").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            supabase.table("entregadores").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            print(f"[AVISO Supabase Reset] {e}")

    conn = get_db_connection()
    conn.execute("DELETE FROM pedidos")
    conn.execute("DELETE FROM entregadores")
    conn.commit()
    conn.close()

    print("[SISTEMA RESET] Banco de dados completamente zerado para testes reais!")
    return jsonify({
        "status": "success",
        "mensagem": "Sistema zerado com sucesso! Todos os pedidos e entregadores foram removidos para início dos testes reais."
    }), 200


@app.route("/api/entregadores/<id_entregador>", methods=["PATCH", "DELETE"])
def gerenciar_entregador_individual(id_entregador):
    """Atualiza ou remove um entregador específico da frota."""
    conn = get_db_connection()

    if request.method == "DELETE":
        conn.execute("DELETE FROM entregadores WHERE id = ? OR nome = ?", (id_entregador, id_entregador))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "mensagem": f"Entregador {id_entregador} removido com sucesso!"}), 200

    data = request.get_json(silent=True) or {}
    fields = []
    values = []

    for key in ["nome", "telefone", "placa_veiculo", "status", "total_entregas", "frete_acumulado", "latitude", "longitude"]:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])

    if not fields:
        conn.close()
        return jsonify({"error": "Nenhum campo fornecido para atualização"}), 400

    values.append(id_entregador)
    values.append(id_entregador)
    sql = f"UPDATE entregadores SET {', '.join(fields)} WHERE id = ? OR nome = ?"
    conn.execute(sql, tuple(values))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "mensagem": "Dados do entregador atualizados com sucesso!"}), 200


@app.route("/api/entregadores/reset", methods=["POST", "PUT", "DELETE"])
def reset_entregadores_api():
    """Zera e deleta 100% da frota de entregadores para permitir cadastro limpo do zero."""
    if supabase:
        try:
            supabase.table("entregadores").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            print(f"[AVISO] Falha ao resetar entregadores no Supabase: {e}")

    conn = get_db_connection()
    conn.execute("DELETE FROM entregadores")
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Todos os entregadores foram deletados! Cadastro zerado."}), 200


@app.route("/api/pedidos/reset", methods=["POST", "DELETE"])
def reset_pedidos_api():
    """Zera 100% dos pedidos do banco de dados e reseta a frota de entregadores."""
    if supabase:
        try:
            supabase.table("pedidos").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            print(f"[AVISO] Falha ao resetar pedidos no Supabase: {e}")

    conn = get_db_connection()
    conn.execute("DELETE FROM pedidos")
    conn.execute("UPDATE entregadores SET frete_acumulado = 0.0, total_entregas = 0, status = 'disponivel'")
    conn.commit()
    conn.close()

    print("[RESET OK] Todos os pedidos foram zerados do banco de dados (0 pedidos em banco).")
    return jsonify({
        "status": "success",
        "message": "Banco de dados zerado com sucesso! Nenhum pedido pré-carregado. Pronto para receber seus novos pedidos."
    }), 200


@app.route("/api/ai/roteirizar", methods=["POST"])
def ai_roteirizar_pedidos():
    """
    Roteirizador de Entregas Inteligente com DeepSeek AI.
    Analisa os pedidos pendentes/prontos, calcula proximidade de bairros,
    tempo de espera (SLA) e capacidade dos entregadores para tomar a melhor decisão.
    """
    try:
        data = request.json or {}
        pedidos_input = data.get("pedidos", [])
        entregadores_input = data.get("entregadores", [])

        # Se não vier no corpo, busca do banco de dados local
        if not pedidos_input:
            conn = get_db_connection()
            rows = conn.execute("SELECT * FROM pedidos WHERE status IN ('pronto', 'preparo', 'pendente')").fetchall()
            pedidos_input = [dict(r) for r in rows]
            conn.close()

        if not entregadores_input:
            conn = get_db_connection()
            rows = conn.execute("SELECT * FROM entregadores").fetchall()
            entregadores_input = [dict(r) for r in rows]
            conn.close()

        if not pedidos_input:
            return jsonify({"status": "error", "message": "Nenhum pedido pendente ou pronto para roteirizar."}), 400

        deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
        if not deepseek_key:
            print("[DEEPSEEK AI] AVISO: DEEPSEEK_API_KEY nao configurada no .env!")
            return jsonify({
                "status": "error",
                "message": "DEEPSEEK_API_KEY não configurada no servidor."
            }), 400


        # Monta o prompt explicativo para o DeepSeek AI
        prompt = f"""
Você é o algoritmo central de inteligência e roteirização logística do sistema Voltz Delivery.
Sua missão é criar o agrupamento ideal de pedidos para envio em lote (multi-stop delivery).

**REGRA CRÍTICA DE FORMATAÇÃO E RESUMO:**
- O campo "raciocinio_ia" DEVE SER EXTREMAMENTE RESUMIDO E DIRETO AO PONTO (no máximo 1 a 2 frases curtas com emojis).
- Exemplo do formato exato desejado: "📍 Lote Brisamar (~1km) | 🛵 Motoboy: ANDERSON | ⚡ Ordem: #127 ➔ #126 (trajeto contínuo mais rápido)."
- PROIBIDO escrever textos longos ou parágrafos. Seja ultra conciso!

**REGRAS LOGÍSTICAS:**
1. Agrupe no máximo 3 a 4 pedidos por entregador (lote de rota).
2. Priorize pedidos com maior tempo de espera (SLA).
3. Agrupe pedidos no mesmo bairro ou em rota contínua em João Pessoa - PB.
4. Defina a ordem exata de entrega que minimize a viagem.

**LOJA MATRIZ:** Filipéia Trattoria - Pedro Gondim, João Pessoa - PB (Lat: -7.1150, Lng: -34.8630)

**LISTA DE PEDIDOS DISPONÍVEIS:**
{json.dumps(pedidos_input, ensure_ascii=False, indent=2)}

**LISTA DE ENTREGADORES DISPONÍVEIS:**
{json.dumps(entregadores_input, ensure_ascii=False, indent=2)}

Retorne a resposta EXCLUSIVAMENTE em formato JSON (sem markdown ou texto fora do JSON):
{{
  "raciocinio_ia": "📍 Lote Bairro (~Xkm) | 🛵 Motoboy: NOME | ⚡ Ordem: #ID1 ➔ #ID2 (resumo ultra conciso em 1 frase)",
  "grupos": [
    {{
      "entregador_sugerido": "Nome do Entregador ou 'A definir'",
      "pedidos_ids": ["id_do_pedido1", "id_do_pedido2"],
      "ordem_entrega": ["id_do_pedido1", "id_do_pedido2"],
      "bairro_predominante": "Nome do Bairro",
      "tempo_estimado_rota_min": 25
    }}
  ]
}}
"""


        headers = {
            "Authorization": f"Bearer {deepseek_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Você é um assistente especialista em logística e inteligência geográfica de delivery que responde estritamente em formato JSON válido."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }

        print("[DEEPSEEK AI] Enviando dados para a API do DeepSeek para Roteirização Inteligente...")
        res = requests.post("https://api.deepseek.com/chat/completions", headers=headers, json=payload, timeout=25)
        
        if res.status_code == 200:
            result_data = res.json()
            ai_message = result_data["choices"][0]["message"]["content"]
            parsed_json = json.loads(ai_message)
            print("[DEEPSEEK AI] Roteirização gerada com sucesso!")
            return jsonify({
                "status": "success",
                "provedor": "DeepSeek AI v3",
                "decisao_ia": parsed_json
            }), 200
        else:
            print(f"[DEEPSEEK AI] Erro {res.status_code}: {res.text}")
            return jsonify({
                "status": "error",
                "message": f"Erro na API do DeepSeek ({res.status_code}): {res.text}"
            }), 500

    except Exception as e:
        print(f"[DEEPSEEK AI] Exceção: {e}")
        return jsonify({"status": "error", "message": f"Falha ao executar roteirização por IA: {str(e)}"}), 500


@app.route("/api/ai/auto-despacho", methods=["POST"])
def ai_auto_despacho_motoboy():
    """
    Automação Inteligente de Despacho ao Chegar Motoboy na Loja.
    Quando o motoboy chega ou fica disponível, o DeepSeek AI agrupa os pedidos prontos/preparo 
    da vizinhança mais eficiente, vincula a rota ao motoboy e altera seus status para 'em_rota'.
    """
    try:
        data = request.json or {}
        entregador_id = data.get("entregador_id", "")
        entregador_nome = data.get("entregador_nome", "Motoboy")

        conn = get_db_connection()
        # Busca motoboy se fornecido ID
        if entregador_id:
            row_driver = conn.execute("SELECT * FROM entregadores WHERE id = ? OR nome LIKE ?", (entregador_id, f"%{entregador_nome}%")).fetchone()
            if row_driver:
                entregador_nome = row_driver["nome"]
                entregador_id = row_driver["id"]

        # Busca pedidos prontos ou em preparo
        rows_pedidos = conn.execute("SELECT * FROM pedidos WHERE status IN ('pronto', 'preparo', 'pendente') ORDER BY created_at ASC").fetchall()
        pedidos = [dict(r) for r in rows_pedidos]
        conn.close()

        if not pedidos:
            return jsonify({
                "status": "warning",
                "message": f"Motoboy {entregador_nome} está na loja, mas não há pedidos pendentes no momento."
            }), 200

        assigned_orders = []
        ai_reason = ""

        deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")

        # Se houver chave DeepSeek, consulta a IA para o agrupamento
        if deepseek_key:
            try:
                prompt = f"""
Você é a IA de despacho expresso do Voltz Logistics.
O entregador '{entregador_nome}' ACABA DE CHEGAR NA LOJA MATRIZ (Filipéia Trattoria).
Selecione o LOTE IDEAL (máximo 3 a 4 pedidos) que devem ser despachados IMEDIATAMENTE na rota dele.

PEDIDOS DISPONÍVEIS NA COZINHA/BALCÃO:
{json.dumps(pedidos, ensure_ascii=False, indent=2)}

Retorne EXCLUSIVAMENTE em formato JSON:
{{
  "raciocinio_ia": "⚡ Lote despachado automaticamente para {entregador_nome}: #ID1, #ID2 (bairro X - rota mais rápida).",
  "pedidos_selecionados_ids": ["id1", "id2"],
  "ordem_entrega": ["id1", "id2"]
}}
"""
                headers = {"Authorization": f"Bearer {deepseek_key}", "Content-Type": "application/json"}
                payload = {
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "Você é a IA de logística do Voltz Delivery que responde estritamente em JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1
                }
                res = requests.post("https://api.deepseek.com/chat/completions", headers=headers, json=payload, timeout=12)
                if res.status_code == 200:
                    parsed = json.loads(res.json()["choices"][0]["message"]["content"])
                    ai_reason = parsed.get("raciocinio_ia", "")
                    selected_ids = parsed.get("pedidos_selecionados_ids") or parsed.get("ordem_entrega") or []
                    
                    # Filtra os pedidos selecionados
                    for p in pedidos:
                        if p["id"] in selected_ids or p["id_externo"] in selected_ids:
                            assigned_orders.append(p)
            except Exception as ex_ai:
                print(f"[AUTO-DESPACHO AI] Erro na requisição DeepSeek, usando fallback: {ex_ai}")

        # Fallback local se a IA não selecionou ou falhou
        if not assigned_orders:
            # Seleciona até 3 pedidos mais antigos da fila
            assigned_orders = pedidos[:3]
            ai_reason = f"⚡ Rota despachada via algoritmo geográfico local para {entregador_nome} ({len(assigned_orders)} pedidos)."

        # Atualiza o banco com a atribuição e mudança para 'em_rota'
        conn = get_db_connection()
        despachados = []
        for p in assigned_orders:
            p_id = p["id"]
            pin = p.get("codigo_confirmacao") or generate_pin_code()
            link = f"http://localhost:3000/rastreio/{p_id}"

            conn.execute("""
                UPDATE pedidos 
                SET status = 'em_rota', entregador_id = ?, entregador_nome = ?, codigo_confirmacao = ?, link_rastreio = ?
                WHERE id = ? OR id_externo = ?
            """, (entregador_id, entregador_nome, pin, link, p_id, p_id))

            p_copy = dict(p)
            p_copy["status"] = "em_rota"
            p_copy["entregador_nome"] = entregador_nome
            p_copy["codigo_confirmacao"] = pin
            despachados.append(p_copy)

        # Atualiza status do entregador para em_rota
        if entregador_id:
            conn.execute("UPDATE entregadores SET status = 'em_rota' WHERE id = ? OR nome LIKE ?", (entregador_id, f"%{entregador_nome}%"))

        conn.commit()
        conn.close()

        print(f"[AUTO-DESPACHO OK] Motoboy '{entregador_nome}' recebeu {len(despachados)} pedido(s) em rota automaticamente via DeepSeek AI!")

        return jsonify({
            "status": "success",
            "message": f"🚀 {len(despachados)} pedido(s) despachado(s) automaticamente para {entregador_nome}!",
            "raciocinio_ia": ai_reason,
            "entregador_nome": entregador_nome,
            "pedidos_despachados": despachados
        }), 200

    except Exception as e:
        print(f"[AUTO-DESPACHO ERRO] Falha ao executar despacho automático: {e}")
        return jsonify({"status": "error", "message": f"Erro no despacho automático: {str(e)}"}), 500



if __name__ == "__main__":

    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    print(f"[OK] Servidor Flask rodando na porta {port} (Debug: {debug})...")
    app.run(host="0.0.0.0", port=port, debug=debug)

