import * as k8s from '@kubernetes/client-node';
import { StoreResourceStatus } from '../types';

export class KubernetesClient {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;
  private networkingApi: k8s.NetworkingV1Api;
  private rbacApi: k8s.RbacAuthorizationV1Api;

  constructor() {
    this.kc = new k8s.KubeConfig();
    
    // Load config based on environment
    if (process.env.IN_CLUSTER === 'true') {
      this.kc.loadFromCluster();
    } else {
      this.kc.loadFromDefault();
    }

    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
    this.rbacApi = this.kc.makeApiClient(k8s.RbacAuthorizationV1Api);
  }

  // Namespace Operations
  async createNamespace(name: string, labels: Record<string, string> = {}): Promise<void> {
    const namespace: k8s.V1Namespace = {
      metadata: {
        name,
        labels: {
          'app.kubernetes.io/managed-by': 'store-platform',
          ...labels
        }
      }
    };

    try {
      await this.k8sApi.createNamespace(namespace);
      console.log(`✅ Created namespace: ${name}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 409) { // Ignore if already exists
        throw error;
      }
      console.log(`ℹ️  Namespace already exists: ${name}`);
    }
  }

  async deleteNamespace(name: string): Promise<void> {
    try {
      await this.k8sApi.deleteNamespace(name);
      console.log(`🗑️  Deleted namespace: ${name}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 404) {
        throw error;
      }
    }
  }

  async namespaceExists(name: string): Promise<boolean> {
    try {
      await this.k8sApi.readNamespace(name);
      return true;
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  // Secret Operations
  async createSecret(
    namespace: string,
    name: string,
    data: Record<string, string>
  ): Promise<void> {
    const secret: k8s.V1Secret = {
      metadata: {
        name,
        namespace
      },
      type: 'Opaque',
      stringData: data
    };

    try {
      await this.k8sApi.createNamespacedSecret(namespace, secret);
      console.log(`🔐 Created secret: ${name} in ${namespace}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 409) {
        throw error;
      }
    }
  }

  // ConfigMap Operations
  async createConfigMap(
    namespace: string,
    name: string,
    data: Record<string, string>
  ): Promise<void> {
    const configMap: k8s.V1ConfigMap = {
      metadata: {
        name,
        namespace
      },
      data
    };

    try {
      await this.k8sApi.createNamespacedConfigMap(namespace, configMap);
      console.log(`📝 Created configmap: ${name} in ${namespace}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 409) {
        throw error;
      }
    }
  }

  // PVC Operations
  async createPVC(
    namespace: string,
    name: string,
    storageSize: string = '5Gi',
    storageClass?: string
  ): Promise<void> {
    const pvc: k8s.V1PersistentVolumeClaim = {
      metadata: {
        name,
        namespace
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: storageSize
          }
        },
        ...(storageClass && { storageClassName: storageClass })
      }
    };

    try {
      await this.k8sApi.createNamespacedPersistentVolumeClaim(namespace, pvc);
      console.log(`💾 Created PVC: ${name} in ${namespace}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 409) {
        throw error;
      }
    }
  }

  // Service Operations
  async createService(
    namespace: string,
    name: string,
    selector: Record<string, string>,
    ports: Array<{ name: string; port: number; targetPort: number }>
  ): Promise<void> {
    const service: k8s.V1Service = {
      metadata: {
        name,
        namespace
      },
      spec: {
        selector,
        ports: ports.map(p => ({
          name: p.name,
          port: p.port,
          targetPort: p.targetPort as any,
          protocol: 'TCP'
        })),
        type: 'ClusterIP'
      }
    };

    try {
      await this.k8sApi.createNamespacedService(namespace, service);
      console.log(`🌐 Created service: ${name} in ${namespace}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 409) {
        throw error;
      }
    }
  }

