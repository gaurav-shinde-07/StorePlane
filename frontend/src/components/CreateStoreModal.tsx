import React, { useState } from 'react';
import { StoreEngine, CreateStoreRequest } from '../types';

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (request: CreateStoreRequest) => void;
  isLoading: boolean;
}

const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading
}) => {
  const [storeName, setStoreName] = useState('');
  const [engine, setEngine] = useState<StoreEngine>(StoreEngine.MEDUSA);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeName.trim()) {
      alert('Please enter a store name');
      return;
    }

    onCreate({
      name: storeName.trim(),
      engine
    });

    // Reset form
    setStoreName('');
    setEngine(StoreEngine.MEDUSA);
  };

  const handleClose = () => {
    if (!isLoading) {
      setStoreName('');
      setEngine(StoreEngine.MEDUSA);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isLoading}
          title="Close modal"
          aria-label="Close modal"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Store</h2>
          <p className="text-sm text-gray-600">
            Deploy a new ecommerce store in your Kubernetes cluster
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Store Name */}
          <div>
            <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-2">
              Store Name *
            </label>
            <input
              type="text"
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="my-awesome-store"
              title="Store name: only lowercase letters, numbers, and hyphens"
              aria-label="Store name"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              pattern="^[a-z0-9-]+$"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
          </div>

          {/* Engine Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Store Engine *
            </label>
            <div className="space-y-3">
              {/* MedusaJS Option */}
              <div
                onClick={() => !isLoading && setEngine(StoreEngine.MEDUSA)}
                onKeyDown={(e) => {
                  if (!isLoading && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setEngine(StoreEngine.MEDUSA);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Select MedusaJS engine"
                className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  engine === StoreEngine.MEDUSA
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center h-5">
                  <input
                    type="radio"
                    id="engine-medusa"
                    name="engine"
                    value={StoreEngine.MEDUSA}
                    checked={engine === StoreEngine.MEDUSA}
                    onChange={() => setEngine(StoreEngine.MEDUSA)}
                    disabled={isLoading}
                    aria-label="MedusaJS engine"
                    title="MedusaJS"
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl" role="img" aria-label="shopping bags">🛍️</span>
                    <label htmlFor="engine-medusa" className="font-medium text-gray-900 cursor-pointer">
                      MedusaJS
                    </label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Modern, headless commerce platform with Next.js storefront
                  </p>
                </div>
              </div>

              {/* WooCommerce Option */}
              <div
                onClick={() => !isLoading && setEngine(StoreEngine.WOOCOMMERCE)}
                onKeyDown={(e) => {
                  if (!isLoading && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setEngine(StoreEngine.WOOCOMMERCE);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Select WooCommerce engine"
                className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  engine === StoreEngine.WOOCOMMERCE
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center h-5">
                  <input
                    type="radio"
                    id="engine-woocommerce"
                    name="engine"
                    value={StoreEngine.WOOCOMMERCE}
                    checked={engine === StoreEngine.WOOCOMMERCE}
                    onChange={() => setEngine(StoreEngine.WOOCOMMERCE)}
                    disabled={isLoading}
                    aria-label="WooCommerce engine"
                    title="WooCommerce"
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl" role="img" aria-label="shopping cart">🛒</span>
                    <label htmlFor="engine-woocommerce" className="font-medium text-gray-900 cursor-pointer">
                      WooCommerce
                    </label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    WordPress + WooCommerce (Implementation in progress)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 text-lg">ℹ️</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Provisioning takes 2-3 minutes</p>
                <p className="text-xs">
                  Your store will include: Database, Backend API, Storefront, and automatic DNS configuration
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              title="Cancel"
              aria-label="Cancel"
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !storeName.trim()}
              title="Create store"
              aria-label="Create store"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Create Store</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStoreModal;