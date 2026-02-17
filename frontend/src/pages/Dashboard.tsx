import React, { useState, useEffect } from 'react';
import { Store, CreateStoreRequest } from '../types';
import apiService from '../services/api';
import StoreCard from '../components/StoreCard';
import CreateStoreModal from '../components/CreateStoreModal';

const Dashboard: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState(false);

  // Load stores on mount
  useEffect(() => {
    checkApiHealth();
    loadStores();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadStores, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkApiHealth = async () => {
    try {
      const healthy = await apiService.healthCheck();
      setApiHealthy(healthy);
    } catch (error) {
      setApiHealthy(false);
    }
  };

  const loadStores = async () => {
    try {
      const fetchedStores = await apiService.getStores();
      setStores(fetchedStores);
      setError(null);
      setApiHealthy(true);
    } catch (error: any) {
      console.error('Failed to load stores:', error);
      setError(error.message);
      setApiHealthy(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStore = async (request: CreateStoreRequest) => {
    setIsCreating(true);
    try {
      const newStore = await apiService.createStore(request);
      setStores([...stores, newStore]);
      setIsModalOpen(false);
      setError(null);
      
      // Show success message
      alert(`Store "${request.name}" is being provisioned! This may take 2-3 minutes.`);
    } catch (error: any) {
      console.error('Failed to create store:', error);
      alert(`Failed to create store: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteStore = async (id: string) => {
    try {
      await apiService.deleteStore(id);
      setStores(stores.filter(s => s.id !== id));
      setError(null);
    } catch (error: any) {
      console.error('Failed to delete store:', error);
      alert(`Failed to delete store: ${error.message}`);
    }
  };

  const handleRefreshStore = async (id: string) => {
    try {
      const updatedStore = await apiService.getStore(id);
      setStores(stores.map(s => s.id === id ? updatedStore : s));
      setError(null);
    } catch (error: any) {
      console.error('Failed to refresh store:', error);
      alert(`Failed to refresh store: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <span className="text-4xl">🏪</span>
                <span>Store Platform</span>
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Kubernetes-powered ecommerce store orchestration
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* API Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${apiHealthy ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm text-gray-600">
                  API {apiHealthy ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {/* Create Store Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm flex items-center space-x-2"
              >
                <span className="text-xl">➕</span>
                <span>Create New Store</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Stores</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stores.length}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Ready</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {stores.filter(s => s.status === 'Ready').length}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Provisioning</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {stores.filter(s => s.status === 'Provisioning').length}
                </p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Failed</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {stores.filter(s => s.status === 'Failed').length}
                </p>
              </div>
              <div className="text-4xl">❌</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && !apiHealthy && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Connection Error</p>
                <p className="text-xs text-red-600 mt-1">
                  Unable to connect to backend API. Make sure the backend is running on port 4000.
                </p>
                <button
                  onClick={loadStores}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="animate-spin h-12 w-12 text-primary-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading stores...</p>
          </div>
        ) : stores.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stores yet</h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first store. It only takes a few minutes!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium inline-flex items-center space-x-2"
            >
              <span className="text-xl">➕</span>
              <span>Create Your First Store</span>
            </button>
          </div>
        ) : (
          /* Store Grid */
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Stores ({stores.length})
              </h2>
              <button
                onClick={loadStores}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center space-x-1"
              >
                <span>🔄</span>
                <span>Refresh All</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map(store => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onDelete={handleDeleteStore}
                  onRefresh={handleRefreshStore}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Store Modal */}
      <CreateStoreModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateStore}
        isLoading={isCreating}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
            Store Platform - Kubernetes Store Orchestration System
          </p>
          <p className="text-center text-xs text-gray-500 mt-1">
            Built with React + TypeScript + Kubernetes
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;