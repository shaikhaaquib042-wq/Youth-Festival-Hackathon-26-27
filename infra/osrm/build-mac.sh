#!/usr/bin/env bash
# Build + run local OSRM for Pune on macOS (Apple Silicon, Colima). PRD §20 adapted from the Windows recipe.
set -euo pipefail
DATA=${OSRM_DATA:-$HOME/osrm}
IMG=ghcr.io/project-osrm/osrm-backend:v6.0.0   # arm64; osrm/osrm-backend on Docker Hub has no arm64 build
BBOX=73.60,18.35,74.10,18.75
mkdir -p "$DATA"; cd "$DATA"
colima status >/dev/null 2>&1 || colima start --cpu 6 --memory 8
[ -s western-zone-latest.osm.pbf ] || curl -fSL -o western-zone-latest.osm.pbf \
  https://download.geofabrik.de/asia/india/western-zone/western-zone-latest.osm.pbf
osmium extract -b $BBOX western-zone-latest.osm.pbf -o pune.osm.pbf --overwrite   # brew install osmium-tool
docker run --rm -v "$DATA:/data" $IMG osrm-extract -p /opt/car.lua /data/pune.osm.pbf
docker run --rm -v "$DATA:/data" $IMG osrm-partition /data/pune.osrm
docker run --rm -v "$DATA:/data" $IMG osrm-customize /data/pune.osrm
docker rm -f osrm-pune >/dev/null 2>&1 || true
docker run -d --name osrm-pune --restart unless-stopped -p 5000:5000 -v "$DATA:/data" $IMG \
  osrm-routed --algorithm mld /data/pune.osrm
sleep 2
curl -s "http://localhost:5000/route/v1/driving/73.8567,18.5204;73.8070,18.4655?overview=false" | head -c 200; echo
