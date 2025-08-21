export interface TokenInfo {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

export const COMMON_TOKENS: Record<string, TokenInfo[]> = {
  // Ethereum Mainnet
  '1': [
    {
      chainId: 1,
      address: '0x0000000000000000000000000000000000000000',
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    {
      chainId: 1,
      address: '0xA0b86a33E6441c8C88A13cF89c6D7e4c5e4Ff7e6',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    {
      chainId: 1,
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
    },
    {
      chainId: 1,
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
    },
  ],
  // Base
  '8453': [
    {
      chainId: 8453,
      address: '0x0000000000000000000000000000000000000000',
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    {
      chainId: 8453,
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    {
      chainId: 8453,
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
    },
  ],
  // Polygon
  '137': [
    {
      chainId: 137,
      address: '0x0000000000000000000000000000000000000000',
      name: 'Matic',
      symbol: 'MATIC',
      decimals: 18,
    },
    {
      chainId: 137,
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    {
      chainId: 137,
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
    },
    {
      chainId: 137,
      address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
    },
  ],
};

export const getTokensByChainId = (chainId: number): TokenInfo[] => {
  return COMMON_TOKENS[chainId.toString()] || [];
};

export const getNativeToken = (chainId: number): TokenInfo | undefined => {
  const tokens = getTokensByChainId(chainId);
  return tokens.find(token => token.address === '0x0000000000000000000000000000000000000000');
};