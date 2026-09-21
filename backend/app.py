import os
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
    """Conecta ao banco de dados SQLite local."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_local_db():
    """Inicializa as tabelas 'pedidos' e 'entregadores' no SQLite local."""
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


    cursor.execute("SELECT COUNT(*) FROM entregadores")
    if cursor.fetchone()[0] == 0:
        default_drivers = [
            (str(uuid.uuid4()), "ANDERSON (Moto 01)", "83999112233", "MOP-1001", "disponivel", 5, 42.50, datetime.now().isoformat()),
            (str(uuid.uuid4()), "ROBERTO (Moto 04)", "83999223344", "MOP-2004", "em_rota", 7, 58.00, datetime.now().isoformat()),
            (str(uuid.uuid4()), "CARLOS (Moto 07)", "83999334455", "MOP-3007", "disponivel", 4, 34.00, datetime.now().isoformat())
        ]
        cursor.executemany("""
            INSERT INTO entregadores (id, nome, telefone, placa_veiculo, status, total_entregas, frete_acumulado, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, default_drivers)

    conn.commit()
    conn.close()


# Garante que a tabela local exista ao iniciar
init_local_db()


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


@app.route("/api/pedidos", methods=["GET"])
def listar_pedidos():
    """Retorna todos os pedidos (usado no modo local sem Supabase)."""
    if supabase:
        try:
            res = supabase.table("pedidos").select("*").order("created_at", desc=True).execute()
            return jsonify(res.data), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        conn = get_db_connection()
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
    """Atualiza o status de um pedido (usado no modo local sem Supabase)."""
    data = request.get_json() or {}
    novo_status = data.get("status")
    
    if not novo_status:
        return jsonify({"error": "Campo status é obrigatório"}), 400

    if supabase:
        try:
            update_payload = {"status": novo_status}
            if novo_status == "finalizado":
                update_payload["motoboy_latitude"] = None
                update_payload["motoboy_longitude"] = None
            res = supabase.table("pedidos").update(update_payload).eq("id", id_pedido).execute()
        except Exception as e:
            print(f"[AVISO Supabase] {e}")

    conn = get_db_connection()
    if novo_status == "finalizado":
        conn.execute("UPDATE pedidos SET status = ?, motoboy_latitude = NULL, motoboy_longitude = NULL WHERE id = ? OR id_externo = ?", (novo_status, id_pedido, id_pedido))
    else:
        conn.execute("UPDATE pedidos SET status = ? WHERE id = ? OR id_externo = ?", (novo_status, id_pedido, id_pedido))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "id": id_pedido, "novo_status": novo_status}), 200


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


def geocode_address(address_str):
    """
    Converte um endereço textual em coordenadas (latitude, longitude) reais em João Pessoa/PB.
    Tenta busca de rua exata no Nominatim primeiro e faz fallback para o centro do bairro se necessário.
    """
    if not address_str or not isinstance(address_str, str):
        return -7.1155, -34.8601

    addr_low = address_str.lower()
    headers = {"User-Agent": "VoltzLogisticsSystem/3.0 (contact: admin@voltzdelivery.com.br)"}

    # 1. Tenta extrair o nome da rua (ex: "Rua João Vieira Carneiro" de "R. João Vieira Carneiro, 707 Pedro Gondim...")
    try:
        norm_addr = address_str.strip()
        if norm_addr.lower().startswith("r."):
            norm_addr = "Rua " + norm_addr[2:].strip()
        elif norm_addr.lower().startswith("r ") and not norm_addr.lower().startswith("rua "):
            norm_addr = "Rua " + norm_addr[2:].strip()
        norm_addr = re.sub(r'\s+', ' ', norm_addr).strip()

        # Extração inteligente do nome da via
        street_match = re.search(r'(rua|av|avenida|travessa|praça|prc|alameda|rodovia)\s+([^,\n\(\)]+)', norm_addr, re.IGNORECASE)
        if street_match:
            raw_street = street_match.group(0).strip()
            # Limpa números de imóveis colados ou bairros para isolar o nome da rua
            clean_street = re.sub(r'\d+', '', raw_street).strip()
            # Remove ruídos comuns no final do nome da rua
            for noise in ["pedro gondim", "estados", "tambaú", "tambau", "manaíra", "manaira", "bessa", "cabo branco"]:
                if noise in clean_street.lower():
                    clean_street = clean_street[:clean_street.lower().find(noise)].strip(", -")

            clean_street = re.sub(r'\s+', ' ', clean_street).strip()
            clean_street_unaccented = remove_accents(clean_street)
            street_query = f"{clean_street_unaccented}, Joao Pessoa, PB, Brasil"
            r_street = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": street_query, "format": "json", "limit": 1},
                headers=headers,
                timeout=1.5
            )
            print(f"[GEOCODE DEBUG] q='{street_query}' -> status={r_street.status_code}, data={r_street.text[:100]}", flush=True)
            if r_street.status_code == 200:
                d_street = r_street.json()
                if d_street and len(d_street) > 0:
                    raw_lat = float(d_street[0]["lat"])
                    raw_lng = float(d_street[0]["lon"])
                    lat, lng = sanitize_coords(raw_lat, raw_lng)
                    print(f"[GEOCODE RUA SUCESSO] '{street_query}' -> ({lat}, {lng})", flush=True)
                    return lat, lng
    except Exception as e:
        print(f"[GEOCODE WARN] Busca por rua exata indisponível: {e}", flush=True)

    # 2. Casamento instantâneo por bairros caso a rua não seja encontrada no Nominatim (0.0001s)
    bairros_jp = [
        (('tambaú', 'tambau'), (-7.1156, -34.8285)),
        (('tambauzinho',), (-7.1180, -34.8420)),
        (('manaíra', 'manaira'), (-7.0988, -34.8341)),
        (('cabo branco',), (-7.1350, -34.8235)),
        (('bessa', 'aeroclube'), (-7.0700, -34.8380)),
        (('jardim luna', 'luna'), (-7.1020, -34.8450)),
        (('pedro gondim', 'estados', 'ipês', 'ipes', 'mesquita'), (-7.1145, -34.8601)),
        (('expedicionários', 'expedicionarios'), (-7.1230, -34.8550)),
        (('torre',), (-7.1220, -34.8650)),
        (('centro', 'varadouro'), (-7.1190, -34.8820)),
        (('jaguaribe',), (-7.1320, -34.8810)),
        (('bancários', 'bancarios', 'conjunto bancarios'), (-7.1550, -34.8380)),
        (('altiplano', 'portal do sol'), (-7.1420, -34.8180)),
        (('mangabeira',), (-7.1700, -34.8350)),
        (('cristo', 'água fria', 'agua fria'), (-7.1580, -34.8650)),
        (('castelo branco',), (-7.1380, -34.8520)),
        (('intermares', 'cabedelo'), (-7.0350, -34.8350)),
    ]

    for keywords, coords in bairros_jp:
        if any(k in addr_low for k in keywords):
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
        rows = conn.execute("SELECT * FROM pedidos WHERE (id = ? OR id_externo = ?) AND status = 'em_rota'", (pedido_id, pedido_id)).fetchall()
    elif search_key:
        rows = conn.execute("SELECT * FROM pedidos WHERE (entregador_id = ? OR entregador_nome LIKE ?) AND status = 'em_rota'", (search_key, f"%{search_key}%")).fetchall()
    else:
        rows = conn.execute("SELECT * FROM pedidos WHERE status = 'em_rota'").fetchall()

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


