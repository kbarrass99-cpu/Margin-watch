import { ImageResponse } from 'next/og';

// The preview card shown when margincanary.com is shared (Slack, X, iMessage,
// Facebook groups). Rendered at build time by Next.
export const alt = 'MarginCanary: know the moment your supplier price rise eats your margin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CX = 200;
const CY = 190;
const R = 150;
function point(pct: number, r = R) {
  const a = Math.PI * (1 - pct / 100);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}
function arc(from: number, to: number) {
  const a = point(from);
  const b = point(to);
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
}

export default function OpengraphImage() {
  const needle = point(40.6, R - 12);
  const tickIn = point(45, R - 26);
  const tickOut = point(45, R + 18);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#fafafa',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
          color: '#18181b',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 700 }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: '#f2c230' }} />
            MarginCanary
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2.5 }}>
              Know the moment your margin disappears.
            </div>
            <div style={{ marginTop: 26, fontSize: 28, color: '#52525b', lineHeight: 1.35 }}>
              Supplier price and stock alerts for dropshipping stores.
            </div>
          </div>
          <div style={{ fontSize: 24, color: '#71717a' }}>margincanary.com</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: 40,
              padding: '36px 28px 32px',
            }}
          >
            <svg width="400" height="215" viewBox="0 0 400 215">
              <path d={arc(0, 100)} fill="none" stroke="#f4f4f5" strokeWidth="24" strokeLinecap="round" />
              <path d={arc(0, 45)} fill="none" stroke="#fee2e2" strokeWidth="24" strokeLinecap="round" />
              <line x1={tickIn.x} y1={tickIn.y} x2={tickOut.x} y2={tickOut.y} stroke="#f2c230" strokeWidth="6" strokeLinecap="round" />
              <circle cx={tickOut.x} cy={tickOut.y} r="10" fill="#f2c230" />
              <line x1={CX} y1={CY} x2={needle.x} y2={needle.y} stroke="#18181b" strokeWidth="5" strokeLinecap="round" />
              <circle cx={CX} cy={CY} r="10" fill="#18181b" />
            </svg>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10 }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: '#dc2626' }}>40.6%</div>
              <div style={{ fontSize: 22, color: '#71717a' }}>margin, alert at 45%</div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
