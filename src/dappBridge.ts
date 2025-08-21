interface WalletRequest {
  requestId: string;
  action: string;
  chain: string;
  params?: any;
}

interface WalletResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
}


function getEthereum() {
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum;
  }
  throw new Error('MetaMask not installed. Please install MetaMask to use this feature.');
}

export function createWalletBridge() {
  const channel = new MessageChannel();
  channel.port1.onmessage = async (event) => {
    const req: WalletRequest = event.data;

    const response: WalletResponse = {
      requestId: req.requestId,
      success: false,
      data: null,
      error: undefined
    };

    try {
      let result;

      const ethereum = getEthereum();

      switch (req.action) {
        case "CONNECT_WALLET":
          // Clear disconnect flag when connecting
          (window as any).walletDisconnected = false;
          result = await ethereum.request({
            method: 'eth_requestAccounts'
          });
          // Trigger wallet context update in dApp
          window.dispatchEvent(new CustomEvent('wallet-connect', { detail: { accounts: result } }));
          break;
          
        case "DISCONNECT_WALLET":
          try {
            // Use the provided disconnect method
            await ethereum.request({
              method: "eth_requestAccounts",
              params: [{eth_accounts: {}}]
            });
          } catch (error) {
          }
          
          // Set global flag to track disconnect state
          (window as any).walletDisconnected = true;
          // Trigger disconnect event that WalletContext can listen to
          window.dispatchEvent(new CustomEvent('wallet-disconnect'));
          result = { status: 'disconnected' };
          break;
          
        case "GET_ACCOUNTS":
          // After disconnect, return empty array instead of MetaMask's accounts
          if ((window as any).walletDisconnected) {
            result = [];
          } else {
            result = await ethereum.request({
              method: 'eth_accounts'
            });
            if (result.length === 0) {
              }
          }
          break;
          
        case "GET_CHAIN_ID":
          result = await ethereum.request({
            method: 'eth_chainId'
          });
          break;
          
        case "GET_BALANCE":
          const accounts = await ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length === 0) {
            throw new Error('No accounts connected');
          }
          const balance = await ethereum.request({
            method: 'eth_getBalance',
            params: [accounts[0], 'latest']
          });
          result = parseInt(balance, 16) / Math.pow(10, 18);
          break;
          
        case "SIGN_MESSAGE":
          if (!req.params?.message) {
            throw new Error('Message is required for signing');
          }
          const accountsForSigning = await ethereum.request({
            method: 'eth_accounts'
          });
          if (accountsForSigning.length === 0) {
            throw new Error('No accounts connected');
          }
          result = await ethereum.request({
            method: 'personal_sign',
            params: [req.params.message, accountsForSigning[0]]
          });
          break;
          
        case "SIGN_TRANSACTION":
          if (!req.params?.transaction) {
            throw new Error('Transaction is required for signing');
          }
          result = await ethereum.request({
            method: 'eth_signTransaction',
            params: [req.params.transaction]
          });
          break;
          
        case "BROADCAST_TRANSACTION":
          if (!req.params?.transaction) {
            throw new Error('Transaction is required for broadcasting');
          }
          result = await ethereum.request({
            method: 'eth_sendTransaction',
            params: [req.params.transaction]
          });
          break;
          
        case "SWITCH_NETWORK":
          if (!req.params?.chainId) {
            throw new Error('Chain ID is required for network switch');
          }
          try {
            await ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: req.params.chainId }]
            });
            result = { chainId: req.params.chainId, status: 'switched' };
            // Trigger wallet context update for network switch
            window.dispatchEvent(new CustomEvent('wallet-network-changed', { detail: { chainId: req.params.chainId } }));
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              if (req.params.networkConfig) {
                await ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [req.params.networkConfig]
                });
                result = { chainId: req.params.chainId, status: 'added_and_switched' };
                // Trigger wallet context update for network add and switch
                window.dispatchEvent(new CustomEvent('wallet-network-changed', { detail: { chainId: req.params.chainId } }));
              } else {
                throw new Error('Network not found and no network config provided');
              }
            } else {
              throw switchError;
            }
          }
          break;

        case "NETWORK_SWITCHED_EVENT":
          // This is a notification event, not an action that requires a response
          // Dispatch the event to be handled by the dApp
          window.dispatchEvent(new CustomEvent('NETWORK_SWITCHED_EVENT', { 
            detail: req.params || {} 
          }));
          result = { status: 'event_dispatched' };
          break;
          
        default:
          throw new Error(`Unsupported action: ${req.action}`);
      }

      response.success = true;
      response.data = result;
      
    } catch (err: any) {
      response.error = err.message || 'Wallet operation failed';
    }

    channel.port1.postMessage(response);
  };
  return channel.port2;
}