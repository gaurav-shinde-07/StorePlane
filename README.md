# Store Platform - Kubernetes Store Orchestration

A production-ready store provisioning platform that runs on Kubernetes, supporting automated deployment of MedusaJS and WooCommerce stores.

## 🚀 Features

- **Automated Store Provisioning**: Deploy MedusaJS and WooCommerce stores with one click
- **Multi-Tenant Isolation**: Namespace-per-store architecture for security
- **Helm-Based Deployments**: Seamless local-to-production workflow
- **Production-Ready**: Security hardening, RBAC, resource quotas
- **Real-Time Monitoring**: Live status tracking and health checks
- **Clean Teardown**: Safe resource cleanup with no orphaned objects

## 📋 Prerequisites

- Docker Desktop (with WSL2 backend for Windows)
- kubectl (Kubernetes CLI)
- Kind (Kubernetes in Docker) for local development
- Helm 3
- Node.js 18+

## 🏗️ Architecture

```
┌─────────────┐
│  Dashboard  │ (React + TypeScript)
│  (Port 3000)│
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Backend API │ (Node.js + Express)
│  (Port 4000)│
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│    Kubernetes API Server        │
└─────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│  Store Namespaces (Isolated)    │
│  ├── store-abc123               │
│  │   ├── Deployment (Medusa)    │
│  │   ├── StatefulSet (Postgres) │
│  │   ├── Service                │
│  │   ├── Ingress                │
│  │   └── PVC (Database)         │
│  └── store-xyz789               │
└─────────────────────────────────┘
```

## 🚦 Quick Start (Local)

### 1. Start Local Kubernetes Cluster

```bash
# Start Kind cluster with custom config
./scripts/start-local-cluster.sh

# Verify cluster is running
kubectl cluster-info
kubectl get nodes
```

### 2. Install Platform

```bash
# Install nginx-ingress controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.hostPort.enabled=true

# Install store-platform
helm install store-platform ./helm-charts/store-platform \
  -f ./helm-charts/store-platform/values-local.yaml \
  --create-namespace \
  --namespace store-platform
```

### 3. Access Dashboard

```bash
# Port forward to access locally
kubectl port-forward -n store-platform svc/dashboard 3000:3000

# In another terminal
kubectl port-forward -n store-platform svc/backend 4000:4000
```

Visit: **http://localhost:3000**

### 4. Create Your First Store

1. Click **"Create New Store"**
2. Select **MedusaJS**
3. Enter store name (e.g., `my-first-store`)
4. Wait for provisioning (~2-3 minutes)
5. Access your store via the provided URL

### 5. Test End-to-End Flow

```bash
# Get store URL
kubectl get ingress -n store-<store-id>

# Add to hosts file (Windows: C:\Windows\System32\drivers\etc\hosts)
127.0.0.1 <store-domain>.local

# Visit storefront and place test order
```

## 🌐 Production Deployment (VPS with k3s)

See [Production Setup Guide](./docs/production-setup.md)

**TL;DR:**
```bash
# On VPS (Ubuntu/Debian)
curl -sfL https://get.k3s.io | sh -

# Deploy with production values
helm install store-platform ./helm-charts/store-platform \
  -f ./helm-charts/store-platform/values-prod.yaml \
  --namespace store-platform \
  --create-namespace
```

## 📚 Documentation

- [📐 Architecture Overview](./docs/architecture.md)
- [💻 Local Setup Guide](./docs/local-setup.md)
- [🚀 Production Deployment](./docs/production-setup.md)
- [🧠 System Design & Tradeoffs](./docs/system-design.md)
- [🔒 Security Hardening](./docs/security.md)
- [📊 Monitoring & Observability](./docs/monitoring.md)

## 🛠️ Development

### Backend API

```bash
cd backend
npm install
npm run dev
```

### Frontend Dashboard

```bash
cd frontend
npm install
npm run dev
```

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🎯 Definition of Done (MedusaJS)

- [x] Open storefront (default Next.js starter)
- [x] Add product to cart
- [x] Complete checkout flow
- [x] Verify order in admin UI/API

## 📦 Project Structure

```
store-platform/
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Helpers
│   │   ├── types/        # TypeScript types
│   │   └── middleware/   # Express middleware
│   └── tests/
├── frontend/             # React dashboard
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   └── types/        # TypeScript types
│   └── public/
├── helm-charts/          # Kubernetes deployments
│   ├── store-platform/   # Main platform chart
│   ├── medusa-store/     # Medusa store template
│   └── wordpress-store/  # WordPress template (stub)
├── docs/                 # Documentation
├── scripts/              # Automation scripts
└── README.md
```

## 🔐 Security Features

- Namespace isolation per store
- RBAC with least privilege
- Non-root container execution
- Secret encryption at rest
- Network policies (deny-by-default)
- Resource quotas and limits
- Audit logging

## 🎓 Learning Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [MedusaJS Documentation](https://docs.medusajs.com/)
- [Kind Documentation](https://kind.sigs.k8s.io/)

## 📝 License

MIT

## 👤 Author

**Your Name**
- Submission for Urumi AI SDE Internship - Round 1
- Date: February 2026