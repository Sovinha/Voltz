# ==============================================================================
# VOLTZ LOGISTICS - OSRM SELF-HOSTED MAP DATA PREPROCESSOR (PowerShell)
# Baixa os dados do OpenStreetMap e compila a malha viária para o OSRM Engine
# ==============================================================================

$ErrorActionPreference = "Stop"

$OSRM_DATA_DIR = ".\osrm_data"
$PBF_URL = "https://download.geofabrik.de/south-america/brazil/paraiba-latest.osm.pbf"
$PBF_FILE = "$OSRM_DATA_DIR\paraiba-latest.osm.pbf"

Write-Host "🚗 [VOLTZ OSRM SETUP] Criando diretório de dados do mapa em $OSRM_DATA_DIR..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $OSRM_DATA_DIR | Out-Null

if (-not (Test-Path $PBF_FILE)) {
    Write-Host "📥 [VOLTZ OSRM SETUP] Baixando mapa OSM oficial da Paraíba (~20MB Geofabrik)..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $PBF_URL -OutFile $PBF_FILE
} else {
    Write-Host "✅ [VOLTZ OSRM SETUP] Arquivo PBF da Paraíba encontrado." -ForegroundColor Green
}

$workDir = (Get-Location).Path

Write-Host "⚙️ [VOLTZ OSRM SETUP] 1/3 Executando osrm-extract (Perfil Carro/Moto)..." -ForegroundColor Cyan
docker run -t -v "${workDir}\osrm_data:/data" osrm/osrm-backend:latest osrm-extract -p /opt/car.lua /data/paraiba-latest.osm.pbf

Write-Host "⚙️ [VOLTZ OSRM SETUP] 2/3 Executando osrm-partition..." -ForegroundColor Cyan
docker run -t -v "${workDir}\osrm_data:/data" osrm/osrm-backend:latest osrm-partition /data/paraiba-latest.osrm

Write-Host "⚙️ [VOLTZ OSRM SETUP] 3/3 Executando osrm-customize..." -ForegroundColor Cyan
docker run -t -v "${workDir}\osrm_data:/data" osrm/osrm-backend:latest osrm-customize /data/paraiba-latest.osrm

Write-Host "🚀 [VOLTZ OSRM SETUP] Sucesso! Mapa da Paraíba (João Pessoa) pré-processado com sucesso." -ForegroundColor Green
Write-Host "Execute 'docker compose up -d' para iniciar todos os serviços." -ForegroundColor Yellow
