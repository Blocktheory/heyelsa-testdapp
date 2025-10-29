import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { TokenInfo, getTokensByChainId } from '../config/tokens';
import { SwapService, SwapQuote, SwapParams } from '../utils/swapUtils';

const SwapComponent: React.FC = () => {
  const { isConnected, provider, signer, currentChain, account } = useWallet();
  
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(null);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);
  const [amountIn, setAmountIn] = useState<string>('1');
  const [amountOut] = useState<string>('0');
  const [quote] = useState<SwapQuote | null>(null);
  const [isLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);
  const [swapHash, setSwapHash] = useState<string>('');
  const [showTokenInSelect, setShowTokenInSelect] = useState(false);
  const [showTokenOutSelect, setShowTokenOutSelect] = useState(false);

  useEffect(() => {
    if (currentChain) {
      const chainId = parseInt(currentChain.chainId, 16);
      const tokens = getTokensByChainId(chainId);
      setAvailableTokens(tokens);
      
      if (tokens.length > 0) {
        setTokenIn(tokens[0]);
        if (tokens.length > 1) {
          setTokenOut(tokens[1]);
        }
      }
    }
  }, [currentChain]);


  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !amountIn || !signer || !account || !provider || !currentChain) {
      alert('Please ensure all fields are filled and wallet is connected');
      return;
    }

    setIsSwapping(true);
    try {
      const chainId = parseInt(currentChain.chainId, 16);
      const swapService = new SwapService(provider, chainId);
      
      const swapParams: SwapParams = {
        tokenIn,
        tokenOut,
        amountIn,
        slippageTolerance: slippage,
        recipient: account
      };

      const hash = await swapService.executeSwap(swapParams, signer);
      setSwapHash(hash);
    } catch (error: any) {
      alert(`Swap failed: ${error.message}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleTokenInSelect = (token: TokenInfo) => {
    setTokenIn(token);
    setShowTokenInSelect(false);
  };

  const handleTokenOutSelect = (token: TokenInfo) => {
    setTokenOut(token);
    setShowTokenOutSelect(false);
  };

  const switchTokens = () => {
    if (tokenIn && tokenOut) {
      setTokenIn(tokenOut);
      setTokenOut(tokenIn);
      setAmountIn(amountOut);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <h2 className="text-xl font-semibold">🔄 Token Swap</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-400 italic">Please connect your wallet first</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <h2 className="text-xl font-semibold">🔄 Token Swap</h2>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">From</span>
            <span className="text-xs text-gray-500">Balance: -</span>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="flex-1 text-2xl font-semibold bg-transparent border-none outline-none"
            />
            <div className="relative">
              <button
                onClick={() => setShowTokenInSelect(!showTokenInSelect)}
                className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">{tokenIn?.symbol || 'Select'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showTokenInSelect && (
                <div className="absolute top-full mt-1 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 w-48 max-h-48 overflow-y-auto">
                  {availableTokens.map((token) => (
                    <button
                      key={`${token.chainId}-${token.address}`}
                      onClick={() => handleTokenInSelect(token)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-sm text-gray-500">{token.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={switchTokens}
            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">To</span>
            <span className="text-xs text-gray-500">Balance: -</span>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={amountOut}
              readOnly
              placeholder="0.0"
              className="flex-1 text-2xl font-semibold bg-transparent border-none outline-none text-gray-600"
            />
            <div className="relative">
              <button
                onClick={() => setShowTokenOutSelect(!showTokenOutSelect)}
                className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">{tokenOut?.symbol || 'Select'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showTokenOutSelect && (
                <div className="absolute top-full mt-1 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 w-48 max-h-48 overflow-y-auto">
                  {availableTokens.map((token) => (
                    <button
                      key={`${token.chainId}-${token.address}`}
                      onClick={() => handleTokenOutSelect(token)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-sm text-gray-500">{token.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {quote && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Price Impact:</span>
              <span className="font-medium">{quote.priceImpact}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Est. Gas:</span>
              <span className="font-medium">{quote.gasEstimate}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <span className="text-sm font-medium text-gray-700">Slippage Tolerance:</span>
          <div className="flex items-center space-x-2">
            {[0.1, 0.5, 1.0].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  slippage === value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
              step="0.1"
              min="0.1"
              max="50"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
        </div>

        <button
          onClick={handleSwap}
          disabled={isSwapping || isLoading || !tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          {isSwapping ? 'Swapping...' : isLoading ? 'Getting Quote...' : 'Swap Tokens'}
        </button>

        {swapHash && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800 mb-2">Swap Transaction:</p>
            <code className="text-xs bg-gray-100 p-2 rounded block break-all max-h-24 overflow-y-auto">{swapHash}</code>
            <p className="text-xs text-green-600 mt-2">
              Swap submitted! Check your wallet or block explorer for confirmation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapComponent;