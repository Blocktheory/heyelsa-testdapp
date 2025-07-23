import { ethers } from 'ethers';
import { TokenInfo } from '../config/tokens';

export interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  inputToken: TokenInfo;
  outputToken: TokenInfo;
  priceImpact: string;
  gasEstimate: string;
  route?: any;
  quotedGasPrice?: string;
}

export interface SwapParams {
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  slippageTolerance: number;
  recipient: string;
}

export class SwapService {
  private provider: ethers.BrowserProvider;
  private chainId: number;

  constructor(provider: ethers.BrowserProvider, chainId: number) {
    this.provider = provider;
    this.chainId = chainId;
  }

  async getQuote(params: SwapParams): Promise<SwapQuote | null> {
    try {
      const response = await fetch(`https://api.1inch.dev/swap/v6.0/${this.chainId}/quote?src=${params.tokenIn.address}&dst=${params.tokenOut.address}&amount=${ethers.parseUnits(params.amountIn, params.tokenIn.decimals).toString()}`, {
        headers: {
          'Authorization': 'Bearer YOUR_1INCH_API_KEY_HERE'
        }
      });

      if (!response.ok) {
        console.warn('1inch API failed, falling back to simple calculation');
        return this.getFallbackQuote(params);
      }

      const data = await response.json();
      
      return {
        inputAmount: params.amountIn,
        outputAmount: ethers.formatUnits(data.dstAmount, params.tokenOut.decimals),
        inputToken: params.tokenIn,
        outputToken: params.tokenOut,
        priceImpact: data.priceImpact || '0',
        gasEstimate: data.estimatedGas || '200000',
        quotedGasPrice: data.gasPrice
      };
    } catch (error) {
      console.error('Quote failed:', error);
      return this.getFallbackQuote(params);
    }
  }

  private async getFallbackQuote(params: SwapParams): Promise<SwapQuote> {
    const mockRate = params.tokenIn.symbol === 'ETH' && params.tokenOut.symbol === 'USDC' ? 3000 :
                     params.tokenIn.symbol === 'USDC' && params.tokenOut.symbol === 'ETH' ? 0.00033 :
                     1;
    
    const outputAmount = (parseFloat(params.amountIn) * mockRate).toString();
    
    return {
      inputAmount: params.amountIn,
      outputAmount: outputAmount,
      inputToken: params.tokenIn,
      outputToken: params.tokenOut,
      priceImpact: '0.5',
      gasEstimate: '200000'
    };
  }

  async executeSwap(params: SwapParams, signer: ethers.JsonRpcSigner): Promise<string> {
    try {
      if (params.tokenIn.address === '0x0000000000000000000000000000000000000000') {
        return this.executeNativeToTokenSwap(params, signer);
      } else if (params.tokenOut.address === '0x0000000000000000000000000000000000000000') {
        return this.executeTokenToNativeSwap(params, signer);
      } else {
        return this.executeTokenToTokenSwap(params, signer);
      }
    } catch (error: any) {
      throw new Error(`Swap execution failed: ${error.message}`);
    }
  }

  private async executeNativeToTokenSwap(params: SwapParams, signer: ethers.JsonRpcSigner): Promise<string> {
    const tokenContract = new ethers.Contract(
      params.tokenOut.address,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      signer
    );

    const quote = await this.getQuote(params);
    if (!quote) throw new Error('Failed to get quote');

    const outputAmount = ethers.parseUnits(quote.outputAmount, params.tokenOut.decimals);
    
    const tx = await tokenContract.transfer(params.recipient, outputAmount, {
      value: ethers.parseEther(params.amountIn)
    });

    return tx.hash;
  }

  private async executeTokenToNativeSwap(params: SwapParams, signer: ethers.JsonRpcSigner): Promise<string> {
    const tokenContract = new ethers.Contract(
      params.tokenIn.address,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ],
      signer
    );

    const inputAmount = ethers.parseUnits(params.amountIn, params.tokenIn.decimals);
    
    const allowance = await tokenContract.allowance(await signer.getAddress(), await signer.getAddress());
    if (allowance < inputAmount) {
      const approveTx = await tokenContract.approve(await signer.getAddress(), inputAmount);
      await approveTx.wait();
    }

    const quote = await this.getQuote(params);
    if (!quote) throw new Error('Failed to get quote');

    const tx = await signer.sendTransaction({
      to: params.recipient,
      value: ethers.parseEther(quote.outputAmount)
    });

    return tx.hash;
  }

  private async executeTokenToTokenSwap(params: SwapParams, signer: ethers.JsonRpcSigner): Promise<string> {
    const tokenInContract = new ethers.Contract(
      params.tokenIn.address,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ],
      signer
    );

    const tokenOutContract = new ethers.Contract(
      params.tokenOut.address,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      signer
    );

    const inputAmount = ethers.parseUnits(params.amountIn, params.tokenIn.decimals);
    
    const allowance = await tokenInContract.allowance(await signer.getAddress(), await signer.getAddress());
    if (allowance < inputAmount) {
      const approveTx = await tokenInContract.approve(await signer.getAddress(), inputAmount);
      await approveTx.wait();
    }

    const quote = await this.getQuote(params);
    if (!quote) throw new Error('Failed to get quote');

    const outputAmount = ethers.parseUnits(quote.outputAmount, params.tokenOut.decimals);
    const tx = await tokenOutContract.transfer(params.recipient, outputAmount);

    return tx.hash;
  }
}