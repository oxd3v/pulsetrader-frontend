//import DefinedPerpMain from "@/components/perp/aster/asterMain";

export default async function PerpMain({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const normalizedSymbol = decodeURIComponent(symbol ?? "").trim().toUpperCase();
  return (
    <div className="flex justify-center items-center h-full w-full">
      <h1 className="text-2xl font-bold">AsterDex is coming soon</h1>
    </div>
  )
  // return (
  //   <DefinedPerpMain key={normalizedSymbol} tokenSymbol={normalizedSymbol} />
  // )
}
