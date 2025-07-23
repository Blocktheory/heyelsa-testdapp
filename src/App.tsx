"use client";
import React from 'react';
import { WalletProvider } from './context/WalletContext';
import WalletTiles from './components/WalletTiles';
import { HeyElsaChatWidget } from 'heyelsa-chat-widget';

function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100">
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
          <div className="px-4 py-8 text-center">
            <h1 className="text-4xl font-bold mb-2">EVM Chain DApp</h1>
            <p className="text-lg opacity-90">Test your wallet connection and signing functionality</p>
          </div>
        </header>
        <main className="py-8">
          <WalletTiles />
          <HeyElsaChatWidget 
            position="bottom-right"
            dappName="Uniswap"
            keyId="686bd44d-677c-11f0-b3d8-42010a80001a"
            customStyles={{
              primaryColor: "#ff37c7"
            }}
          />
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;
