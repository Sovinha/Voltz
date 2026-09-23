import sys
import time
import json
import requests

from app import app

# Run Flask server in a background thread for testing
import threading

def run_server():
    app.run(host="127.0.0.1", port=5099, debug=False, threaded=True)

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()

time.sleep(1.5)  # Wait for Flask test server to start

url = "http://127.0.0.1:5099/api/webhook/web"

print("=" * 80)
print("⚡ TESTE DE DESEMPENHO E VELOCIDADE DE SALVAMENTO DE PEDIDOS (VOLTZ)")
print("=" * 80)

times = []
for i in range(1, 6):
    payload = {
        "id_externo": f"#BENCH-{i}",
        "nome_cliente": f"Cliente Velocidade {i}",
        "telefone_cliente": "83999998888",
        "endereco_entrega": f"Rua Desembargador Souto Maior, {i*10} - Centro, João Pessoa - PB",
        "itens": [{"nome": "Comanda Rápida", "quantidade": 1, "preco_unitario": 35.0}],
        "valor_total": 35.0
    }
    
    t0 = time.time()
    res = requests.post(url, json=payload, timeout=5)
    t1 = time.time()
    
    duration_ms = (t1 - t0) * 1000
    times.append(duration_ms)
    print(f"  [PEDIDO {i}] Status: {res.status_code} | Tempo de Salvamento: {duration_ms:.2f} ms ⚡")

avg_time = sum(times) / len(times)
print("-" * 80)
print(f"📊 RESULTADO: Tempo médio de resposta: {avg_time:.2f} ms")
if avg_time < 50:
    print("🚀 DESEMPENHO ULTRARRÁPIDO CONFIRMADO (< 50ms per order)!")
else:
    print("⚠️ Tempo acima do esperado.")
print("=" * 80)
