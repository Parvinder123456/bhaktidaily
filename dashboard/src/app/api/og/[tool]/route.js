import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * OG Image API — /api/og/[tool]
 *
 * Generates 1200x630 spiritual share card images for all tool pages.
 *
 * Query params (all optional):
 *   name     — user name or rashi name (naam-ka-arth, raashifal)
 *   meaning  — short meaning / deity line (naam-ka-arth)
 *   deity    — deity association (naam-ka-arth)
 *   rashi    — rashi sign name (raashifal)
 *   panchang — tithi / muhurat summary (panchang)
 *   swapna   — dream keyword (swapna-phal)
 *   dharma   — dharma name (dharma-naam)
 *
 * Segment param:
 *   tool — one of: naam-ka-arth | panchang | raashifal | swapna-phal | dharma-naam
 */
export async function GET(request, { params }) {
  const { tool } = params;
  const { searchParams } = new URL(request.url);

  const name = searchParams.get('name') || '';
  const meaning = searchParams.get('meaning') || '';
  const deity = searchParams.get('deity') || '';
  const rashi = searchParams.get('rashi') || '';
  const panchang = searchParams.get('panchang') || '';
  const swapna = searchParams.get('swapna') || '';
  const dharma = searchParams.get('dharma') || '';

  // Resolve display values per tool type
  const primaryText = name || rashi || dharma || swapna || 'Daily Divine';
  const secondaryText = meaning || deity || panchang || 'Roz Ka Divya Sandesh';

  // Tool-specific colour accent for the bottom accent bar
  const accentMap = {
    'naam-ka-arth': '#FFD700',
    'panchang': '#FF9933',
    'raashifal': '#FF6B35',
    'swapna-phal': '#C084FC',
    'dharma-naam': '#34D399',
  };
  const accent = accentMap[tool] || '#FFD700';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #1A0A00 0%, #2D1200 50%, #1A0800 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Decorative radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background:
              'radial-gradient(circle, rgba(255,153,51,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* OM Symbol */}
        <div
          style={{
            fontSize: '72px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #FF9933, #FFD700)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1,
          }}
        >
          ॐ
        </div>

        {/* Primary text — name / rashi / dharma naam */}
        {primaryText && (
          <div
            style={{
              fontSize: primaryText.length > 20 ? '38px' : '54px',
              fontWeight: 'bold',
              color: accent,
              textAlign: 'center',
              marginBottom: '20px',
              maxWidth: '1000px',
              lineHeight: 1.2,
            }}
          >
            {primaryText}
          </div>
        )}

        {/* Secondary text — meaning / deity / panchang */}
        {secondaryText && (
          <div
            style={{
              fontSize: secondaryText.length > 80 ? '22px' : '28px',
              color: '#F5ECD7',
              textAlign: 'center',
              maxWidth: '960px',
              lineHeight: 1.55,
              opacity: 0.9,
            }}
          >
            {secondaryText}
          </div>
        )}

        {/* Branding strip */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '6px',
            background: `linear-gradient(90deg, #FF6B21, ${accent})`,
          }}
        />

        {/* Branding text */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              color: accent,
              fontWeight: 600,
              letterSpacing: '0.03em',
            }}
          >
            Daily Divine — Roz Ka Divya Sandesh
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
