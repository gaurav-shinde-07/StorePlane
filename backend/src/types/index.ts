export enum StoreEngine {
  MEDUSA = 'medusa',
  WOOCOMMERCE = 'woocommerce'
}

export enum StoreStatus {
  PROVISIONING = 'Provisioning',
  READY = 'Ready',
  FAILED = 'Failed',
  DELETING = 'Deleting',
  DELETED = 'Deleted'
}

export interface Store {
  id: string;
  name: string;
  engine: StoreEngine;
  status: StoreStatus;
  namespace: string;
  urls: {
    storefront?: string;
    admin?: string;
  };
  createdAt: string;
  error?: string;
}

export interface CreateStoreRequest {
  name: string;
  engine: StoreEngine;
}

export interface StoreResourceStatus {
  deployment: boolean;
  service: boolean;
  ingress: boolean;
  database: boolean;
  secrets: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ResourceQuota {
  cpuRequest: string;
  cpuLimit: string;
  memoryRequest: string;
  memoryLimit: string;
  storage: string;
}

export interface StoreConfig {
  engine: StoreEngine;
  namespace: string;
  storeName: string;
  domain: string;
  resourceQuota: ResourceQuota;
  dbCredentials: {
    username: string;
    password: string;
    database: string;
  };
}