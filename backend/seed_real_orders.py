import os
import json
import sqlite3
import uuid
from datetime import datetime

def seed_real_orders():
    print("[INFO] Inserindo 139 pedidos reais de João Pessoa - PB no SQLite local (pedidos.db)...")
    
    json_path = os.path.join(os.path.dirname(__file__), "real_orders_joao_pessoa.json")
    if not os.path.exists(json_path):
        json_path = os.path.join(os.path.dirname(__file__), "..", "backend", "real_orders_joao_pessoa.json")
        
    with open(json_path, "r", encoding="utf-8") as f:
        orders = json.load(f)
        
    db_path = os.path.join(os.path.dirname(__file__), "pedidos.db")
    
    conn = sqlite3.connect(db_path)
    conn.execute("DROP TABLE IF EXISTS pedidos")
    conn.execute("""
        CREATE TABLE pedidos (
            id TEXT PRIMARY KEY, origem TEXT NOT NULL, id_externo TEXT NOT NULL,
            nome_cliente TEXT NOT NULL, endereco_entrega TEXT NOT NULL, bairro TEXT,
            latitude REAL, longitude REAL, itens TEXT NOT NULL,
            valor_total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pendente', created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    
    for p in orders:
        conn.execute("""
            INSERT INTO pedidos (id, origem, id_externo, nome_cliente, endereco_entrega, bairro, latitude, longitude, itens, valor_total, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p["id"],
            p["origem"],
            p["id_externo"],
            p["cliente"],
            p["endereco"],
            p["bairro"],
            p["latitude"],
            p["longitude"],
            p["itensResumo"],
            p["valorTotal"],
            p["status"],
            p.get("created_at", datetime.now().isoformat())
        ))
        
    conn.commit()
    conn.close()
    print(f"[OK] {len(orders)} pedidos reais gravados em {db_path} com sucesso!")

if __name__ == "__main__":
    seed_real_orders()
