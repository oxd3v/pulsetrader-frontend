'use client'
import TokenExplorer from "@/components/explorer/tokenExplorer";

export default function TokenExplorerMain(){
    return <TokenExplorer handleTradeNow={()=>console.log('call')}/>
}