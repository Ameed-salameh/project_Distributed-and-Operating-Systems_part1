#!/bin/bash

# LAB 2 - Stop All Services Script

echo " Stopping all services..."
pkill -f "node.*server.js"
echo " All services stopped!"
