#!/usr/bin/env bash
# Pune basemap cut from the Protomaps daily build (PRD §20). brew install pmtiles
set -euo pipefail
DATE=${1:-20261120}   # pick a current date from https://maps.protomaps.com/builds/
pmtiles extract "https://build.protomaps.com/${DATE}.pmtiles" "public/tiles/pune-${DATE}.pmtiles" --bbox=73.60,18.35,74.10,18.75
echo "Update citypacks/pune.json \"tiles\" to pune-${DATE}.pmtiles"
