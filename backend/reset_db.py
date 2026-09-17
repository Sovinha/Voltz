import sqlite3
import os

DB_FILE = os.path.join(os.path.dirname(__file__), "pedidos.db")

def reset_database():
    if not os.path.exists(DB_FILE):
        print("[INFO] Banco de dados pedidos.db ainda nao existe.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Limpa todos os pedidos de teste
    cursor.execute("DELETE FROM pedidos")
    deleted_orders = cursor.rowcount

    # 2. Reseta saldos de frete acumulado, entregas e status da frota para 'disponivel'
    cursor.execute("""
        UPDATE entregadores 
        SET frete_acumulado = 0.0, total_entregas = 0, status = 'disponivel'
    """)
    updated_drivers = cursor.rowcount

    conn.commit()
    conn.close()

    print("[RESET CONCLUIDO] Banco de dados limpo com sucesso!")
    print(f"   - {deleted_orders} pedido(s) de teste removido(s).")
    print(f"   - {updated_drivers} entregador(es) com status resetado para 'disponivel' e frete zerado.")

if __name__ == "__main__":
    reset_database()
