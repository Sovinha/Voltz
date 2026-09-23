import math
import json

def haversine_distance_km(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return 999.0
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_bearing_degrees(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return 0.0
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlon_r = math.radians(lon2 - lon1)
    
    y = math.sin(dlon_r) * math.cos(lat2_r)
    x = math.cos(lat1_r) * math.sin(lat2_r) - math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlon_r)
    bearing = math.atan2(y, x)
    return (math.degrees(bearing) + 360) % 360

def solve_continuous_tsp_route(pedidos_list, loja_lat=-7.1150, loja_lng=-34.8630):
    if len(pedidos_list) <= 1:
        return pedidos_list

    unvisited = list(pedidos_list)
    ordered = []

    curr_lat, curr_lng = loja_lat, loja_lng
    curr_bearing = None

    while unvisited:
        best_idx = 0
        best_cost = float('inf')

        for idx, p in enumerate(unvisited):
            target_lat = p.get("latitude")
            target_lng = p.get("longitude")
            
            d_km = haversine_distance_km(curr_lat, curr_lng, target_lat, target_lng)
            bearing_to_target = calculate_bearing_degrees(curr_lat, curr_lng, target_lat, target_lng)

            angle_diff_penalty = 0
            if curr_bearing is not None:
                diff = abs(bearing_to_target - curr_bearing)
                if diff > 180:
                    diff = 360 - diff
                if diff > 100:
                    angle_diff_penalty = d_km * 3.0

            cost = d_km + angle_diff_penalty
            if cost < best_cost:
                best_cost = cost
                best_idx = idx

        next_p = unvisited.pop(best_idx)
        ordered.append(next_p)
        next_lat = next_p.get("latitude")
        next_lng = next_p.get("longitude")
        curr_bearing = calculate_bearing_degrees(curr_lat, curr_lng, next_lat, next_lng)
        curr_lat, curr_lng = next_lat, next_lng

    return ordered

# Test data mimicking the screenshot
loja = {"nome": "Filipéia Trattoria", "latitude": -7.1150, "longitude": -34.8630} # Pedro Gondim
pedidos_teste = [
    {"id": "0024", "id_externo": "#1 0024", "nome_cliente": "Cliente Tambauzinho 1", "latitude": -7.1250, "longitude": -34.8600, "status": "pronto"}, # South
    {"id": "0020", "id_externo": "#2 0020", "nome_cliente": "Cliente São José 2", "latitude": -7.0980, "longitude": -34.8550, "status": "pronto"}, # North
    {"id": "0021", "id_externo": "#3 0021", "nome_cliente": "Cliente Tambauzinho 3", "latitude": -7.1270, "longitude": -34.8580, "status": "pronto"}  # South (next to 0024)
]

print("--- ORDEM ORIGINAL DO SISTEMA ---")
for p in pedidos_teste:
    print(f"Pedido {p['id_externo']}: lat={p['latitude']}, lng={p['longitude']}")

resultado_ordenado = solve_continuous_tsp_route(pedidos_teste, loja["latitude"], loja["longitude"])

print("\n--- ORDEM OTIMIZADA CONTINUA (SEM ZIGUEZAGUE) ---")
for idx, p in enumerate(resultado_ordenado, 1):
    print(f"Parada #{idx}: {p['id_externo']} ({p['nome_cliente']})")