  // Deployment Operations
  async createDeployment(
    namespace: string,
    name: string,
    image: string,
    replicas: number,
    labels: Record<string, string>,
    env: k8s.V1EnvVar[],
    resources?: {
      requests?: { cpu: string; memory: string };
      limits?: { cpu: string; memory: string };
    }
  ): Promise<void> {
    const deployment: k8s.V1Deployment = {
      metadata: {
        name,
        namespace
      },
      spec: {
        replicas,
        selector: {
          matchLabels: labels
        },
        template: {
          metadata: {
            labels
          },
          spec: {
            securityContext: {
              runAsNonRoot: true,
              runAsUser: 1000,
              fsGroup: 1000
            },
            containers: [
              {
                name: name,
                image,
                env,
                ports: [{ containerPort: 9000 }],
                resources: resources || {
                  requests: { cpu: '100m', memory: '256Mi' },
                  limits: { cpu: '500m', memory: '1Gi' }
                },
                livenessProbe: {
                  httpGet: {
                    path: '/health',
                    port: 9000 as any
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: 10
                },
                readinessProbe: {
                  httpGet: {
                    path: '/health',
                    port: 9000 as any
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 5
                },
                securityContext: {
                  allowPrivilegeEscalation: false,
                  readOnlyRootFilesystem: false
                }
              }
            ]
          }
        }
      }
    };

    try {
      await this.appsApi.createNamespacedDeployment(namespace, deployment);
      console.log(`🚀 Created deployment: ${name} in ${namespace}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 409) {
        throw error;
      }
    }
  }

  // StatefulSet Operations (for databases)
  async createStatefulSet(
    namespace: string,
    name: string,
    image: string,
    labels: Record<string, string>,
    env: k8s.V1EnvVar[],
    volumeClaimName: string,
    volumeMountPath: string
  ): Promise<void> {
    const statefulSet: k8s.V1StatefulSet = {
      metadata: {
        name,
        namespace
      },
      spec: {
        serviceName: name,
        replicas: 1,
        selector: {
          matchLabels: labels
        },
        template: {
          metadata: {
            labels
          },
          spec: {
            securityContext: {
              runAsNonRoot: true,
              runAsUser: 999,
              fsGroup: 999
            },
            containers: [
              {
                name,
                image,
                env,
                ports: [{ containerPort: 5432 }],
                volumeMounts: [
                  {
                    name: 'data',
                    mountPath: volumeMountPath
                  }
                ],
                resources: {
                  requests: { cpu: '100m', memory: '256Mi' },
                  limits: { cpu: '500m', memory: '512Mi' }
                },
                securityContext: {
                  allowPrivilegeEscalation: false
                }
              }
            ],
            volumes: [
              {
                name: 'data',
                persistentVolumeClaim: {
                  claimName: volumeClaimName
                }
              }
            ]
          }
        }
      }
    };

    try {
      await this.appsApi.createNamespacedStatefulSet(namespace, statefulSet);
      console.log(`💿 Created statefulset: ${name} in ${namespace}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 409) {
        throw error;
      }
    }
  }

  // Ingress Operations
  async createIngress(
    namespace: string,
    name: string,
    host: string,
    serviceName: string,
    servicePort: number,
    ingressClass: string = 'nginx'
  ): Promise<void> {
    const ingress: k8s.V1Ingress = {
      metadata: {
        name,
        namespace,
        annotations: {
          'nginx.ingress.kubernetes.io/rewrite-target': '/'
        }
      },
      spec: {
        ingressClassName: ingressClass,
        rules: [
          {
            host,
            http: {
              paths: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: serviceName,
                      port: {
                        number: servicePort
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    };

    try {
      await this.networkingApi.createNamespacedIngress(namespace, ingress);
      console.log(`🌍 Created ingress: ${name} in ${namespace}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 409) {
        throw error;
      }
    }
  }

  // Resource Quota
  async createResourceQuota(
    namespace: string,
    cpuLimit: string,
    memoryLimit: string,
    storageLimit: string
  ): Promise<void> {
    const quota: k8s.V1ResourceQuota = {
      metadata: {
        name: 'store-quota',
        namespace
      },
      spec: {
        hard: {
          'requests.cpu': cpuLimit,
          'requests.memory': memoryLimit,
          'requests.storage': storageLimit,
          'persistentvolumeclaims': '5'
        }
      }
    };

    try {
      await this.k8sApi.createNamespacedResourceQuota(namespace, quota);
      console.log(`📊 Created resource quota in ${namespace}`);
    } catch (error: any) {
      if (error.response?.statusCode !== 409) {
        throw error;
      }
    }
  }

  // Check resource status
  async checkResourceStatus(namespace: string, storeName: string): Promise<StoreResourceStatus> {
    const status: StoreResourceStatus = {
      deployment: false,
      service: false,
      ingress: false,
      database: false,
      secrets: false
    };

    try {
      // Check deployment
      const deployment = await this.appsApi.readNamespacedDeployment(
        `${storeName}-backend`,
        namespace
      );
      status.deployment = (deployment.body.status?.availableReplicas || 0) > 0;

      // Check service
      await this.k8sApi.readNamespacedService(`${storeName}-backend`, namespace);
      status.service = true;

      // Check ingress
      await this.networkingApi.readNamespacedIngress(`${storeName}-ingress`, namespace);
      status.ingress = true;

      // Check database statefulset
      const db = await this.appsApi.readNamespacedStatefulSet(
        `${storeName}-db`,
        namespace
      );
      status.database = (db.body.status?.readyReplicas || 0) > 0;

      // Check secrets
      await this.k8sApi.readNamespacedSecret(`${storeName}-secrets`, namespace);
      status.secrets = true;

    } catch (error: any) {
      console.error('Error checking resource status:', error.message);
    }

    return status;
  }

  // Get all namespaces with specific label
  async getStoreNamespaces(): Promise<string[]> {
    try {
      const response = await this.k8sApi.listNamespace(
        undefined,
        undefined,
        undefined,
        undefined,
        'app.kubernetes.io/managed-by=store-platform'
      );
      return response.body.items.map(ns => ns.metadata?.name || '').filter(Boolean);
    } catch (error) {
      console.error('Error listing namespaces:', error);
      return [];
    }
  }
}