import { v4 as uuidv4 } from 'uuid';
import { KubernetesClient } from '../utils/k8s-client';
import {
  Store,
  StoreEngine,
  StoreStatus,
  StoreConfig,
  CreateStoreRequest,
  ResourceQuota
} from '../types';
import * as k8s from '@kubernetes/client-node';

export class StoreOrchestrationService {
  private k8sClient: KubernetesClient;
  private stores: Map<string, Store> = new Map();
  private defaultDomain: string;
  private ingressClass: string;

  constructor() {
    this.k8sClient = new KubernetesClient();
    this.defaultDomain = process.env.DEFAULT_DOMAIN || '.local';
    this.ingressClass = process.env.INGRESS_CLASS || 'nginx';
    
    // Load existing stores on initialization
    this.loadExistingStores();
  }

  private async loadExistingStores(): Promise<void> {
    try {
      const namespaces = await this.k8sClient.getStoreNamespaces();
      console.log(`📦 Found ${namespaces.length} existing store namespaces`);
      
      // Reconstruct store objects from namespaces
      for (const ns of namespaces) {
        if (ns.startsWith('store-')) {
          const storeId = ns.replace('store-', '');
          const store: Store = {
            id: storeId,
            name: storeId,
            engine: StoreEngine.MEDUSA, // Default, would need metadata to determine
            status: StoreStatus.READY,
            namespace: ns,
            urls: {
              storefront: `http://${storeId}${this.defaultDomain}`,
              admin: `http://${storeId}-admin${this.defaultDomain}`
            },
            createdAt: new Date().toISOString()
          };
          this.stores.set(storeId, store);
        }
      }
    } catch (error) {
      console.error('Error loading existing stores:', error);
    }
  }

  async createStore(request: CreateStoreRequest): Promise<Store> {
    const storeId = `${request.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${uuidv4().slice(0, 8)}`;
    const namespace = `store-${storeId}`;

    // Initialize store object
    const store: Store = {
      id: storeId,
      name: request.name,
      engine: request.engine,
      status: StoreStatus.PROVISIONING,
      namespace,
      urls: {},
      createdAt: new Date().toISOString()
    };

    this.stores.set(storeId, store);

    // Start provisioning asynchronously
    this.provisionStore(storeId, request.engine).catch(error => {
      console.error(`Error provisioning store ${storeId}:`, error);
      store.status = StoreStatus.FAILED;
      store.error = error.message;
    });

    return store;
  }

  private async provisionStore(storeId: string, engine: StoreEngine): Promise<void> {
    const store = this.stores.get(storeId);
    if (!store) throw new Error('Store not found');

    const namespace = store.namespace;
    const storeName = storeId;

    try {
      console.log(`🚀 Starting provisioning for ${storeId} (${engine})`);

      // Step 1: Create namespace with labels
      await this.k8sClient.createNamespace(namespace, {
        'store-id': storeId,
        'store-engine': engine,
        'store-name': store.name
      });

      // Step 2: Apply resource quota
      const quota: ResourceQuota = {
        cpuRequest: process.env.DEFAULT_CPU_REQUEST || '100m',
        cpuLimit: process.env.DEFAULT_CPU_LIMIT || '500m',
        memoryRequest: process.env.DEFAULT_MEMORY_REQUEST || '256Mi',
        memoryLimit: process.env.DEFAULT_MEMORY_LIMIT || '1Gi',
        storage: process.env.DEFAULT_STORAGE || '5Gi'
      };

      await this.k8sClient.createResourceQuota(
        namespace,
        '2',
        '4Gi',
        '10Gi'
      );

      // Step 3: Generate credentials
      const dbPassword = this.generatePassword();
      const dbUsername = 'storeuser';
      const dbName = storeName.replace(/-/g, '_');

      // Step 4: Create secrets
      await this.createStoreSecrets(namespace, storeName, {
        username: dbUsername,
        password: dbPassword,
        database: dbName
      });

      // Step 5: Provision based on engine
      if (engine === StoreEngine.MEDUSA) {
        await this.provisionMedusaStore(namespace, storeName, {
          username: dbUsername,
          password: dbPassword,
          database: dbName
        });
      } else if (engine === StoreEngine.WOOCOMMERCE) {
        await this.provisionWooCommerceStore(namespace, storeName, {
          username: dbUsername,
          password: dbPassword,
          database: dbName
        });
      }

      // Step 6: Wait for resources to be ready
      await this.waitForStoreReady(namespace, storeName);

      // Step 7: Update store status
      store.status = StoreStatus.READY;
      store.urls = {
        storefront: `http://${storeName}${this.defaultDomain}`,
        admin: `http://${storeName}-admin${this.defaultDomain}`
      };

      console.log(`✅ Store ${storeId} is ready!`);

    } catch (error: any) {
      console.error(`❌ Failed to provision store ${storeId}:`, error);
      store.status = StoreStatus.FAILED;
      store.error = error.message;
      throw error;
    }
  }

