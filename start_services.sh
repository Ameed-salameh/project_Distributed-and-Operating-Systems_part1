#!/bin/bash

# LAB 2 - Start All Services Script
# This script starts all replicas and the client service

echo "======================================================"
echo "Starting Lab 2 - Distributed Book Store with Replicas"
echo "======================================================"
echo ""

# Kill any existing node processes on these ports
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*server.js" 2>/dev/null || true
sleep 2

# Start Catalog Replica 1
echo "🚀 Starting Catalog Replica 1 (Port 3001)..."
cd catalog_service
PORT=3001 CLIENT_URL=http://localhost:3000 node server.js > ../logs/catalog-1.log 2>&1 &
cd ..
sleep 1

# Start Catalog Replica 2
echo "🚀 Starting Catalog Replica 2 (Port 3011)..."
cd catalog_service
PORT=3011 CLIENT_URL=http://localhost:3000 node server.js > ../logs/catalog-2.log 2>&1 &
cd ..
sleep 1

# Start Order Replica 1
echo "🚀 Starting Order Replica 1 (Port 3002)..."
cd order_service
PORT=3002 CATALOG_URLS=http://localhost:3001,http://localhost:3011 CLIENT_URL=http://localhost:3000 node server.js > ../logs/order-1.log 2>&1 &
cd ..
sleep 1

# Start Order Replica 2
echo "🚀 Starting Order Replica 2 (Port 3012)..."
cd order_service
PORT=3012 CATALOG_URLS=http://localhost:3001,http://localhost:3011 CLIENT_URL=http://localhost:3000 node server.js > ../logs/order-2.log 2>&1 &
cd ..
sleep 1

# Start Client (Front-End)
echo "🚀 Starting Client/Front-End (Port 3000)..."
cd client_service
PORT=3000 CATALOG_URLS=http://localhost:3001,http://localhost:3011 ORDER_URLS=http://localhost:3002,http://localhost:3012 node server.js > ../logs/client.log 2>&1 &
cd ..
sleep 2

echo ""
echo "======================================================"
echo "✅ All services started successfully!"
echo "======================================================"
echo ""
echo "Services running on:"
echo "  📱 Client:           http://localhost:3000"
echo "  📚 Catalog Replica 1: http://localhost:3001"
echo "  📚 Catalog Replica 2: http://localhost:3011"
echo "  🛒 Order Replica 1:   http://localhost:3002"
echo "  🛒 Order Replica 2:   http://localhost:3012"
echo ""
echo "Logs available in ./logs/ directory"
echo ""
echo "To stop all services, run: ./stop_services.sh"
echo "To test performance, run: node test_performance.js"
echo "======================================================"
