// Complete secure wallet adapter with built-in authentication
// Single file solution - no external dependencies required

interface AdapterRequest {
  requestId: string;
  action: string;
  chain: string;
  params?: any;
}

interface AdapterResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface AuthenticatedMessage {
  requestId: string;
  action: string;
  chain: string;
  params?: any;
  timestamp: number;
  nonce: string;
  signature: string;
}

interface SecureResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
  signature: string;
}

interface AdapterOptions {
  sharedSecret?: string;
  onSharedSecretReceived?: (secret: string) => void;
  maxMessageAge?: number; // Maximum age for messages in milliseconds (default: 300000 = 5 minutes)
  debugMode?: boolean; // Enable detailed logging
}

// Built-in Message Authenticator
class MessageAuthenticator {
  private sharedSecret: string = '';
  private usedNonces = new Set<string>();
  private maxMessageAge = 300000; // 5 minutes (configurable for development)

  setSharedSecret(secret: string): void {
    this.sharedSecret = secret;
    this.usedNonces.clear();
  }

  getSharedSecret(): string {
    return this.sharedSecret;
  }

  private async computeHMAC(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature), byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');
  }

  async verifyIncomingMessage(message: AuthenticatedMessage): Promise<boolean> {
    try {
      if (!this.sharedSecret) {
        console.warn('🔒 No shared secret configured');
        return false;
      }

      // Check message age (handle both past and future timestamps)
      const messageAge = Math.abs(Date.now() - message.timestamp);
      if (messageAge > this.maxMessageAge) {
        console.warn('🔒 Message age invalid:', {
          messageTimestamp: message.timestamp,
          currentTime: Date.now(),
          ageDifference: messageAge,
          maxAllowed: this.maxMessageAge
        });
        return false;
      }

      // Check nonce uniqueness
      if (this.usedNonces.has(message.nonce)) {
        console.warn('🔒 Nonce already used:', message.nonce);
        return false;
      }

      // Verify signature
      const messageWithoutSignature = {
        requestId: message.requestId,
        action: message.action,
        chain: message.chain,
        params: message.params,
        timestamp: message.timestamp,
        nonce: message.nonce
      };

      const messageString = JSON.stringify(messageWithoutSignature);
      const expectedSignature = await this.computeHMAC(messageString, this.sharedSecret);

      if (expectedSignature !== message.signature) {
        console.warn('🔒 Invalid signature');
        return false;
      }

      // Mark nonce as used
      this.usedNonces.add(message.nonce);
      return true;

    } catch (error) {
      console.error('🔒 Message verification failed:', error);
      return false;
    }
  }

  async signResponse(response: any): Promise<SecureResponse> {
    if (!this.sharedSecret) {
      throw new Error('🔒 No shared secret configured for signing response');
    }

    const timestamp = Date.now();
    const responseData = {
      requestId: response.requestId,
      success: response.success,
      data: response.data,
      error: response.error,
      timestamp
    };

    const messageString = JSON.stringify(responseData);
    const signature = await this.computeHMAC(messageString, this.sharedSecret);

    return {
      ...responseData,
      signature
    };
  }

  cleanupOldNonces(): void {
    if (this.usedNonces.size > 1000) {
      this.usedNonces.clear();
    }
  }

  setMaxMessageAge(ageInMs: number): void {
    this.maxMessageAge = ageInMs;
    console.log(`🔒 Max message age set to: ${ageInMs}ms`);
  }
}

// Create singleton authenticator
const dappAuthenticator = new MessageAuthenticator();

function getEthereumProvider() {
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum;
  }
  throw new Error('MetaMask not installed. Please install MetaMask to use this feature.');
}

