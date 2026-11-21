# Windows (Docker Desktop on WSL2) — PRD §20 recipe with the corrected Geofabrik URL. Data in C:\osrm.
# Download: https://download.geofabrik.de/asia/india/western-zone/western-zone-latest.osm.pbf  ->  C:\osrm
docker run --rm -v C:/osrm:/data stefda/osmium-tool osmium extract -b 73.60,18.35,74.10,18.75 /data/western-zone-latest.osm.pbf -o /data/pune.osm.pbf
docker run --rm -t -v C:/osrm:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/pune.osm.pbf
docker run --rm -t -v C:/osrm:/data osrm/osrm-backend osrm-partition /data/pune.osrm
docker run --rm -t -v C:/osrm:/data osrm/osrm-backend osrm-customize /data/pune.osrm
docker run -d --name osrm-pune --restart unless-stopped -p 5000:5000 -v C:/osrm:/data osrm/osrm-backend osrm-routed --algorithm mld /data/pune.osrm
