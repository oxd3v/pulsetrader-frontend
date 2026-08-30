import HyperliquidMain from "@/components/perp/hyperliquid/hyperliquidMain";

export default async function PerpMain({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const normalizedSymbol = decodeURIComponent(symbol ?? "").trim().toUpperCase();

  return <HyperliquidMain key={normalizedSymbol} tokenSymbol={normalizedSymbol} />;
}
