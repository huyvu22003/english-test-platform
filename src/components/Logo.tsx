import { useState } from "react";

// Logo thương hiệu IELTS Ms. Trà My.
// Ưu tiên render ảnh chính thức /logo.png (gồm cả chữ); onError -> fallback mark SVG
// (4 cánh hoa cam→đỏ) + wordmark. Prop `light`: dùng trên nền tối (chữ trắng).
export default function Logo({
  height = 42,
  withText = true,
  light = false,
}: {
  height?: number;
  withText?: boolean;
  light?: boolean;
}) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <span className="logo">
      {imgOk ? (
        <img
          className="logo-img"
          src="/logo.png"
          alt="IELTS Ms. Trà My"
          style={{ height }}
          onError={() => setImgOk(false)}
        />
      ) : (
        <>
          <svg className="logo-mark" width={height} height={height} viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="etpPetal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f7a01d" />
                <stop offset="1" stopColor="#ec2f2b" />
              </linearGradient>
            </defs>
            <g
              fill="none"
              stroke="url(#etpPetal)"
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {[45, 135, 225, 315].map((r) => (
                <g key={r} transform={`translate(60 60) rotate(${r})`}>
                  <path d="M0 -4 C 15 -16, 17 -40, 0 -56 C -17 -40, -15 -16, 0 -4 Z" />
                  <path d="M0 -12 L0 -48" />
                </g>
              ))}
            </g>
          </svg>
          {withText && (
            <span className={`logo-wm${light ? " on-dark" : ""}`}>
              <b>IELTS</b>
              <i>Ms. Trà My</i>
            </span>
          )}
        </>
      )}
    </span>
  );
}
