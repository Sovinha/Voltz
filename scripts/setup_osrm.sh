#!/usr/bin/env bash
# ==============================================================================
# VOLTZ LOGISTICS - OSRM SELF-HOSTED MAP DATA PREPROCESSOR (Docker)
# Baixa os dados do OpenStreetMap e compila a malha viária para o OSRM Engine
# ==============================================================================

set -e

OSRM_DATA_DIR="./osrm_data"
PBF_URL="https://download.geofabrik.de/south-america/brazil/nordeste-latest.osm.pbf"
PBF_FILE="${OSRM_DATA_DIR}/nordeste-latest.osm.pbf"
OSRM_FILE="${OSRM_DATA_DIR}/nordeste-latest.osrm"

echo "🚗 [VOLTZ OSRM SETUP] Criando diretório de dados do mapa em ${OSRM_DATA_DIR}..."
mkdir -p "${OSRM_DATA_DIR}"

# Se existir arquivo corrompido/incompleto de tentativas anteriores, remove
if [ -f "${PBF_FILE}" ]; then
    SIZE=$(stat -c%s "${PBF_FILE}" 2>/dev/null || stat -f%z "${PBF_FILE}" 2>/dev/null || echo 0)
    if [ "$SIZE" -lt 5000000 ]; then
        echo "⚠️ [VOLTZ OSRM SETUP] Arquivo PBF incompleto detectado ($SIZE bytes). Removendo..."
        rm -f "${PBF_FILE}"
    fi
fi

if [ ! -f "${PBF_FILE}" ]; then
    echo "📥 [VOLTZ OSRM SETUP] Baixando mapa OSM da Paraiba (~25MB Geofabrik)..."
    curl -L -f "${PBF_URL}" -o "${PBF_FILE}"
else
    echo "✅ [VOLTZ OSRM SETUP] Arquivo PBF válido encontrado."
fi

echo "⚙️ [VOLTZ OSRM SETUP] 1/3 Executando osrm-extract (Perfil Carro/Moto)..."
docker run -t -v "$(pwd)/${OSRM_DATA_DIR}:/data" osrm/osrm-backend:latest osrm-extract -p /opt/car.lua /data/nordeste-latest.osm.pbf

echo "⚙️ [VOLTZ OSRM SETUP] 2/3 Executando osrm-partition..."
docker run -t -v "$(pwd)/${OSRM_DATA_DIR}:/data" osrm/osrm-backend:latest osrm-partition /data/nordeste-latest.osrm

echo "⚙️ [VOLTZ OSRM SETUP] 3/3 Executando osrm-customize..."
docker run -t -v "$(pwd)/${OSRM_DATA_DIR}:/data" osrm/osrm-backend:latest osrm-customize /data/nordeste-latest.osrm

echo "🚀 [VOLTZ OSRM SETUP] Sucesso! OSRM pré-processado com sucesso."
echo "Execute 'docker compose up -d osrm' para iniciar o servidor de roteamento offline."
