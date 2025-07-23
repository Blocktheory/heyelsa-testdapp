import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { SUPPORTED_CHAINS } from '../config/chains';
import SwapComponent from './SwapComponent';

interface TransactionData {
  to: string;
  value: string;
  gasLimit?: string;
  gasPrice?: string;
  data?: string;
}

const WalletTiles: React.FC = () => {
  const { account, isConnected, currentChain, connectWallet, signMessage, signAndBroadcastTransaction, switchChain, disconnect } = useWallet();
  const [messageToSign, setMessageToSign] = useState('Hello from EVM DApp!');
  const [signature, setSignature] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Transaction form state
  const [txData, setTxData] = useState<TransactionData>({
    to: '',
    value: '0.001',
    gasLimit: '',
    gasPrice: '',
    data: ''
  });
  const [txHash, setTxHash] = useState<string>('');

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await connectWallet();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = async () => {
    setIsLoading(true);
    try {
      const sig = await signMessage(messageToSign);
      setSignature(sig);
    } catch (error) {
      console.error('Signing failed:', error);
      alert('Signing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransaction = async () => {
    setIsLoading(true);
    try {
      const hash = await signAndBroadcastTransaction(txData);
      setTxHash(hash);
    } catch (error: any) {
      console.error('Transaction failed:', error);
      alert(`Transaction failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTxInputChange = (field: keyof TransactionData, value: string) => {
    setTxData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSwitchChain = async (chainKey: string) => {
    setIsLoading(true);
    try {
      await switchChain(chainKey);
    } catch (error: any) {
      console.error('Chain switch failed:', error);
      alert(`Failed to switch chain: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <h2 className="text-xl font-semibold">🔗 Connect Wallet</h2>
        </div>
        <div className="p-6">
          {!isConnected ? (
            <div className="text-center">
              <p className="text-gray-600 mb-6">Connect your wallet to get started</p>
              <button 
                onClick={handleConnect} 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-green-600 font-semibold mb-4">✅ Wallet Connected</p>
              
              {currentChain && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium text-blue-800 mb-1">Current Network:</p>
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{currentChain.iconUrl}</span>
                    <span className="text-sm font-medium text-blue-700">{currentChain.chainName}</span>
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Account:</p>
                <code className="text-xs bg-gray-200 p-2 rounded block break-all">{account}</code>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Switch Network:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(SUPPORTED_CHAINS).map(([key, chain]) => (
                    <button
                      key={key}
                      onClick={() => handleSwitchChain(key)}
                      disabled={isLoading || currentChain?.chainId === chain.chainId}
                      className={`p-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        currentChain?.chainId === chain.chainId
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center justify-center">
                        <span className="mr-1">{chain.iconUrl}</span>
                        <span>{chain.chainName.split(' ')[0]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={disconnect}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <h2 className="text-xl font-semibold">✍️ Sign Message</h2>
        </div>
        <div className="p-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-gray-400 italic">Please connect your wallet first</p>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message to sign:
                </label>
                <input
                  id="message"
                  type="text"
                  value={messageToSign}
                  onChange={(e) => setMessageToSign(e.target.value)}
                  placeholder="Enter message to sign"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200"
                />
              </div>
              <button 
                onClick={handleSign}
                disabled={isLoading || !messageToSign.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 mb-4"
              >
                {isLoading ? 'Signing...' : 'Sign Message'}
              </button>
              {signature && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800 mb-2">Signature:</p>
                  <code className="text-xs bg-gray-100 p-2 rounded block break-all max-h-24 overflow-y-auto">{signature}</code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <h2 className="text-xl font-semibold">💸 Send Transaction</h2>
        </div>
        <div className="p-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-gray-400 italic">Please connect your wallet first</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="toAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  To Address:
                </label>
                <input
                  id="toAddress"
                  type="text"
                  value={txData.to}
                  onChange={(e) => handleTxInputChange('to', e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200"
                />
              </div>
              
              <div>
                <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-2">
                  Value (ETH):
                </label>
                <input
                  id="value"
                  type="text"
                  value={txData.value}
                  onChange={(e) => handleTxInputChange('value', e.target.value)}
                  placeholder="0.001"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gasLimit" className="block text-sm font-medium text-gray-700 mb-2">
                    Gas Limit (optional):
                  </label>
                  <input
                    id="gasLimit"
                    type="text"
                    value={txData.gasLimit}
                    onChange={(e) => handleTxInputChange('gasLimit', e.target.value)}
                    placeholder="21000"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200"
                  />
                </div>
                
                <div>
                  <label htmlFor="gasPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Gas Price (optional):
                  </label>
                  <input
                    id="gasPrice"
                    type="text"
                    value={txData.gasPrice}
                    onChange={(e) => handleTxInputChange('gasPrice', e.target.value)}
                    placeholder="20"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-2">
                  Data (optional):
                </label>
                <textarea
                  id="data"
                  value={txData.data}
                  onChange={(e) => handleTxInputChange('data', e.target.value)}
                  placeholder="0x..."
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200"
                />
              </div>
              
              <button 
                onClick={handleTransaction}
                disabled={isLoading || !txData.to.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 mb-4"
              >
                {isLoading ? 'Sending Transaction...' : 'Send Transaction'}
              </button>
              
              {txHash && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800 mb-2">Transaction Hash:</p>
                  <code className="text-xs bg-gray-100 p-2 rounded block break-all max-h-24 overflow-y-auto">{txHash}</code>
                  <p className="text-xs text-green-600 mt-2">
                    Transaction sent! Check your wallet or block explorer for confirmation.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SwapComponent />
    </div>
  );
};

export default WalletTiles;