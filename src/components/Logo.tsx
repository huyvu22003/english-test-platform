import { useState } from "react";

// Logo thương hiệu IELTS Ms. Trà My.
// Ưu tiên ảnh chính thức /logo.png (đặt ở public/, nền trong suốt). Nếu thiếu file
// (404) -> fallback sang "mark" SVG cam→đỏ + chữ, để app LUÔN có logo dù chưa có ảnh.
// Prop `light`: dùng trên nền tối (chữ trắng), ví dụ hero header / sidebar.
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
          {/* Mark dự phòng: cụm cánh hoa cam→đỏ (khớp logo thương hiệu) */}
          <svg className="logo-wm" viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
            <defs>
              <linearGradient id="etpLogoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f7941d" />
                <stop offset="1" stopColor="#ec3a2b" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#etpLogoGrad)" strokeWidth="3">
              <ellipse cx="24" cy="24" rx="7" ry="15" transform="rotate(45 24 24)" />
              <ellipse cx="24" cy="24" rx="7" ry="15" transform="rotate(-45 24 24)" />
            </g>
          </svg>
          <span className="logo-text">
            IELTS <b>Ms. Trà My</b>
          </span>
        </>
      )}
    </span>
  );
}
