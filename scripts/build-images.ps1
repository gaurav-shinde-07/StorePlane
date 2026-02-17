#!/usr/bin/env pwsh

Write-Host "🐳 Building Docker Images for Store Platform..." -ForegroundColor Cyan

# Check if Docker is running
try {
    docker ps | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Set image tag
$TAG = "latest"
$REGISTRY = "localhost:5001"

Write-Host ""
Write-Host "📦 Building Backend Image..." -ForegroundColor Yellow
Set-Location backend
docker build -t store-platform-backend:$TAG -t ${REGISTRY}/store-platform-backend:$TAG .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend image built successfully" -ForegroundColor Green
Set-Location ..

Write-Host ""
Write-Host "📦 Building Frontend Image..." -ForegroundColor Yellow
Set-Location frontend
docker build -t store-platform-dashboard:$TAG -t ${REGISTRY}/store-platform-dashboard:$TAG .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend image built successfully" -ForegroundColor Green
Set-Location ..

Write-Host ""
Write-Host "✅ All images built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Images created:" -ForegroundColor Cyan
docker images | Select-String "store-platform"

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start local registry: docker run -d -p 5001:5000 --name registry registry:2" -ForegroundColor White
Write-Host "  2. Push images: docker push ${REGISTRY}/store-platform-backend:$TAG" -ForegroundColor White
Write-Host "  3. Push images: docker push ${REGISTRY}/store-platform-dashboard:$TAG" -ForegroundColor White
Write-Host "  4. Deploy to Kind: helm install store-platform ./helm-charts/store-platform -f ./helm-charts/store-platform/values-local.yaml" -ForegroundColor White