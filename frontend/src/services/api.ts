import axios, { AxiosInstance } from 'axios';
import { Store, CreateStoreRequest, ApiResponse } from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Get all stores
  async getStores(): Promise<Store[]> {
    try {
      const response = await this.client.get<ApiResponse<Store[]>>('/stores');
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch stores');
    }
  }

  // Get single store
  async getStore(id: string): Promise<Store> {
    try {
      const response = await this.client.get<ApiResponse<Store>>(`/stores/${id}`);
      if (!response.data.data) {
        throw new Error('Store not found');
      }
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching store:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch store');
    }
  }

  // Create store
  async createStore(request: CreateStoreRequest): Promise<Store> {
    try {
      const response = await this.client.post<ApiResponse<Store>>('/stores', request);
      if (!response.data.data) {
        throw new Error('Failed to create store');
      }
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating store:', error);
      throw new Error(error.response?.data?.error || 'Failed to create store');
    }
  }

  // Delete store
  async deleteStore(id: string): Promise<void> {
    try {
      await this.client.delete(`/stores/${id}`);
    } catch (error: any) {
      console.error('Error deleting store:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete store');
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.success;
    } catch (error) {
      return false;
    }
  }
}

export default new ApiService();