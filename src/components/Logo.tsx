import { useState } from "react";

// Logo thương hiệu IELTS Ms. Trà My.
// Ưu tiên ảnh chính thức /logo.png (đặt ở public/, nền trong suốt). Nếu thiếu file
// (404) -> fallback "mark" SVG cam→đỏ (cụm 4 cánh hoa) + wordmark 2 dòng, khớp nhận diện.
// Prop `light`: dùng trên nền tối (chữ trắng) — hero header / sidebar / trang đăng nhập trên nền ấm.
export default function Logo({ light = false }: { light?: boolean }) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <span className={`logo${light ? " logo-light" : ""}`}>
      {imgOk ? (
        <img
          className="logo-img"
          src="/logo.png"
          alt="IELTS Ms. Trà My"
          onError={() => setImgOk(false)}
        />
      ) : (
        <>
          {/* Mark dự phòng: 4 cánh hoa toả từ tâm theo đường chéo, viền gradient cam→đỏ */}
          <svg className="logo-wm" viewBox="0 0 48 48" width="38" height="38" aria-hidden="true">
            <defs>
              <linearGradient id="etpLogoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f7941d" />
                <stop offset="1" stopColor="#ec3a2b" />
              </linearGradient>
            </defs>
            <g
              transform="translate(24 24)"
              fill="none"
              stroke="url(#etpLogoGrad)"
              strokeWidth="2.3"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {[45, 135, 225, 315].map((deg) => (
                <g key={deg} transform={`rotate(${deg})`}>
                  <path d="M0 0 C6 -9 6 -20 0 -27 C-6 -20 -6 -9 0 0 Z" />
                  <path d="M0 -3 L0 -23" />
                </g>
              ))}
            </g>
          </svg>
          <span className="logo-text">
            <b className="lw-1">IELTS</b>
            <span className="lw-2">Ms. Trà My</span>
          </span>
        </>
      )}
    </span>
  );
}
