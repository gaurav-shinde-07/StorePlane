#!/usr/bin/env pwsh

Write-Host "🚀 Starting Store Platform Local Cluster..." -ForegroundColor Cyan

# Check if Kind is installed
if (-not (Get-Command kind -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Kind is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Run: choco install kind" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Delete existing cluster if present
$clusterExists = kind get clusters 2>$null | Select-String "store-platform"
if ($clusterExists) {
    Write-Host "🗑️  Deleting existing cluster..." -ForegroundColor Yellow
    kind delete cluster --name store-platform
}

# Create new cluster
Write-Host "📦 Creating Kind cluster with ingress support..." -ForegroundColor Cyan
kind create cluster --config kind-config.yaml --wait 5m

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create cluster" -ForegroundColor Red
    exit 1
}

# Install nginx-ingress controller
Write-Host "🌐 Installing nginx-ingress controller..." -ForegroundColor Cyan
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress controller to be ready
Write-Host "⏳ Waiting for ingress controller to be ready..." -ForegroundColor Yellow
kubectl wait --namespace ingress-nginx `
  --for=condition=ready pod `
  --selector=app.kubernetes.io/component=controller `
  --timeout=180s

Write-Host "✅ Cluster is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Install platform: helm install store-platform ./helm-charts/store-platform -f ./helm-charts/store-platform/values-local.yaml" -ForegroundColor White
Write-Host "  2. Access dashboard: kubectl port-forward -n store-platform svc/dashboard 3000:3000" -ForegroundColor White
Write-Host ""