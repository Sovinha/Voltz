import unittest
import sqlite3
import os
import json
from datetime import datetime, timedelta

# Define a variável de ambiente para usar SQLite em memória nos testes
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_KEY"] = ""

from app import app, get_db_connection, init_local_db, purge_expired_orders

class TestMultiStoreAndPurge(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        init_local_db()

    def test_01_purge_expired_orders_24h(self):
        """Valida que pedidos criados há mais de 24h são automaticamente purgados."""
        conn = get_db_connection()
        
        # Insere 1 pedido recente (1 hora atrás) e 1 pedido antigo (30 horas atrás)
        recent_time = (datetime.now() - timedelta(hours=1)).isoformat()
        old_time = (datetime.now() - timedelta(hours=30)).isoformat()

        conn.execute("""
            INSERT OR REPLACE INTO pedidos (id, origem, id_externo, nome_cliente, endereco_entrega, valor_total, itens, status, created_at)
            VALUES ('p_recente', 'web', '#RECENTE', 'Cliente Novo', 'Rua Nova 10', 50.0, '[]', 'pendente', ?)
        """, (recent_time,))

        conn.execute("""
            INSERT OR REPLACE INTO pedidos (id, origem, id_externo, nome_cliente, endereco_entrega, valor_total, itens, status, created_at)
            VALUES ('p_antigo', 'web', '#ANTIGO', 'Cliente Antigo', 'Rua Velha 50', 30.0, '[]', 'finalizado', ?)
        """, (old_time,))

        conn.commit()
        conn.close()

        # Executa a purga de 24h
        purgados = purge_expired_orders(24)
        self.assertGreaterEqual(purgados, 1)

        # Verifica no banco
        conn = get_db_connection()
        p_rec = conn.execute("SELECT * FROM pedidos WHERE id = 'p_recente'").fetchone()
        p_ant = conn.execute("SELECT * FROM pedidos WHERE id = 'p_antigo'").fetchone()
        conn.close()

        self.assertIsNotNone(p_rec, "Pedido recente (<24h) deve ser MANTIDO.")
        self.assertIsNone(p_ant, "Pedido antigo (>24h) deve ser PURGADO.")

    def test_02_motoboys_permanent_preservation(self):
        """Valida que resets de sistema NÃO deletam motoboys cadastrados."""
        conn = get_db_connection()
        conn.execute("""
            INSERT OR REPLACE INTO entregadores (id, nome, telefone, placa_veiculo, status, created_at)
            VALUES ('mb_teste', 'Motoboy Permanente', '(83) 98888-7777', 'MOTO-1234', 'em_rota', ?)
        """, (datetime.now().isoformat(),))
        conn.commit()
        conn.close()

        # Executa reset do sistema
        res = self.app.post("/api/sistema/reset-total")
        self.assertEqual(res.status_code, 200)

        # Verifica se o motoboy AINDA existe no banco
        conn = get_db_connection()
        mb = conn.execute("SELECT * FROM entregadores WHERE id = 'mb_teste'").fetchone()
        conn.close()

        self.assertIsNotNone(mb, "Motoboy NUNCA deve ser deletado automaticamente!")
        self.assertEqual(mb["status"], "disponivel", "Status deve ter sido resetado para disponível.")

    def test_03_multistore_api_crud(self):
        """Valida os endpoints de cadastro, listagem e atualização de Multi-Lojas."""
        # GET Lojas
        res = self.app.get("/api/lojas")
        self.assertEqual(res.status_code, 200)
        lojas = res.get_json()
        self.assertGreaterEqual(len(lojas), 1)

        # POST Nova Loja
        res = self.app.post("/api/lojas", json={
            "nome": "Filipéia - Unidade Manaíra",
            "endereco": "Av. Edson Ramalho, 500 - Manaíra, João Pessoa - PB",
            "latitude": -7.0920,
            "longitude": -34.8320,
            "telefone": "(83) 3247-0000"
        })
        self.assertEqual(res.status_code, 201)
        nova_loja = res.get_json()["loja"]
        loja_id = nova_loja["id"]
        self.assertEqual(nova_loja["nome"], "Filipéia - Unidade Manaíra")

        # GET Lojas atualizado
        res = self.app.get("/api/lojas")
        lojas_atualizadas = res.get_json()
        self.assertGreaterEqual(len(lojas_atualizadas), 2)

if __name__ == "__main__":
    unittest.main()
