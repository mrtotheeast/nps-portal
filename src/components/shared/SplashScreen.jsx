import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/84a3a4ece_nps-shield-removebg-preview.png";

export default function SplashScreen({ onComplete }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Spin for exactly 2s, then fade out and complete
    const timer = setTimeout(() => { setDone(true); setTimeout(onComplete, 500); }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: done ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-[9999]"
    >
      <style>{`
        @keyframes splash-spin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .splash-shield {
          animation: splash-spin 2s linear 1 forwards;
          perspective: 800px;
        }
      `}</style>
      <img src={SHIELD_URL} alt="NPS Shield" className="w-24 h-24 object-contain splash-shield" />
    </motion.div>
  );
}