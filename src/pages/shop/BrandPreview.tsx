import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MOCKUP_ZONES, TAG_ZONE, type Zone } from '../../lib/mockupZones';

/* ============================
   Live branding preview on the product photo.
   Draws the customer's logo (from their own device, so it is instant) and/or
   brand name on the product's printable surface, in a print, engraving or
   foil look. The photo is shown with object-fit: cover, so the overlay works
   out where the image really sits inside its frame.
============================ */

export type PreviewStyle = 'print' | 'engrave';

function useImageRect(img: HTMLImageElement | null) {
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!img) return;
    const measure = () => {
      const box = img.getBoundingClientRect();
      const nw = img.naturalWidth, nh = img.naturalHeight;
      if (!nw || !nh || !box.width) return;
      const scale = Math.max(box.width / nw, box.height / nh); // object-fit: cover
      const width = nw * scale, height = nh * scale;
      setRect({ left: (box.width - width) / 2, top: (box.height - height) / 2, width, height });
    };
    measure();
    img.addEventListener('load', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(img);
    return () => { img.removeEventListener('load', measure); ro.disconnect(); };
  }, [img]);
  return rect;
}

// How the mark looks on the surface
function markFilter(style: PreviewStyle, tone: Zone['tone']): CSSProperties {
  if (style === 'print') return { filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.25))', opacity: 0.96 };
  return tone === 'dark'
    ? { filter: 'grayscale(1) sepia(1) saturate(2.6) hue-rotate(-12deg) brightness(1.25) drop-shadow(0 1px 0 rgba(0,0,0,.45))', opacity: 0.92 } // gold foil
    : { filter: 'grayscale(1) brightness(0.32) contrast(1.4)', mixBlendMode: 'multiply', opacity: 0.72 }; // debossed
}

function textColor(style: PreviewStyle, tone: Zone['tone']) {
  if (tone === 'dark') return style === 'engrave' ? '#e2c47c' : '#f4efe4';
  return style === 'engrave' ? '#3b2a1c' : '#1f2a17';
}

export function BrandPreview({ image, imgEl, logoUrl, text, style }: {
  image: string; imgEl: HTMLImageElement | null; logoUrl: string | null; text: string; style: PreviewStyle;
}) {
  const rect = useImageRect(imgEl);
  const name = text.trim();
  if (!rect || (!logoUrl && !name)) return null;

  const zone = MOCKUP_ZONES[image];
  const tag = !zone;
  const z = zone ?? { ...TAG_ZONE, rot: -4, tone: 'light' as const, cover: false };

  const w = (z.w / 100) * rect.width;
  const h = (z.h / 100) * rect.height;
  const box: CSSProperties = {
    position: 'absolute',
    left: rect.left + (z.x / 100) * rect.width - w / 2,
    top: rect.top + (z.y / 100) * rect.height - h / 2,
    width: w,
    height: h,
    transform: `rotate(${z.rot ?? 0}deg)`,
    pointerEvents: 'none',
  };

  const both = !!logoUrl && !!name;
  const look = markFilter(style, z.tone);
  // Text sized to fill the box: an SVG whose viewBox grows with the text
  const vbW = Math.max(60, name.length * 11.5);
  const textSvg = name && (
    <svg viewBox={`0 0 ${vbW} 26`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: both ? '34%' : '100%', ...(style === 'engrave' && z.tone === 'light' ? { mixBlendMode: 'multiply', opacity: 0.8 } : {}) }}>
      <text x={vbW / 2} y={19} textAnchor="middle" fontSize={20} fontFamily='"Playfair Display", Georgia, serif' letterSpacing={0.6}
        fill={tag ? '#1f2a17' : textColor(style, z.tone)}
        style={style === 'engrave' && z.tone === 'dark' ? { filter: 'drop-shadow(0 1px 0 rgba(0,0,0,.5))' } : undefined}>
        {name}
      </text>
    </svg>
  );

  return (
    <div aria-hidden style={box} className="transition-all duration-300">
      {tag ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-[6%] rounded-md bg-[#fbf8ef] p-[7%] shadow-[0_6px_18px_rgba(0,0,0,.25)] ring-1 ring-black/5">
          {logoUrl && <img src={logoUrl} alt="" className="min-h-0 w-full flex-1 object-contain" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.2))' }} />}
          {textSvg}
        </div>
      ) : (
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-[6%]">
          {z.cover && <div className="absolute inset-[-12%] rounded-[30%]" style={{ backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', maskImage: 'radial-gradient(closest-side, #000 62%, transparent)', WebkitMaskImage: 'radial-gradient(closest-side, #000 62%, transparent)' }} />}
          {logoUrl && <img src={logoUrl} alt="" className="relative min-h-0 w-full flex-1 object-contain" style={look} />}
          {textSvg && <div className="relative flex w-full flex-1 items-center justify-center" style={{ maxHeight: both ? '34%' : '100%' }}>{textSvg}</div>}
        </div>
      )}
    </div>
  );
}
