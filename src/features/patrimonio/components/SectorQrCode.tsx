import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface SectorQrCodeProps {
  value: string;
  size?: number;
}

export const SectorQrCode: React.FC<SectorQrCodeProps> = ({ value, size = 160 }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      margin: 1,
      width: size,
      color: {
        dark: '#0f172a', // slate-900 (matches palette)
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR Code', err);
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!qrDataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-slate-400 bg-slate-50 border border-slate-150 rounded-lg animate-pulse"
      >
        <span className="text-[10px] font-black uppercase tracking-wider">Gerando...</span>
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code do Setor"
      width={size}
      height={size}
      className="rounded-lg object-contain select-none"
      referrerPolicy="no-referrer"
    />
  );
};
