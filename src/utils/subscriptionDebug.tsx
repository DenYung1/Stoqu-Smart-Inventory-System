import { useEffect, useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';

interface SubscriptionDebugInfo {
  hasAccess: boolean;
  subscriptionType: string;
  status: string;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  daysRemaining: number;
  lastUpdated: string;
  cacheCleared: boolean;
}

export const useSubscriptionDebug = () => {
  const subscription = useSubscription();
  const [debugInfo, setDebugInfo] = useState<SubscriptionDebugInfo | null>(null);
  const [changeLog, setChangeLog] = useState<string[]>([]);

  useEffect(() => {
    const newDebugInfo: SubscriptionDebugInfo = {
      hasAccess: subscription.hasAccess,
      subscriptionType: subscription.subscriptionType,
      status: subscription.subscription?.status || 'none',
      isTrialActive: subscription.isTrialActive,
      isSubscriptionActive: subscription.isSubscriptionActive,
      daysRemaining: subscription.daysRemaining,
      lastUpdated: new Date().toISOString(),
      cacheCleared: false,
    };

    // Log changes
    if (debugInfo) {
      const changes: string[] = [];
      if (debugInfo.hasAccess !== newDebugInfo.hasAccess) {
        changes.push(`hasAccess: ${debugInfo.hasAccess} → ${newDebugInfo.hasAccess}`);
      }
      if (debugInfo.status !== newDebugInfo.status) {
        changes.push(`status: ${debugInfo.status} → ${newDebugInfo.status}`);
      }
      if (debugInfo.subscriptionType !== newDebugInfo.subscriptionType) {
        changes.push(`type: ${debugInfo.subscriptionType} → ${newDebugInfo.subscriptionType}`);
      }
      
      if (changes.length > 0) {
        const timestamp = new Date().toLocaleTimeString();
        setChangeLog(prev => [`[${timestamp}] ${changes.join(', ')}`, ...prev.slice(0, 9)]);
      }
    }

    setDebugInfo(newDebugInfo);
  }, [
    subscription.hasAccess,
    subscription.subscriptionType,
    subscription.subscription?.status,
    subscription.isTrialActive,
    subscription.isSubscriptionActive,
    subscription.daysRemaining,
  ]);

  const clearCacheAndRefresh = () => {
    if (subscription.clearCache) {
      subscription.clearCache();
      setDebugInfo(prev => prev ? { ...prev, cacheCleared: true } : null);
      subscription.refreshStatus();
      
      const timestamp = new Date().toLocaleTimeString();
      setChangeLog(prev => [`[${timestamp}] Cache cleared and status refreshed`, ...prev.slice(0, 9)]);
    }
  };

  return {
    debugInfo,
    changeLog,
    clearCacheAndRefresh,
    subscription,
  };
};

// Debug component that can be added to the app during development
export const SubscriptionDebugPanel = () => {
  const { debugInfo, changeLog, clearCacheAndRefresh } = useSubscriptionDebug();
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Debug Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white p-2 rounded-full shadow-lg z-50 hover:bg-purple-700"
        title="Toggle Subscription Debug Panel"
      >
        🐛
      </button>

      {/* Debug Panel */}
      {isVisible && debugInfo && (
        <div className="fixed bottom-16 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-sm w-80 z-50 text-xs">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-sm">Subscription Debug</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Current Status */}
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <div className="grid grid-cols-2 gap-1">
              <div>Access: <span className={debugInfo.hasAccess ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.hasAccess ? 'YES' : 'NO'}
              </span></div>
              <div>Type: <span className="font-mono">{debugInfo.subscriptionType}</span></div>
              <div>Status: <span className="font-mono">{debugInfo.status}</span></div>
              <div>Days: <span className="font-mono">{debugInfo.daysRemaining}</span></div>
              <div>Trial: <span className={debugInfo.isTrialActive ? 'text-green-600' : 'text-gray-400'}>
                {debugInfo.isTrialActive ? 'YES' : 'NO'}
              </span></div>
              <div>Paid: <span className={debugInfo.isSubscriptionActive ? 'text-green-600' : 'text-gray-400'}>
                {debugInfo.isSubscriptionActive ? 'YES' : 'NO'}
              </span></div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Updated: {new Date(debugInfo.lastUpdated).toLocaleTimeString()}
            </div>
          </div>

          {/* Actions */}
          <div className="mb-3">
            <button
              onClick={clearCacheAndRefresh}
              className="w-full bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700"
            >
              Clear Cache & Refresh
            </button>
          </div>

          {/* Change Log */}
          {changeLog.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Recent Changes:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {changeLog.map((change, index) => (
                  <div key={index} className="text-xs text-gray-600 font-mono bg-gray-50 p-1 rounded">
                    {change}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
