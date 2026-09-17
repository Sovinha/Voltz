"""
==============================================================================
SISTEMA DE GESTÃO LOGÍSTICA PARA DELIVERY - SCRIPT DE DADOS DE TESTE (SEED)
Script utilitário para popular a base de dados em João Pessoa - PB
com pedidos georreferenciados para a Filipéia Trattoria Express.
==============================================================================
"""

import os
import json
import sqlite3
import uuid
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Pedidos georreferenciados na Região Metropolitana de João Pessoa - PB (Exemplo Oficial Print 1)
PEDIDOS_TESTE = [
    {
        "origem": "ifood",
        "id_externo": "0121",
        "nome_cliente": "Luciana Souza",
        "endereco_entrega": "Av. General Edson Ramalho, 800 - Manaíra, João Pessoa - PB",
        "latitude": -7.0988,
        "longitude": -34.8385,
        "itens": [
            {"nome": "Parmegiana de Carne Individual", "quantidade": 1, "preco_unitario": 55.90}
        ],
        "valor_total": 57.02,
        "status": "preparo"
    },
    {
        "origem": "ifood",
        "id_externo": "0123",
        "nome_cliente": "Fernando Silva",
        "endereco_entrega": "Av. Senador Ruy Carneiro / R. Paulino Pinto - Tambaú, João Pessoa - PB",
        "latitude": -7.1145,
        "longitude": -34.8285,
        "itens": [
            {"nome": "Fettuccine Alfredo com Camarão", "quantidade": 1, "preco_unitario": 62.00}
        ],
        "valor_total": 62.00,
        "status": "em_rota"
    },
    {
        "origem": "ifood",
        "id_externo": "0122",
        "nome_cliente": "Carlos Eduardo",
        "endereco_entrega": "Av. João Cyrillo / Av. Cabo Branco, 2500 - Cabo Branco, João Pessoa - PB",
        "latitude": -7.1350,
        "longitude": -34.8235,
        "itens": [
            {"nome": "Polpettone Recheado com Mozzarella", "quantidade": 1, "preco_unitario": 48.00}
        ],
        "valor_total": 48.00,
        "status": "preparo"
    }
]


def popular_banco():
    print("[INFO] Inserindo pedidos georreferenciados de Joao Pessoa no banco de dados...")
    
    # Limpa pedidos antigos no SQLite local para evitar dados misturados de SP
    db_path = os.path.join(os.path.dirname(__file__), "pedidos.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            conn.execute("DELETE FROM pedidos")
            conn.commit()
            conn.close()
        except Exception:
            pass

    for pedido in PEDIDOS_TESTE:
        if supabase:
            try:
                res = supabase.table("pedidos").insert(pedido).execute()
                if hasattr(res, "data") and res.data:
                    p = res.data[0]
                    print(f"  -> [Supabase] Pedido {p['id_externo']} ({p['origem'].upper()}) inserido! ID: {p['id']}")
            except Exception as e:
                print(f"[ERRO] Falha ao inserir pedido no Supabase: {e}")
        else:
            try:
                conn = sqlite3.connect(db_path)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS pedidos (
                        id TEXT PRIMARY KEY, origem TEXT NOT NULL, id_externo TEXT NOT NULL,
                        nome_cliente TEXT NOT NULL, endereco_entrega TEXT NOT NULL,
                        latitude REAL, longitude REAL, itens TEXT NOT NULL,
                        valor_total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pendente', created_at TEXT NOT NULL
                    )
                """)
                new_id = str(uuid.uuid4())
                conn.execute("""
                    INSERT INTO pedidos (id, origem, id_externo, nome_cliente, endereco_entrega, latitude, longitude, itens, valor_total, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    new_id, pedido["origem"], pedido["id_externo"], pedido["nome_cliente"],
                    pedido["endereco_entrega"], pedido["latitude"], pedido["longitude"],
                    json.dumps(pedido["itens"]), pedido["valor_total"], pedido["status"], datetime.now().isoformat()
                ))
                conn.commit()
                conn.close()
                print(f"  -> [SQLite Local] Pedido {pedido['id_externo']} ({pedido['origem'].upper()}) inserido com sucesso!")
            except Exception as e:
                print(f"[ERRO] Falha ao gravar no SQLite local: {e}")

    print("\n[OK] Seed de Joao Pessoa concluido com sucesso!")


if __name__ == "__main__":
    popular_banco()
