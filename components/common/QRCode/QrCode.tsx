// components/QRCodeDisplay.jsx
'use client'; // Mark as client component

import  QRCodeSVG  from 'react-qr-code';

export default function QRCodeDisplay({ value, size = 256 }:{value:string, size?:number}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <QRCodeSVG 
        value={value}
        size={size}
        bgColor="#FFFFFF"
        fgColor="#000000"
        level="Q" // Error correction level: L, M, Q, H
      />
    </div>
  );
}