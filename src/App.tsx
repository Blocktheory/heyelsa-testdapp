"use client";
import React from 'react';
import { WalletProvider } from './context/WalletContext';
import { ToastProvider } from './context/ToastContext';
import WalletTiles from './components/WalletTiles';
import NetworkToastHandler from './components/NetworkToastHandler';
import { HeyElsaChatWidget } from '@heyelsa/chat-widget';
import { createWalletAdapter } from './adapter';

function App() {
  const messagePort = createWalletAdapter();

  return (
    <WalletProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100">
          <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
            <div className="px-4 py-8 text-center">
              <h1 className="text-4xl font-bold mb-2">EVM Chain DApp</h1>
              <p className="text-lg opacity-90">Test your wallet connection and signing functionality</p>
            </div>
          </header>
          <main className="py-8">
            <NetworkToastHandler />
            <WalletTiles />
            <HeyElsaChatWidget 
              position="bottom-right"
              messagePort={messagePort}
              keyId="uniswap"
              customStyles={{
                primaryColor: "#D90013"
              }}
            />
          </main>
        </div>
      </ToastProvider>
    </WalletProvider>
  );
}

export default App;