export function createWalletAdapter(options: AdapterOptions = {}) {
  const {
    sharedSecret,
    onSharedSecretReceived,
    maxMessageAge = 300000, // 5 minutes default
    debugMode = false
  } = options;

  console.log('🔒 Creating secure wallet adapter', { maxMessageAge, debugMode });

  // Configure message age tolerance
  if (maxMessageAge !== 300000) {
    dappAuthenticator.setMaxMessageAge(maxMessageAge);
  }

  // Set shared secret if provided
  if (sharedSecret) {
    dappAuthenticator.setSharedSecret(sharedSecret);
  }

  const channel = new MessageChannel();
  
  channel.port1.onmessage = async (event) => {
    try {
      await handleSecureMessage(event);
    } catch (error) {
      console.error('🔒 Adapter: Error handling message:', error);
    }
  };

  async function handleSecureMessage(event: MessageEvent): Promise<void> {
    const rawMessage = event.data;
    
    console.log('🔒 Adapter: Received message:', rawMessage);

    // Basic validation
    if (!rawMessage || typeof rawMessage !== 'object' || !rawMessage.requestId) {
      console.warn('🔒 Adapter: Invalid message format');
      return;
    }

    let validatedMessage: AdapterRequest;

    // Handle widget shared secret exchange
    if (rawMessage.action === 'EXCHANGE_SHARED_SECRET' && rawMessage.widgetSecret) {
      const widgetSecret = rawMessage.widgetSecret;
      dappAuthenticator.setSharedSecret(widgetSecret);
      console.log('🔒 Adapter: Received shared secret from widget');
      
      // Notify callback if provided
      if (onSharedSecretReceived) {
        onSharedSecretReceived(widgetSecret);
      }

      // Send acknowledgment (without signature since we're establishing the secret)
      const ackResponse = {
        requestId: rawMessage.requestId,
        success: true,
        data: { message: 'Shared secret received' }
      };
      
      channel.port1.postMessage(ackResponse);
      return;
    }

    // Require shared secret - no legacy fallback
    if (!dappAuthenticator.getSharedSecret()) {
      console.error('🔒 Adapter: No shared secret established. Widget must send EXCHANGE_SHARED_SECRET first:', {
        requestId: rawMessage.requestId,
        action: rawMessage.action,
        availableSecrets: dappAuthenticator.getSharedSecret() ? 'yes' : 'no'
      });
      
      const errorResponse = {
        requestId: rawMessage.requestId,
        success: false,
        error: 'SECURITY_ERROR: Shared secret not established. Widget must initialize secure communication first via EXCHANGE_SHARED_SECRET action.'
      };
      
      channel.port1.postMessage(errorResponse);
      return;
    }

    // Always authenticate messages (secure mode only)
    if (!await validateIncomingMessage(rawMessage)) {
      console.warn('🔒 Adapter: Message authentication failed for:', {
        requestId: rawMessage.requestId,
        action: rawMessage.action,
        hasSharedSecret: !!dappAuthenticator.getSharedSecret()
      });
      return;
    }
    
    validatedMessage = stripAuthenticationFields(rawMessage);

    // Process the validated message
    const response = await processWalletRequest(validatedMessage);
    
    // Send authenticated response
    const finalResponse = await createSecureResponse(response);
    channel.port1.postMessage(finalResponse);
  }

  async function validateIncomingMessage(message: any): Promise<boolean> {
    try {
      // Check if this looks like an authenticated message
      if (!message.timestamp || !message.nonce || !message.signature) {
        console.warn('🔒 Adapter: Missing authentication fields', {
          hasTimestamp: !!message.timestamp,
          hasNonce: !!message.nonce, 
          hasSignature: !!message.signature,
          message: message
        });
        return false;
      }

      console.log('🔒 Adapter: Validating authenticated message:', {
        requestId: message.requestId,
        action: message.action,
        timestamp: message.timestamp,
        currentTime: Date.now(),
        timeDiff: Date.now() - message.timestamp
      });

      const isValid = await dappAuthenticator.verifyIncomingMessage(message as AuthenticatedMessage);
      console.log('🔒 Adapter: Validation result:', isValid);
      
      return isValid;
    } catch (error) {
      console.error('🔒 Adapter: Authentication error:', error);
      return false;
    }
  }

  function stripAuthenticationFields(message: AuthenticatedMessage): AdapterRequest {
    const { timestamp, nonce, signature, ...cleanMessage } = message;
    return cleanMessage;
  }

  async function createSecureResponse(response: AdapterResponse): Promise<SecureResponse> {
    try {
      return await dappAuthenticator.signResponse(response);
    } catch (error) {
      console.error('🔒 Adapter: Failed to sign response:', error);
      throw error; // Don't send unsigned responses
    }
  }

  async function processWalletRequest(req: AdapterRequest): Promise<AdapterResponse> {
    const response: AdapterResponse = {
      requestId: req.requestId,
      success: false,
      data: null,
      error: undefined
    };

    try {
      let result;

      const ethereum = getEthereumProvider();

      switch (req.action) {
        case "CONNECT_WALLET":
          (window as any).walletDisconnected = false;
          result = await ethereum.request({
            method: 'eth_requestAccounts'
          });
          window.dispatchEvent(new CustomEvent('wallet-connect', { detail: { accounts: result } }));
          break;
          
        case "DISCONNECT_WALLET":
          try {
            await ethereum.request({
              method: "eth_requestAccounts",
              params: [{eth_accounts: {}}]
            });
          } catch (error) {
            // Expected to fail
          }
          
          (window as any).walletDisconnected = true;
          window.dispatchEvent(new CustomEvent('wallet-disconnect'));
          result = { status: 'disconnected' };
          break;
          
        case "GET_ACCOUNTS":
          if ((window as any).walletDisconnected) {
            result = [];
          } else {
            result = await ethereum.request({
              method: 'eth_accounts'
            });
            window.dispatchEvent(new CustomEvent('wallet-connect', { detail: { accounts: result } }));
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
            window.dispatchEvent(new CustomEvent('wallet-network-changed', { detail: { chainId: req.params.chainId } }));
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              if (req.params.networkConfig) {
                await ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [req.params.networkConfig]
                });
                result = { chainId: req.params.chainId, status: 'added_and_switched' };
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
      console.error('🔒 Adapter: Wallet operation failed:', err);
    }

    return response;
  }

  return {
    port2: channel.port2,
    getSharedSecret: () => dappAuthenticator.getSharedSecret(),
    setSharedSecret: (secret: string) => dappAuthenticator.setSharedSecret(secret),
    isSecureMode: () => true, // Always secure
    cleanupNonces: () => dappAuthenticator.cleanupOldNonces()
  };
}

// Alternative export names for flexibility
export const createSecureWalletAdapter = createWalletAdapter;
export const createSecureAdapter = createWalletAdapter;

// Export types for TypeScript users
export type { AdapterRequest, AdapterResponse, AdapterOptions, AuthenticatedMessage, SecureResponse };