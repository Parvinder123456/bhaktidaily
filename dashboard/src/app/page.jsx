import './landing.css';

export const metadata = {
  title: 'Bhakti Daily — Har Subah Bhagwan Ka Aashirvaad',
  description:
    'Panchang, Raashifal, sacred shlokas, and daily blessings — delivered straight to your WhatsApp every morning. Join 10,000+ bhakts already receiving daily divine messages.',
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const TOOLS = [
  { href: '/naam-ka-arth', icon: '📜', label: 'Naam Ka Rahasya' },
  { href: '/aaj-ka-panchang', icon: '📅', label: 'Aaj Ka Panchang' },
  { href: '/aaj-ka-raashifal', icon: '♈', label: 'Aaj Ka Raashifal' },
  { href: '/swapna-phal', icon: '🌙', label: 'Swapna Phal' },
  { href: '/dharma-naam', icon: '🕉️', label: 'Dharma Naam' },
];

const FEATURES = [
  {
    icon: '📅',
    title: 'Daily Panchang',
    desc: 'Tithi, nakshatra, yoga, karan — aaj ka shubh muhurat seedha WhatsApp pe.',
  },
  {
    icon: '♈',
    title: 'Raashifal',
    desc: 'Aapki rashi ke hisaab se personalized aaj ka bhavishya-fal.',
  },
  {
    icon: '📿',
    title: 'Sacred Shloka',
    desc: 'Roz ek divya shloka — Sanskrit, Hindi arth, aur aaj ke liye sandesh.',
  },
  {
    icon: '🕉️',
    title: 'Bhagwan Ka Sandesh',
    desc: 'AI-powered personal guidance — jaise Bhagwan Krishna khud bol rahe hain.',
  },
  {
    icon: '🔥',
    title: 'Streak System',
    desc: 'Roz interact karein aur apni spiritual streak banayein. 7 din, 30 din, 365 din!',
  },
  {
    icon: '🎁',
    title: 'Weekly Surprises',
    desc: 'Mangalvar Hanuman Chalisa, Guruvaar gyan, Shani special — har din kuch naya.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'WhatsApp pe message karein',
    desc: 'Neechay diye button par click karein aur "Jai Shri Ram" likh kar bhejein.',
    icon: '💬',
  },
  {
    num: '02',
    title: 'Apni rashi batayein',
    desc: 'Hamare bot ko apna naam aur rashi batayein — bas 2 minute.',
    icon: '⭐',
  },
  {
    num: '03',
    title: 'Har subah divine message payein',
    desc: 'Aapke chosen time par roz subah Bhagwan ka aashirvaad aapke WhatsApp pe.',
    icon: '🌅',
  },
];

const TESTIMONIALS = [
  {
    name: 'Priya S.',
    rashi: 'Kark Rashi',
    text: 'Pehle din se hi ek alag anubhav hai. Subah uthte hi Bhagwan ka sandesh milta hai — din ki shuruaat hi alag ho jaati hai!',
  },
  {
    name: 'Rajesh M.',
    rashi: 'Mesh Rashi',
    text: 'Mere liye travel ke waqt mandir jaana mushkil hota tha. Ab roz shloka aur panchang milta hai. Bahut sundar seva hai.',
  },
  {
    name: 'Sunita K.',
    rashi: 'Vrishabh Rashi',
    text: 'Raashifal itna accurate hota hai! Aur Mangalvar Hanuman Chalisa sunn ke din ban jaata hai.',
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LandingPage() {
  return (
    <div className="ld-root">
      {/* ---- Navigation ---- */}
      <nav className="ld-nav">
        <div className="ld-nav-inner">
          <span className="ld-logo">
            <span className="ld-om">ॐ</span>
            <span className="ld-logo-text">
              Bhakti<span className="ld-logo-accent">Daily</span>
            </span>
          </span>

          <div className="ld-nav-tools">
            {TOOLS.map((t) => (
              <a key={t.href} href={t.href} className="ld-nav-tool-link">
                <span>{t.icon}</span> {t.label}
              </a>
            ))}
          </div>

          <a href="/login" className="ld-btn-outline">Sign in</a>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <section className="ld-hero">
        <div className="ld-hero-glow" aria-hidden="true" />

        {/* Floating diyas */}
        <div className="ld-diya ld-diya-1" aria-hidden="true">🪔</div>
        <div className="ld-diya ld-diya-2" aria-hidden="true">🪔</div>
        <div className="ld-diya ld-diya-3" aria-hidden="true">🪔</div>

        <div className="ld-hero-content">
          {/* Animated Om */}
          <div className="ld-om-big" aria-hidden="true">ॐ</div>

          <h1 className="ld-hero-title">
            Bhakti<span className="ld-title-accent">Daily</span>
          </h1>

          <p className="ld-hero-tagline">
            Har Subah Bhagwan Ka Aashirvaad<br />
            <span className="ld-tagline-sub">Seedha Aapke WhatsApp Pe 🙏</span>
          </p>

          <p className="ld-hero-desc">
            Panchang · Raashifal · Sacred Shlokas · Personalized Guidance — roz subah, bilkul free.
          </p>

          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/+14155238886?text=Jai%20Shri%20Ram"
            target="_blank"
            rel="noopener noreferrer"
            className="ld-btn-wa"
          >
            <WhatsAppIcon />
            अभी जुड़ें — Abhi Judein 🙏
          </a>

          <p className="ld-hero-note">
            10,000+ bhakts already receiving daily blessings • Free forever
          </p>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="ld-section">
        <div className="ld-section-inner">
          <div className="ld-section-header">
            <span className="ld-section-eyebrow">Kya milega aapko?</span>
            <h2 className="ld-section-title">Roz Ek Naya Anubhav</h2>
            <p className="ld-section-subtitle">
              Sirf horoscope nahi — ek poora spiritual companion jo aapke saath grow karta hai.
            </p>
          </div>

          <div className="ld-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="ld-feature-card">
                <div className="ld-feature-icon">{f.icon}</div>
                <h3 className="ld-feature-title">{f.title}</h3>
                <p className="ld-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Divider lotus ---- */}
      <div className="ld-lotus-divider" aria-hidden="true">🪷</div>

      {/* ---- How it works ---- */}
      <section className="ld-section ld-section-dark">
        <div className="ld-section-inner">
          <div className="ld-section-header">
            <span className="ld-section-eyebrow">Shuru karna hai?</span>
            <h2 className="ld-section-title">Sirf Teen Kadam</h2>
          </div>

          <div className="ld-steps">
            {STEPS.map((s, i) => (
              <div key={s.num} className="ld-step">
                <div className="ld-step-num">{s.num}</div>
                <div className="ld-step-icon">{s.icon}</div>
                <h3 className="ld-step-title">{s.title}</h3>
                <p className="ld-step-desc">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="ld-step-arrow" aria-hidden="true">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Social proof ---- */}
      <section className="ld-section">
        <div className="ld-section-inner">
          <div className="ld-section-header">
            <span className="ld-section-eyebrow">Bhakt bol rahe hain</span>
            <h2 className="ld-section-title">10,000+ Bhakts Ka Vishwaas</h2>
          </div>

          <div className="ld-testimonials">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="ld-testimonial-card">
                <p className="ld-testimonial-text">&ldquo;{t.text}&rdquo;</p>
                <div className="ld-testimonial-author">
                  <span className="ld-author-name">{t.name}</span>
                  <span className="ld-author-rashi">{t.rashi}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Big stats row */}
          <div className="ld-stats">
            <div className="ld-stat">
              <span className="ld-stat-num">10K+</span>
              <span className="ld-stat-label">Active Bhakts</span>
            </div>
            <div className="ld-stat-divider" aria-hidden="true" />
            <div className="ld-stat">
              <span className="ld-stat-num">365</span>
              <span className="ld-stat-label">Days of Blessings</span>
            </div>
            <div className="ld-stat-divider" aria-hidden="true" />
            <div className="ld-stat">
              <span className="ld-stat-num">100%</span>
              <span className="ld-stat-label">Free Forever</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="ld-cta-section">
        <div className="ld-cta-glow" aria-hidden="true" />
        <div className="ld-cta-inner">
          <div className="ld-cta-om" aria-hidden="true">ॐ</div>
          <h2 className="ld-cta-title">Aaj Se Hi Shuru Karein</h2>
          <p className="ld-cta-subtitle">
            Apne phone pe Bhagwan ka aashirvaad payein — roz subah, seedha WhatsApp pe.
          </p>
          <a
            href="https://wa.me/+14155238886?text=Jai%20Shri%20Ram"
            target="_blank"
            rel="noopener noreferrer"
            className="ld-btn-wa ld-btn-wa-large"
          >
            <WhatsAppIcon />
            अभी जुड़ें — Abhi Judein 🙏
          </a>
          <p className="ld-cta-note">
            Click karein → WhatsApp khulega → &ldquo;Jai Shri Ram&rdquo; bhejein → Ho gaya!
          </p>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="ld-footer">
        <div className="ld-footer-inner">
          <span className="ld-footer-logo">
            <span className="ld-om">ॐ</span> Bhakti<span className="ld-logo-accent">Daily</span>
          </span>
          <p className="ld-footer-tagline">Built with 🙏 for Sanatan Dharma</p>
          <p className="ld-footer-copy">
            &copy; {new Date().getFullYear()} Bhakti Daily · Jai Shri Ram
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WhatsApp SVG icon (inline, no external dependency)
// ---------------------------------------------------------------------------
function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