  private async provisionMedusaStore(
    namespace: string,
    storeName: string,
    dbCredentials: { username: string; password: string; database: string }
  ): Promise<void> {
    console.log(`📦 Provisioning MedusaJS store in ${namespace}`);

    // Create PostgreSQL database
    await this.createPostgresDatabase(namespace, storeName, dbCredentials);

    // Create Medusa backend deployment
    const medusaEnv: k8s.V1EnvVar[] = [
      {
        name: 'DATABASE_URL',
        value: `postgres://${dbCredentials.username}:${dbCredentials.password}@${storeName}-db:5432/${dbCredentials.database}`
      },
      {
        name: 'REDIS_URL',
        value: `redis://${storeName}-redis:6379`
      },
      {
        name: 'JWT_SECRET',
        value: this.generatePassword(32)
      },
      {
        name: 'COOKIE_SECRET',
        value: this.generatePassword(32)
      },
      {
        name: 'PORT',
        value: '9000'
      }
    ];

    await this.k8sClient.createDeployment(
      namespace,
      `${storeName}-backend`,
      'medusajs/medusa:latest',
      1,
      { app: storeName, component: 'backend' },
      medusaEnv
    );

    // Create backend service
    await this.k8sClient.createService(
      namespace,
      `${storeName}-backend`,
      { app: storeName, component: 'backend' },
      [{ name: 'http', port: 9000, targetPort: 9000 }]
    );

    // Create Redis for session storage
    await this.createRedis(namespace, storeName);

    // Create ingress for storefront
    await this.k8sClient.createIngress(
      namespace,
      `${storeName}-ingress`,
      `${storeName}${this.defaultDomain}`,
      `${storeName}-backend`,
      9000,
      this.ingressClass
    );

    console.log(`✅ MedusaJS resources created in ${namespace}`);
  }

  private async provisionWooCommerceStore(
    namespace: string,
    storeName: string,
    dbCredentials: { username: string; password: string; database: string }
  ): Promise<void> {
    console.log(`📦 Provisioning WooCommerce store in ${namespace} (STUB)`);
    
    // TODO: Implement WooCommerce provisioning
    // This is stubbed for Round 1, architecture supports adding it
    
    throw new Error('WooCommerce provisioning not yet implemented');
  }

  private async createPostgresDatabase(
    namespace: string,
    storeName: string,
    credentials: { username: string; password: string; database: string }
  ): Promise<void> {
    // Create PVC for database
    await this.k8sClient.createPVC(namespace, `${storeName}-db-pvc`, '5Gi');

    // Create database service (headless for StatefulSet)
    await this.k8sClient.createService(
      namespace,
      `${storeName}-db`,
      { app: storeName, component: 'database' },
      [{ name: 'postgres', port: 5432, targetPort: 5432 }]
    );

    // Create PostgreSQL StatefulSet
    const postgresEnv: k8s.V1EnvVar[] = [
      { name: 'POSTGRES_USER', value: credentials.username },
      { name: 'POSTGRES_PASSWORD', value: credentials.password },
      { name: 'POSTGRES_DB', value: credentials.database },
      { name: 'PGDATA', value: '/var/lib/postgresql/data/pgdata' }
    ];

    await this.k8sClient.createStatefulSet(
      namespace,
      `${storeName}-db`,
      'postgres:15-alpine',
      { app: storeName, component: 'database' },
      postgresEnv,
      `${storeName}-db-pvc`,
      '/var/lib/postgresql/data'
    );
  }

  private async createRedis(namespace: string, storeName: string): Promise<void> {
    // Create Redis deployment
    await this.k8sClient.createDeployment(
      namespace,
      `${storeName}-redis`,
      'redis:7-alpine',
      1,
      { app: storeName, component: 'redis' },
      [],
      {
        requests: { cpu: '50m', memory: '128Mi' },
        limits: { cpu: '200m', memory: '256Mi' }
      }
    );

    // Create Redis service
    await this.k8sClient.createService(
      namespace,
      `${storeName}-redis`,
      { app: storeName, component: 'redis' },
      [{ name: 'redis', port: 6379, targetPort: 6379 }]
    );
  }

  private async createStoreSecrets(
    namespace: string,
    storeName: string,
    dbCredentials: { username: string; password: string; database: string }
  ): Promise<void> {
    await this.k8sClient.createSecret(namespace, `${storeName}-secrets`, {
      DB_USERNAME: dbCredentials.username,
      DB_PASSWORD: dbCredentials.password,
      DB_NAME: dbCredentials.database
    });
  }

  private async waitForStoreReady(namespace: string, storeName: string, timeoutSeconds: number = 300): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 5000; // 5 seconds

    while ((Date.now() - startTime) / 1000 < timeoutSeconds) {
      const status = await this.k8sClient.checkResourceStatus(namespace, storeName);
      
      console.log(`⏳ Checking status for ${storeName}:`, status);

      if (status.deployment && status.database && status.service && status.ingress) {
        console.log(`✅ All resources ready for ${storeName}`);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Timeout waiting for store ${storeName} to be ready`);
  }

  async deleteStore(storeId: string): Promise<void> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    store.status = StoreStatus.DELETING;

    try {
      console.log(`🗑️  Deleting store ${storeId} (namespace: ${store.namespace})`);
      
      // Delete namespace (cascades to all resources)
      await this.k8sClient.deleteNamespace(store.namespace);
      
      store.status = StoreStatus.DELETED;
      this.stores.delete(storeId);
      
      console.log(`✅ Store ${storeId} deleted successfully`);
    } catch (error: any) {
      console.error(`❌ Error deleting store ${storeId}:`, error);
      store.status = StoreStatus.FAILED;
      store.error = `Deletion failed: ${error.message}`;
      throw error;
    }
  }

  getStore(storeId: string): Store | undefined {
    return this.stores.get(storeId);
  }

  getAllStores(): Store[] {
    return Array.from(this.stores.values());
  }

  async refreshStoreStatus(storeId: string): Promise<Store> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    if (store.status === StoreStatus.PROVISIONING) {
      const status = await this.k8sClient.checkResourceStatus(store.namespace, storeId);
      
      if (status.deployment && status.database && status.service && status.ingress) {
        store.status = StoreStatus.READY;
      }
    }

    return store;
  }

  private generatePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}