import TradingViewGmxChart from "./tradingViewSpotChart"

const DefinedChart = ({chainId, symbol, address, pairAddress, quoteToken, createdAt}) => {
   return <TradingViewGmxChart chainId={chainId} address={address} symbol={symbol} pairAddress={pairAddress} quoteToken={quoteToken} createdAt={createdAt} />
}

export default DefinedChart
