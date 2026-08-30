import { useEffect, useState } from "react";
import RenderTokenList from "@/components/Token/RenderTokenList";


interface UserTokensProps {
  walletAddress: string;
  walletId: string;
  chainId: number;
  user: any;
  holdingTokens: any[];
}
export default function UserTokens({
  walletAddress,
  walletId,
  user,
  chainId,
  holdingTokens,
}: UserTokensProps) {
  let [tokens, setTokens] = useState<any>([]);
  useEffect(() => {
    if (holdingTokens.length > 0) {
      let _defaultTokens = holdingTokens.map((td) => {
        return {
          token: td.token,
          balance: td.balance,
          priceUsd: td.tokenPriceUsd,
          imageUrl: td.token?.info?.imageLargeUrl || td.token?.info?.imageSmallUrl || td.token?.info?.imageThumbUrl || ""
        };
      });
      setTokens(_defaultTokens);
    }
  }, [holdingTokens]);
  return (
    <RenderTokenList
      tokenList={tokens}
      walletId={walletId}
      chainId={chainId}
      walletAddress={walletAddress}
      user={user}
    />
  );
}
