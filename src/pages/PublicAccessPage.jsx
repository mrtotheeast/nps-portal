import React from "react";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

export default function PublicAccessPage() {
  return (
    <>
      <style>{`
        .public-access-container {
          min-height: 100vh;
          background: #FFFFFF;
          color: #0B1F3A;
          font-family: 'Barlow', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
        }
        .public-access-container::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 40% at 50% -5%, rgba(201,168,76,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 0% 100%, rgba(11,31,58,0.03) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }
        
        .public-access-content {
          position: relative;
          z-index: 1;
          max-width: 500px;
          width: 100%;
          text-align: center;
          animation: fadeUp 0.75s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(26px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .public-access-logo {
          width: 120px;
          height: 120px;
          margin: 0 auto 24px;
          animation: fadeUp 0.75s 0.1s ease both;
          animation-fill-mode: both;
        }

        .public-access-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 12px;
          animation: fadeUp 0.75s 0.2s ease both;
          animation-fill-mode: both;
        }

        .public-access-subtitle {
          font-size: 14px;
          color: #5B6E84;
          margin-bottom: 32px;
          line-height: 1.6;
          animation: fadeUp 0.75s 0.3s ease both;
          animation-fill-mode: both;
        }

        .public-access-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: fadeUp 0.75s 0.4s ease both;
          animation-fill-mode: both;
        }

        .public-access-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #0B1F3A;
          color: #C9A84C;
          padding: 14px 24px;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          font-family: 'Barlow Condensed', sans-serif;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
        }

        .public-access-link:hover {
          background: #122847;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(11,31,58,0.15);
        }

        .public-access-link:active {
          transform: translateY(0);
        }

        .public-access-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px 24px;
          text-align: center;
          font-size: 11px;
          color: rgba(11,31,58, 0.3);
          background: rgba(255,255,255,0.9);
          border-top: 1px solid rgba(11,31,58,0.09);
          font-family: 'Barlow Condensed', sans-serif;
          letter-spacing: 0.08em;
        }

        @media (max-width: 480px) {
          .public-access-title { font-size: 24px; }
          .public-access-link { padding: 12px 20px; font-size: 13px; }
        }
      `}</style>

      <div className="public-access-container">
        <div className="public-access-content">
          <img src={SHIELD_URL} alt="NPS" className="public-access-logo" />
          
          <h1 className="public-access-title">Public Resources</h1>
          
          <p className="public-access-subtitle">
            Access publicly available resources from Nationwide Police Services
          </p>

          <div className="public-access-links">
            <a 
              href="https://www.nationwidepolice.com/ccw-reciprocity-map"
              target="_blank"
              rel="noopener noreferrer"
              className="public-access-link"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              CCW Reciprocity Map
            </a>

            <a 
              href="https://www.nationwidepolice.com/training" 
              target="_blank" 
              rel="noopener noreferrer"
              className="public-access-link"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              Officer Training
            </a>
          </div>
        </div>
      </div>

      <footer className="public-access-footer">
        © 2025 Nationwide Police Services LLC · All rights reserved
      </footer>
    </>
  );
}