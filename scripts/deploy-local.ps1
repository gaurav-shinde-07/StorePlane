#!/usr/bin/env pwsh

param(
    [switch]$SkipCluster,
    [switch]$SkipBuild,
    [switch]$SkipRegistry
)

Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 Store Platform - Local Deployment           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Kind cluster
if (-not $SkipCluster) {
    Write-Host "📦 Step 1/5: Creating Kind cluster..." -ForegroundColor Yellow
    & ./scripts/start-local-cluster.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create cluster" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping cluster creation" -ForegroundColor Gray
}

# Step 2: Start local registry
if (-not $SkipRegistry) {
    Write-Host "🐳 Step 2/5: Starting local Docker registry..." -ForegroundColor Yellow
    
    # Check if registry exists
    $registryExists = docker ps -a --filter "name=registry" --format "{{.Names}}" | Select-String "registry"
    
    if ($registryExists) {
        Write-Host "Registry already exists, removing..." -ForegroundColor Gray
        docker rm -f registry | Out-Null
    }
    
    docker run -d -p 5001:5000 --name registry registry:2
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to start registry" -ForegroundColor Red
        exit 1
    }
    
    # Wait for registry to be ready
    Start-Sleep -Seconds 3
    Write-Host "✅ Registry started on localhost:5001" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping registry setup" -ForegroundColor Gray
}

# Step 3: Build Docker images
if (-not $SkipBuild) {
    Write-Host "🔨 Step 3/5: Building Docker images..." -ForegroundColor Yellow
    & ./scripts/build-images.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build images" -ForegroundColor Red
        exit 1
    }
    
    # Push to local registry
    Write-Host ""
    Write-Host "📤 Pushing images to local registry..." -ForegroundColor Yellow
    docker push localhost:5001/store-platform-backend:latest
    docker push localhost:5001/store-platform-dashboard:latest
    Write-Host "✅ Images pushed successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping image build" -ForegroundColor Gray
}

# Step 4: Create namespace
Write-Host "📁 Step 4/5: Creating namespace..." -ForegroundColor Yellow
kubectl create namespace store-platform --dry-run=client -o yaml | kubectl apply -f -
Write-Host "✅ Namespace ready" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy with Helm
Write-Host "🎯 Step 5/5: Deploying with Helm..." -ForegroundColor Yellow

# Check if release exists
$releaseExists = helm list -n store-platform -o json | ConvertFrom-Json | Where-Object { $_.name -eq "store-platform" }

if ($releaseExists) {
    Write-Host "Upgrading existing release..." -ForegroundColor Gray
    helm upgrade store-platform ./helm-charts/store-platform `
        -f ./helm-charts/store-platform/values-local.yaml `
        -n store-platform
} else {
    Write-Host "Installing new release..." -ForegroundColor Gray
    helm install store-platform ./helm-charts/store-platform `
        -f ./helm-charts/store-platform/values-local.yaml `
        -n store-platform
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Helm deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deployed successfully" -ForegroundColor Green
Write-Host ""

# Wait for pods
Write-Host "⏳ Waiting for pods to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=store-platform -n store-platform --timeout=180s

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Deployment Complete!                         ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Show pod status
Write-Host "📊 Pod Status:" -ForegroundColor Cyan
kubectl get pods -n store-platform

Write-Host ""
Write-Host "🌐 Access Dashboard:" -ForegroundColor Cyan
Write-Host "  Run: kubectl port-forward -n store-platform svc/dashboard 3000:3000" -ForegroundColor White
Write-Host "  Then visit: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Access Backend API:" -ForegroundColor Cyan
Write-Host "  Run: kubectl port-forward -n store-platform svc/backend 4000:4000" -ForegroundColor White
Write-Host "  Then visit: http://localhost:4000/health" -ForegroundColor White
Write-Host ""
Write-Host "📝 View logs:" -ForegroundColor Cyan
Write-Host "  Backend: kubectl logs -n store-platform -l app.kubernetes.io/name=backend -f" -ForegroundColor White
Write-Host "  Dashboard: kubectl logs -n store-platform -l app.kubernetes.io/name=dashboard -f" -ForegroundColor White
Write-Host ""