import React, { useState, useEffect } from "react";

const LOGO_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/84a3a4ece_nps-shield-removebg-preview.png";

export default function LoadingScreen({ message = "Loading..." }) {
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSpinning(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-white">
      <style>{`
        @keyframes spin-once {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .badge-spin {
          animation: spin-once 2s linear 1 forwards;
          perspective: 800px;
        }
      `}</style>
      <img
        src={LOGO_URL}
        alt="NPS Logo"
        className={`w-32 h-32 object-contain ${spinning ? "badge-spin" : ""}`}
      />
    </div>
  );
}