# System Design & Tradeoffs

## Architecture Overview

The Store Platform is designed as a Kubernetes-native application that orchestrates the provisioning and management of ecommerce stores with strong isolation, security, and scalability.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Layer                            │
│                    (Web Browser)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   Ingress (nginx)    │
          │   - dashboard.local  │
          │   - api.local        │
          └──────────┬───────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
┌─────────▼─────────┐  ┌────────▼──────────┐
│   Dashboard Pod    │  │   Backend API Pod  │
│   (React + nginx)  │  │   (Node.js)        │
│   Port: 3000       │  │   Port: 4000       │
└────────────────────┘  └────────┬───────────┘
                                 │
                      ┌──────────▼───────────┐
                      │  Kubernetes API      │
                      │  (RBAC Protected)    │
                      └──────────┬───────────┘
                                 │
          ┌──────────────────────┴─────────────────────┐
          │                                            │
┌─────────▼──────────────┐              ┌──────────────▼────────┐
│  Store Namespace 1     │              │  Store Namespace 2     │
│  (store-abc123)        │              │  (store-xyz789)        │
│                        │              │                        │
│  ├─ Medusa Backend     │              │  ├─ WooCommerce        │
│  ├─ PostgreSQL DB      │              │  ├─ MySQL DB           │
│  ├─ Redis Cache        │              │  ├─ WordPress          │
│  ├─ PVC (5Gi)          │              │  ├─ PVC (5Gi)          │
│  └─ Ingress (storefront)│             │  └─ Ingress (storefront)│
└────────────────────────┘              └───────────────────────┘
```

## Core Design Decisions

### 1. Namespace-Per-Store Isolation

**Decision:** Each store runs in its own Kubernetes namespace.

**Rationale:**
- **Strong Isolation:** Namespaces provide resource boundaries, preventing stores from interfering with each other
- **Security:** RBAC can be applied per-namespace for fine-grained access control
- **Resource Quotas:** CPU, memory, and storage limits can be enforced per store
- **Clean Teardown:** Deleting a namespace cascades to all resources

**Tradeoffs:**
- ✅ **Pros:**
  - Natural multi-tenancy
  - Easy cleanup (delete namespace = delete all resources)
  - Resource quota enforcement
  - Network policy isolation possible
  
- ❌ **Cons:**
  - Higher resource overhead (each namespace has metadata)
  - More complex for cross-store operations
  - Potential namespace quota limits (default: 10,000 per cluster)

**Alternative Considered:** Label-based separation within a single namespace
- Rejected because: Harder to enforce resource quotas, less secure, cleanup more error-prone

### 2. StatefulSets for Databases

**Decision:** Use StatefulSets for PostgreSQL/MySQL with PersistentVolumeClaims.

**Rationale:**
- **Stable Storage:** PVCs ensure data persists across pod restarts
- **Ordered Deployment:** StatefulSets provide predictable pod names and scaling
- **Data Safety:** Prevents accidental data loss during deployments

**Tradeoffs:**
- ✅ **Pros:**
  - Data persistence
  - Stable network identities
  - Ordered, graceful scaling
  
- ❌ **Cons:**
  - Slower scaling (sequential)
  - More complex than Deployments
  - Requires storage provisioner

**Alternative Considered:** External managed databases (RDS, Cloud SQL)
- For production: Recommended for better reliability and backups
- For local/testing: StatefulSets are sufficient and self-contained

### 3. Helm for Deployment Management

**Decision:** Use Helm charts for all deployments with environment-specific values files.

**Rationale:**
- **Templating:** Reuse templates across local/production with different values
- **Versioning:** Track deployment versions
- **Rollback:** Easy rollback to previous versions
- **Package Management:** Helm makes deployments reproducible

**Tradeoffs:**
- ✅ **Pros:**
  - Single source of truth for deployments
  - Environment-specific configurations (values-local.yaml, values-prod.yaml)
  - Built-in rollback support
  - Widely adopted standard
  
- ❌ **Cons:**
  - Learning curve for Helm templating
  - YAML complexity can grow
  - Template debugging can be difficult

**Alternative Considered:** Kustomize
- Rejected because: Helm's templating is more powerful for our use case where we need significant differences between local/prod

### 4. In-Memory Store State

**Decision:** Backend stores created stores in a Map data structure, reloaded from namespaces on startup.

**Rationale:**
- **Simplicity:** No external database needed for the platform itself
- **Fast Access:** O(1) lookups for store information
- **Kubernetes as Source of Truth:** Namespaces are the authoritative state

**Tradeoffs:**
- ✅ **Pros:**
  - Simple implementation
  - No additional dependencies
  - Fast performance
  - Kubernetes namespaces are persistent
  
- ❌ **Cons:**
  - State lost on backend restart (but recoverable from K8s)
  - No history/audit trail built-in
  - Horizontal scaling requires shared state

**Future Improvement:**
- Add Redis or etcd for shared state across multiple backend replicas
- Add PostgreSQL for audit trail and historical data

### 5. Synchronous Provisioning with Async Status Updates

**Decision:** API returns immediately with "Provisioning" status; actual provisioning happens asynchronously.

**Rationale:**
- **User Experience:** User doesn't wait 2-3 minutes for API response
- **Reliability:** Long-running operations can fail without timing out the HTTP request
- **Scalability:** Backend can queue provisioning tasks

**Tradeoffs:**
- ✅ **Pros:**
  - Better UX (non-blocking)
  - API remains responsive
  - Can implement retry logic
  
- ❌ **Cons:**
  - Requires polling or websockets for status updates
  - More complex error handling
  - Users must check back for completion

**Current Implementation:** Dashboard polls every 10 seconds for status updates.

### 6. Non-Root Container Execution

**Decision:** All containers run as non-root user (UID 1000).

**Rationale:**
- **Security:** Reduces blast radius if container is compromised
- **Best Practice:** Aligns with security hardening guidelines
- **Compliance:** Required for many production environments

**Tradeoffs:**
- ✅ **Pros:**
  - Improved security posture
  - Prevents privilege escalation
  - Industry best practice
  
- ❌ **Cons:**
  - More complex Dockerfile (explicit user creation)
  - Some images require modification
  - Permission issues if not handled correctly

## Scaling Strategy

### Horizontal Scaling

**Platform Components (Dashboard & Backend):**
- **HorizontalPodAutoscaler** configured in values.yaml
- Scales based on CPU utilization (default: 70%)
- Backend: 2-5 replicas (prod), 1 replica (local)
- Dashboard: 2-5 replicas (prod), 1 replica (local)

**Store Components:**
- Backend API: Can scale horizontally (stateless)
- Database: Single replica (StatefulSet) - vertical scaling recommended
- Redis: Single replica - can be clustered for HA

### Concurrency Controls

**Problem:** Multiple stores provisioning simultaneously could overwhelm the cluster.

**Current Approach:**
- Max stores per user: 10 (configurable via `MAX_STORES_PER_USER`)
- Resource quotas per namespace prevent runaway resource consumption
- No explicit queue system

**Future Improvements:**
- Add job queue (BullMQ, Celery) for provisioning tasks
- Implement rate limiting per user/IP
- Add priority queue for paid vs free tiers

## Idempotency & Failure Handling

### Idempotent Operations

**Create Namespace:**
```typescript
try {
  await k8sApi.createNamespace(namespace);
} catch (error) {
  if (error.statusCode !== 409) throw error; // Ignore if exists
}
```

**Strategy:** All Kubernetes operations check for 409 (Conflict) and treat as success if resource already exists.

### Failure Handling

**Scenarios & Recovery:**

1. **Pod Fails to Start:**
   - Kubernetes restarts automatically (restartPolicy: Always)
   - Readiness probes prevent traffic to unhealthy pods
   - Status updates to "Failed" after timeout

2. **Backend Crashes Mid-Provisioning:**
   - On restart, backend reloads stores from namespaces
   - In-progress stores show "Provisioning" status
   - User can retry or delete and recreate

3. **Database PVC Fails to Bind:**
   - Pod stuck in Pending state
   - User sees "Provisioning" indefinitely
   - **Improvement Needed:** Add timeout detection and status update to "Failed"

4. **Ingress Controller Down:**
   - Stores are provisioned but not accessible
   - Platform remains operational
   - **Improvement:** Add ingress health checks to store status

### Cleanup Guarantees

**Delete Store Operation:**
```typescript
await k8sClient.deleteNamespace(store.namespace);
```

**Cascade Deletion:**
- Deleting namespace deletes all child resources (Deployments, Services, PVCs, Ingresses)
- Kubernetes garbage collector handles cleanup
- PVCs deletion triggers PV deletion (if ReclaimPolicy: Delete)

**Edge Cases:**
- If namespace is stuck in "Terminating": Finalizers may need manual removal
- If PVC is mounted: Pod must be deleted first
- **Solution:** Namespace deletion waits for all resources to terminate

## Local vs Production Differences

### Configuration Changes (Helm Values)

| Aspect | Local (Kind) | Production (k3s/VPS) |
|--------|-------------|----------------------|
| **Domain** | `.local` | `.yourdomain.com` |
| **Image Registry** | `localhost:5001` | Docker Hub / private registry |
| **Image Pull Policy** | `Never` | `IfNotPresent` |
| **Replicas** | 1 | 2-5 (with HPA) |
| **Resource Requests** | Low (50m CPU, 128Mi RAM) | Higher (200m CPU, 512Mi RAM) |
| **Storage Class** | `standard` | `local-path` (k3s) |
| **TLS/SSL** | Disabled | Enabled (cert-manager) |
| **Ingress Annotations** | `ssl-redirect: false` | `ssl-redirect: true` |
| **Autoscaling** | Disabled | Enabled |
| **Network Policies** | Disabled | Enabled |
| **Monitoring** | Disabled | Enabled (Prometheus) |

### Infrastructure Changes

**Local:**
- Kind cluster (single-node or 3-node)
- Local Docker registry
- Port forwarding for access
- No external DNS

**Production:**
- k3s on VPS (multi-node possible)
- External container registry (Docker Hub, ECR, GCR)
- Real DNS with cert-manager for TLS
- Load balancer or NodePort for ingress
- External storage provider
- Monitoring stack (Prometheus + Grafana)

### Deployment Process

**Local:**
```powershell
./scripts/deploy-local.ps1
```

**Production:**
```bash
# On VPS
curl -sfL https://get.k3s.io | sh -

