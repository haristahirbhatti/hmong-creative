'use client';

export default function CtaFooter() {
  return (
    <>
      {/* CTA Section */}
      <section style={{
        background: '#080808', padding: '120px 48px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,92,43,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 700, letterSpacing: '3px',
          textTransform: 'uppercase' as const, color: '#FF5C2B', marginBottom: 14,
          justifyContent: 'center',
        }}>
          <span style={{ display: 'inline-block', width: 20, height: 2, background: '#FF5C2B' }} />
          Get Started
        </div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontSize: 'clamp(40px, 6vw, 70px)',
          fontWeight: 800, letterSpacing: -2.5, lineHeight: 0.95,
          color: 'white', maxWidth: 680, margin: '0 auto 22px',
        }}>
          Create without<br />
          <em style={{ fontStyle: 'italic', color: '#FF5C2B' }}>limits.</em>
        </h2>
        <p style={{ color: '#666', fontSize: 16, maxWidth: 400, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Join thousands of creators using Hmong Creative to bring their ideas to life.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a href="#" style={{
            background: '#FF5C2B', color: 'white', padding: '16px 34px',
            borderRadius: 100, fontSize: 15, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 8px 28px rgba(255,92,43,0.35)', transition: 'transform 0.15s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 12px 44px rgba(255,92,43,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,92,43,0.35)'; }}
          >
            Start for Free →
          </a>
          <a href="#" style={{
            border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)',
            padding: '16px 30px', borderRadius: 100, fontSize: 15, fontWeight: 500, textDecoration: 'none',
            transition: 'border-color 0.2s, color 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
          >
            View Pricing
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#050505', padding: '44px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: 'white' }}>
          Hmong<span style={{ color: '#FF5C2B' }}>.</span>Creative
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {['Features', 'Pricing', 'Blog', 'Discord'].map(link => (
            <a key={link} href="#" style={{ fontSize: 13, color: '#555', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#FF5C2B')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              {link}
            </a>
          ))}
        </div>
        <p style={{ fontSize: 13, color: '#333' }}>© 2026 Hmong Creative Media Studio</p>
      </footer>
    </>
  );
}
