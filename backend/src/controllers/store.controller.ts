import { Request, Response } from 'express';
import { StoreOrchestrationService } from '../services/store-service';
import { CreateStoreRequest, ApiResponse, StoreEngine } from '../types';

export class StoreController {
  private storeService: StoreOrchestrationService;

  constructor() {
    this.storeService = new StoreOrchestrationService();
  }

  // GET /api/stores
  getAllStores = async (req: Request, res: Response): Promise<void> => {
    try {
      const stores = this.storeService.getAllStores();
      
      const response: ApiResponse = {
        success: true,
        data: stores,
        message: `Found ${stores.length} store(s)`
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error.message
      };

      res.status(500).json(response);
    }
  };

  // GET /api/stores/:id
  getStore = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const store = await this.storeService.refreshStoreStatus(id);

      if (!store) {
        const response: ApiResponse = {
          success: false,
          error: 'Store not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: store
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error fetching store:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error.message
      };

      res.status(500).json(response);
    }
  };

  // POST /api/stores
  createStore = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, engine } = req.body as CreateStoreRequest;

      // Validation
      if (!name || !engine) {
        const response: ApiResponse = {
          success: false,
          error: 'Missing required fields: name and engine'
        };
        res.status(400).json(response);
        return;
      }

      if (!Object.values(StoreEngine).includes(engine)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid engine. Must be one of: ${Object.values(StoreEngine).join(', ')}`
        };
        res.status(400).json(response);
        return;
      }

      // Check max stores limit (abuse prevention)
      const maxStores = parseInt(process.env.MAX_STORES_PER_USER || '10');
      const currentStores = this.storeService.getAllStores().length;

      if (currentStores >= maxStores) {
        const response: ApiResponse = {
          success: false,
          error: `Maximum store limit reached (${maxStores})`
        };
        res.status(429).json(response);
        return;
      }

      const store = await this.storeService.createStore({ name, engine });

      const response: ApiResponse = {
        success: true,
        data: store,
        message: 'Store creation initiated'
      };

      res.status(202).json(response);
    } catch (error: any) {
      console.error('Error creating store:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error.message
      };

      res.status(500).json(response);
    }
  };

  // DELETE /api/stores/:id
  deleteStore = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await this.storeService.deleteStore(id);

      const response: ApiResponse = {
        success: true,
        message: `Store ${id} deleted successfully`
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error deleting store:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error.message
      };

      if (error.message === 'Store not found') {
        res.status(404).json(response);
      } else {
        res.status(500).json(response);
      }
    }
  };

  // GET /api/health
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      message: 'Store Platform API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  };
}