# From local machine
helm install store-platform ./helm-charts/store-platform \
  -f ./helm-charts/store-platform/values-prod.yaml \
  --set global.domain=.yourdomain.com \
  --set backend.image.repository=your-registry/backend \
  --set dashboard.image.repository=your-registry/dashboard
```

## Security Considerations

### RBAC (Role-Based Access Control)

**Platform ServiceAccount:**
- ClusterRole with permissions to create/delete namespaces
- Create pods, services, deployments, statefulsets
- Manage ingresses, configmaps, secrets
- **Principle of Least Privilege:** Only necessary permissions granted

**Future Improvement:** Separate RBAC for read-only operations

### Secrets Management

**Current Approach:**
- Secrets stored as Kubernetes Secrets (base64 encoded)
- Database passwords generated randomly per store
- No hardcoded secrets in source code

**Production Improvements:**
- Use external secrets manager (Vault, AWS Secrets Manager)
- Implement secret rotation
- Encrypt secrets at rest (enable encryption provider)

### Network Isolation

**Current:**
- Namespace isolation provides basic separation
- NetworkPolicies: Disabled by default (can enable in values.yaml)

**Production Recommendation:**
- Enable NetworkPolicies: deny-by-default, allow required traffic
- Use service mesh (Istio, Linkerd) for mTLS between services

### Container Security

**Implemented:**
- Non-root user (UID 1000)
- Read-only root filesystem where possible
- Drop all capabilities
- SecurityContext applied to all pods

**Future:**
- Image scanning (Trivy, Clair)
- Pod Security Standards enforcement
- Seccomp profiles

## Performance & Reliability

### Resource Quotas

**Per Store Namespace:**
- CPU: 2 cores (request/limit)
- Memory: 4Gi
- Storage: 10Gi
- PVCs: 5 max

**Benefits:**
- Prevents single store from consuming all cluster resources
- Predictable resource allocation
- Cost control

### Health Checks

**Liveness Probes:**
- Check if container is alive
- Restart if fails (default: 3 failures)

**Readiness Probes:**
- Check if container can serve traffic
- Remove from service endpoints if not ready

**Current Implementation:**
- Backend: HTTP GET /health every 10s
- Database: TCP check on port 5432/3306

### Observability

**Current:**
- Kubernetes events
- Pod logs via kubectl
- Basic metrics via kubectl top

**Production Additions Needed:**
- Prometheus for metrics collection
- Grafana for visualization
- Loki or ELK for log aggregation
- Jaeger for distributed tracing
- Custom metrics (stores created, provisioning duration, failure rate)

## Known Limitations & Future Work

### Current Limitations

1. **No Multi-Backend Replicas State Sharing:**
   - Store state is in-memory per backend pod
   - Scaling backend horizontally requires shared state (Redis/etcd)

2. **No Provisioning Queue:**
   - Multiple concurrent provisions might strain cluster
   - Should add job queue for better control

3. **Limited Error Recovery:**
   - If provisioning fails mid-way, manual cleanup needed
   - Should implement automatic retry and rollback

4. **No Store Upgrade Mechanism:**
   - Can't upgrade store engine versions post-deployment
   - Should add version management and migration paths

5. **No Backup/Restore:**
   - Database backups not automated
   - Should integrate Velero or custom backup solution

6. **Single Database Instance:**
   - Database is single point of failure
   - Should offer HA database option for production

### Future Enhancements

1. **Multi-Tenancy Improvements:**
   - User authentication & authorization
   - Per-user quotas and billing
   - Store templates and marketplace

2. **Advanced Orchestration:**
   - Blue-green deployments for stores
   - Canary releases
   - Automatic scaling based on traffic

3. **Developer Experience:**
   - CLI tool for management
   - Terraform provider
   - GitHub Actions integration

4. **Monitoring & Alerts:**
   - Store health dashboard
   - Automatic alerts on failures
   - Performance metrics

5. **WooCommerce Full Implementation:**
   - Currently stubbed
   - Add WordPress + WooCommerce provisioning
   - Support multiple PHP versions

## Conclusion

This architecture prioritizes **security**, **isolation**, and **operability** while maintaining simplicity for local development. The Helm-based approach ensures the same codebase works from local Kind clusters to production VPS deployments with only configuration changes.

The namespace-per-store model provides strong isolation guarantees and clean resource lifecycle management, making it suitable for multi-tenant SaaS deployment while remaining simple enough for learning and development.