import React from 'react';
import { Store, StoreStatus, StoreEngine } from '../types';

interface StoreCardProps {
  store: Store;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onDelete, onRefresh }) => {
  const getStatusColor = (status: StoreStatus): string => {
    switch (status) {
      case StoreStatus.READY:
        return 'bg-green-100 text-green-800 border-green-200';
      case StoreStatus.PROVISIONING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case StoreStatus.FAILED:
        return 'bg-red-100 text-red-800 border-red-200';
      case StoreStatus.DELETING:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: StoreStatus): string => {
    switch (status) {
      case StoreStatus.READY:
        return '✅';
      case StoreStatus.PROVISIONING:
        return '⏳';
      case StoreStatus.FAILED:
        return '❌';
      case StoreStatus.DELETING:
        return '🗑️';
      default:
        return '❓';
    }
  };

  const getEngineIcon = (engine: StoreEngine | string): string => {
    return engine === StoreEngine.MEDUSA ? '🛍️' : '🛒';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${store.name}"? This action cannot be undone.`)) {
      onDelete(store.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{getEngineIcon(store.engine)}</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{store.engine}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(store.status)}`}>
          {getStatusIcon(store.status)} {store.status}
        </span>
      </div>

      {/* Store Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium w-24">Store ID:</span>
          <span className="font-mono text-xs">{store.id}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium w-24">Namespace:</span>
          <span className="font-mono text-xs">{store.namespace}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium w-24">Created:</span>
          <span>{formatDate(store.createdAt)}</span>
        </div>
      </div>

      {/* URLs */}
      {store.status === StoreStatus.READY && store.urls && (
        <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-xs font-semibold text-gray-700 mb-2">Access URLs:</p>
          {store.urls.storefront && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600 w-20">Storefront:</span>
              <a
                href={store.urls.storefront}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:text-primary-800 hover:underline truncate"
              >
                {store.urls.storefront}
              </a>
            </div>
          )}
          {store.urls.admin && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600 w-20">Admin:</span>
              <a
                href={store.urls.admin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:text-primary-800 hover:underline truncate"
              >
                {store.urls.admin}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {store.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-800 font-medium">Error:</p>
          <p className="text-xs text-red-600 mt-1">{store.error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={() => onRefresh(store.id)}
          disabled={store.status === StoreStatus.DELETING}
          className="flex-1 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Refresh
        </button>
        <button
          onClick={handleDelete}
          disabled={store.status === StoreStatus.DELETING}
          className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
};

export default StoreCard;