#!/bin/bash

BACKEND_URL="${1:-http://localhost:8080}"

echo "Testing Backend Health Endpoints..."
echo "Backend URL: $BACKEND_URL"
echo ""

echo "=== Health Check ==="
HEALTH_RESPONSE=$(curl -s ${BACKEND_URL}/api/health)
echo "$HEALTH_RESPONSE" | jq . || echo "$HEALTH_RESPONSE"
echo ""

echo "=== Deployment Info ==="
DEPLOYMENT_INFO=$(curl -s ${BACKEND_URL}/api/deployment-info)
echo "$DEPLOYMENT_INFO" | jq . || echo "$DEPLOYMENT_INFO"
echo ""

echo "=== Response Time ==="
time curl -s -o /dev/null ${BACKEND_URL}/api/health
echo ""

echo "=== Test Complete ==="

