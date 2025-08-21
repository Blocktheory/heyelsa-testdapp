import { useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';

const NetworkToastHandler: React.FC = () => {
  const { showToast } = useToast();
  const lastChainId = useRef<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Helper function to get chain name by chainId
  const getChainNameById = (chainId: string): string => {
    const chainNames: Record<string, string> = {
      '0x1': 'Ethereum Mainnet',
      '0x89': 'Polygon Mainnet',
      '0x2105': 'Base',
      '0x74c': 'Soneium',
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  };

  useEffect(() => {
    const handleNetworkSwitched = (event: any) => {
      
      // Get chain name from event details instead of stale React state
      let chainName = 'Unknown Network';
      let chainId = '';
      
      if (event.detail?.chainId) {
        chainId = event.detail.chainId;
        chainName = getChainNameById(chainId);
      } else if (event.detail?.networkName) {
        chainName = event.detail.networkName;
        chainId = event.detail.networkName; // Use network name as identifier
      }
      
      // Debounce: prevent multiple toasts for the same network switch
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      // Only show toast if the network actually changed
      if (chainId && chainId !== lastChainId.current) {
        debounceTimer.current = setTimeout(() => {
          showToast(`Network switched to ${chainName}`, 'info', 3000);
          lastChainId.current = chainId;
        }, 100); // 100ms debounce
      }
    };

    // Listen for both the existing wallet-network-changed event and the new NETWORK_SWITCHED_EVENT
    window.addEventListener('wallet-network-changed', handleNetworkSwitched);
    window.addEventListener('NETWORK_SWITCHED_EVENT', handleNetworkSwitched);

    return () => {
      window.removeEventListener('wallet-network-changed', handleNetworkSwitched);
      window.removeEventListener('NETWORK_SWITCHED_EVENT', handleNetworkSwitched);
      // Clean up any pending debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [showToast]);

  return null;
};

export default NetworkToastHandler;