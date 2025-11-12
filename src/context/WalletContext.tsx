import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, ChainConfig } from '../config/chains';
import { syncWalletState } from '@heyelsa/chat-widget';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface TransactionData {
  to: string;
  value: string;
  gasLimit?: string;
  gasPrice?: string;
  data?: string;
}

interface WalletContextType {
  account: string | null;
  isConnected: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  currentChain: ChainConfig | null;
  balance: string | null;
  connectWallet: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signAndBroadcastTransaction: (txData: TransactionData) => Promise<string>;
  switchChain: (chainKey: string) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const getChainNameById = (chainId: string): string => {
  const chainNames: Record<string, string> = {
    '0x89': 'Polygon Mainnet',
    '0x2105': 'Base',
    '0x74c': 'Soneium',
  };
  return chainNames[chainId] || `Chain ${chainId}`;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [currentChain, setCurrentChain] = useState<ChainConfig | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const getCurrentChain = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        // Find the chain from SUPPORTED_CHAINS
        const chain = Object.values(SUPPORTED_CHAINS).find(c => c.chainId === chainId);
        
        if (chain) {
          setCurrentChain(chain);
          return chain;
        } else {
          // Create a fallback chain object if not found in supported chains
          const fallbackChain: ChainConfig = {
            chainId: chainId,
            chainName: getChainNameById(chainId),
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: [],
            blockExplorerUrls: []
          };
          setCurrentChain(fallbackChain);
          return fallbackChain;
        }
      } catch (error) {
        return null;
      }
    }
    return null;
  }, []);

  const getWalletBalance = useCallback(async (address: string, provider: ethers.BrowserProvider) => {
    try {
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);
      setBalance(balanceEth);
      return balanceEth;
    } catch (error) {
      return '0';
    }
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setProvider(provider);
        setSigner(signer);
        setAccount(address);
        
        // Get current chain and balance
        const chain = await getCurrentChain();
        const walletBalance = await getWalletBalance(address, provider);
        
        // Sync wallet state with widget
        if (chain) {
          syncWalletState({
            isConnected: true,
            address: address,
            chainId: chain.chainId,
            chainName: chain.chainName,
            balance: walletBalance,
            nativeCurrency: chain.nativeCurrency,
            supportedNetworks: ['0x89', '0x2105', '0x74c']
          });
        }
      } else {
        alert('Please install MetaMask or another Web3 wallet');
      }
    } catch (error) {
    }
  }, [getCurrentChain, getWalletBalance]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    return await signer.signMessage(message);
  }, [signer]);

  const signAndBroadcastTransaction = useCallback(async (txData: TransactionData): Promise<string> => {
    if (!signer || !provider) {
      throw new Error('Wallet not connected');
    }

    try {
      // Prepare transaction object
      const transaction: any = {
        to: txData.to,
        value: ethers.parseEther(txData.value || '0'),
      };

      // Add optional fields if provided
      if (txData.gasLimit) {
        transaction.gasLimit = BigInt(txData.gasLimit);
      }
      
      if (txData.gasPrice) {
        transaction.gasPrice = ethers.parseUnits(txData.gasPrice, 'gwei');
      }
      
      if (txData.data) {
        transaction.data = txData.data;
      }

      // Estimate gas if not provided
      if (!txData.gasLimit) {
        const estimatedGas = await provider.estimateGas(transaction);
        transaction.gasLimit = estimatedGas;
      }

      // Send transaction
      const txResponse = await signer.sendTransaction(transaction);
      
      // Return transaction hash
      return txResponse.hash;
    } catch (error: any) {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }, [signer, provider]);

  const switchChain = useCallback(async (chainKey: string) => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }

    const chainConfig = SUPPORTED_CHAINS[chainKey];
    if (!chainConfig) {
      throw new Error('Unsupported chain');
    }

    try {
      // Try to switch to the chain
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainConfig.chainId }],
      });
    } catch (switchError: any) {
      // If the chain hasn't been added to MetaMask, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig],
          });
        } catch (addError) {
          throw new Error('Failed to add chain to wallet');
        }
      } else {
        throw new Error('Failed to switch chain');
      }
    }

    // Update current chain after switching
    await getCurrentChain();
  }, [getCurrentChain]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setCurrentChain(null);
    setBalance(null);
    
    // Sync disconnection state with widget
    syncWalletState({
      isConnected: false,
      supportedNetworks: ['0x1', '0x89', '0x2105', '0x74c']
    });
  }, []);

  // Listen for chain changes and disconnect events
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleChainChanged = async () => {
        const chain = await getCurrentChain();
        if (account && chain) {
          try {
            // Create a fresh provider for the new network
            const newProvider = new ethers.BrowserProvider(window.ethereum);
            const newSigner = await newProvider.getSigner();
            
            // Update provider and signer state
            setProvider(newProvider);
            setSigner(newSigner);
            
            // Get balance with the fresh provider
            const walletBalance = await getWalletBalance(account, newProvider);
            syncWalletState({
              isConnected: true,
              address: account,
              chainId: chain.chainId,
              chainName: chain.chainName,
              balance: walletBalance,
              nativeCurrency: chain.nativeCurrency,
              supportedNetworks: ['0x89', '0x2105', '0x74c']
            });
          } catch (error) {
            // Set balance to '0' on error
            setBalance('0');
          }
        }
      };

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        }
      };

      const handleWalletDisconnect = () => {
        disconnect();
      };

      const handleWalletConnect = async (event: any) => {
        // Refresh wallet context after bridge connection
        try {
          await connectWallet();
        } catch (error) {
        }
      };

      const handleNetworkChanged = async (event: any) => {
        // Update current chain after network switch
        const chain = await getCurrentChain();
        if (account && chain) {
          try {
            // Create a fresh provider for the new network
            const newProvider = new ethers.BrowserProvider(window.ethereum);
            const newSigner = await newProvider.getSigner();
            
            // Update provider and signer state
            setProvider(newProvider);
            setSigner(newSigner);
            
            // Get balance with the fresh provider
            const walletBalance = await getWalletBalance(account, newProvider);
            syncWalletState({
              isConnected: true,
              address: account,
              chainId: chain.chainId,
              chainName: chain.chainName,
              balance: walletBalance,
              nativeCurrency: chain.nativeCurrency,
              supportedNetworks: ['0x89', '0x2105', '0x74c']
            });
          } catch (error) {
            // Set balance to '0' on error
            setBalance('0');
          }
        }
      };

      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.addEventListener('wallet-disconnect', handleWalletDisconnect);
      window.addEventListener('wallet-connect', handleWalletConnect);
      window.addEventListener('wallet-network-changed', handleNetworkChanged);

      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.removeEventListener('wallet-disconnect', handleWalletDisconnect);
        window.removeEventListener('wallet-connect', handleWalletConnect);
        window.removeEventListener('wallet-network-changed', handleNetworkChanged);
      };
    }
  }, [getCurrentChain, disconnect, connectWallet, getWalletBalance, account, provider]);

  const value = {
    account,
    isConnected: !!account,
    provider,
    signer,
    currentChain,
    balance,
    connectWallet,
    signMessage,
    signAndBroadcastTransaction,
    switchChain,
    disconnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};