
import { CollateralTokens, userDeafultTokens } from "@/constants/common/tokens";
//components
import TokenCard from "@/components/Token/TokenCard";

interface TokenDataType {
  token: {
    address: string;
    decimals: number;
    symbol: string;
    imageUrl?: string
  };
  balance: string;
  priceUsd: string;
}

export default function RenderWalletTokenList({ tokenList, walletAddress, walletId, chainId, user }: { tokenList: TokenDataType[], walletAddress: string, walletId: string, chainId: number, user: any }) {

  return (
    <div className='p-1 lg:p-2 h-full overflow-y-auto scrollbar-track-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:bg-indigo-600 [&::-webkit-scrollbar-thumb]:rounded-full space-y-1'>
      {
        tokenList.length > 0 && tokenList.map((td: TokenDataType, index: number) => (
          <TokenCard key={`${index}-${td.token.address}`} tokenInfo={td} walletAddress={walletAddress} chainId={chainId} walletId={walletId} user={user} />
        ))
      }

    </div>
  )
}