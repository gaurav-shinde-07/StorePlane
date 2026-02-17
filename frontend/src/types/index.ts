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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}