@app.route("/api/entregadores/reset", methods=["POST", "PUT"])
def reset_entregadores_api():
    """Reseta a frota de entregadores para o estado padrão (disponível, frete e entregas zeradas)."""
    conn = get_db_connection()
    conn.execute("UPDATE entregadores SET status = 'disponivel', frete_acumulado = 0.0, total_entregas = 0")
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Frota de entregadores resetada com sucesso!"}), 200


@app.route("/api/pedidos/reset", methods=["POST"])

def reset_pedidos_api():
    """Reseta todos os pedidos e popula com os 3 pedidos oficiais (0121, 0123, 0122)."""
    conn = get_db_connection()
    conn.execute("DELETE FROM pedidos")
    conn.execute("UPDATE entregadores SET frete_acumulado = 0.0, total_entregas = 0, status = 'disponivel'")

    pedidos_iniciais = [
        {
            "id": str(uuid.uuid4()),
            "origem": "ifood",
            "id_externo": "0121",
            "nome_cliente": "Luciana Souza",
            "telefone_cliente": "83999112233",
            "endereco_entrega": "Av. General Edson Ramalho, 800 - Manaíra, João Pessoa - PB",
            "latitude": -7.0988,
            "longitude": -34.8385,
            "itens": json.dumps([{"nome": "Parmegiana de Carne Individual", "quantidade": 1, "preco_unitario": 55.90}]),
            "valor_total": 57.02,
            "status": "preparo",
            "created_at": datetime.now().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "origem": "ifood",
            "id_externo": "0123",
            "nome_cliente": "Fernando Silva",
            "telefone_cliente": "83988776655",
            "endereco_entrega": "Av. Senador Ruy Carneiro / R. Paulino Pinto - Tambaú, João Pessoa - PB",
            "latitude": -7.1145,
            "longitude": -34.8285,
            "itens": json.dumps([{"nome": "Fettuccine Alfredo com Camarão", "quantidade": 1, "preco_unitario": 62.00}]),
            "valor_total": 62.00,
            "status": "em_rota",
            "entregador_nome": "ANDERSON",
            "motoboy_latitude": -7.1132,
            "motoboy_longitude": -34.8305,
            "created_at": datetime.now().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "origem": "ifood",
            "id_externo": "0122",
            "nome_cliente": "Carlos Eduardo",
            "telefone_cliente": "83977665544",
            "endereco_entrega": "Av. João Cyrillo / Av. Cabo Branco, 2500 - Cabo Branco, João Pessoa - PB",
            "latitude": -7.1350,
            "longitude": -34.8235,
            "itens": json.dumps([{"nome": "Polpettone Recheado com Mozzarella", "quantidade": 1, "preco_unitario": 48.00}]),
            "valor_total": 48.00,
            "status": "preparo",
            "created_at": datetime.now().isoformat()
        }
    ]

    for p in pedidos_iniciais:
        conn.execute("""
            INSERT INTO pedidos (id, origem, id_externo, nome_cliente, telefone_cliente, endereco_entrega, latitude, longitude, itens, valor_total, status, entregador_nome, motoboy_latitude, motoboy_longitude, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p["id"], p["origem"], p["id_externo"], p["nome_cliente"], p["telefone_cliente"],
            p["endereco_entrega"], p["latitude"], p["longitude"], p["itens"], p["valor_total"],
            p["status"], p.get("entregador_nome"), p.get("motoboy_latitude"), p.get("motoboy_longitude"), p["created_at"]
        ))

    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Banco resetado com os pedidos 0121, 0123, 0122"}), 200


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


if __name__ == "__main__":

    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    print(f"[OK] Servidor Flask rodando na porta {port} (Debug: {debug})...")
    app.run(host="0.0.0.0", port=port, debug=debug)

