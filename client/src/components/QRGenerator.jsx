import { QRCodeSVG } from 'qrcode.react';

export default function QRGenerator({ url }) {
  return (
    <div className="qr-container">
      <h3>Patient Check-in</h3>
      <p>Scan to join the queue</p>
      
      <div className="qr-box">
        <QRCodeSVG 
          value={url} 
          size={180}
          bgColor="#ffffff"
          fgColor="#0f172a"
          level="H"
          marginSize={2}
          imageSettings={{
            src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'><circle cx='12' cy='12' r='10'/><path d='M12 6v6l4 2' stroke='white' stroke-width='2' stroke-linecap='round'/></svg>",
            x: undefined,
            y: undefined,
            height: 40,
            width: 40,
            excavate: true,
          }}
        />
      </div>
      
      <div className="url-display">
        {url.replace(/^https?:\/\//, '')}
      </div>
    </div>
  );
}
