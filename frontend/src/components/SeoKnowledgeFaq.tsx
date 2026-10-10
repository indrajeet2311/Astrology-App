import { useState } from 'react';
import {
  HelpCircle,
  Compass,
  ChevronDown,
  Layers,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'calculation-accuracy',
    category: 'Vedic Kundli Basics',
    question: 'How is a Vedic Birth Chart (Kundli) calculated?',
    answer:
      'A Vedic Kundli is calculated using the sidereal zodiac (Nirayana system), taking into account the precession of equinoxes (Ayanamsa, most commonly Chitrapaksha / Lahiri). NextGenAstro calculates exact mathematical coordinates for the ascendant (Lagna), the 9 classical grahas (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu), and 12 Bhavas (houses) based on your birth date, precise minute of birth, and geographic coordinates.',
  },
  {
    id: 'chart-styles',
    category: 'Visual Formats',
    question: 'What is the difference between North Indian and South Indian chart styles?',
    answer:
      'In the North Indian (diamond) chart, the house positions are fixed (House 1 is always the top central diamond), while the zodiac signs rotate based on your rising sign (Lagna). In the South Indian (square grid) chart, the 12 zodiac signs have fixed boxes arranged clockwise starting from Pisces/Aries, and the Lagna is marked with diagonal lines or the abbreviation ASC. Both represent identical planetary physics.',
  },
  {
    id: 'divisional-charts',
    category: 'Shodashvarga',
    question: 'What are the 16 Divisional Charts (Shodashvarga)?',
    answer:
      'Vedic astrology subdivides each 30° zodiac sign into harmonic divisions to examine specific facets of destiny. NextGenAstro provides full calculations for all 16 traditional divisional charts: D1 Rashi (general life & physical existence), D9 Navamsha (marriage, dharma, and soul purpose), D10 Dashamsha (career and professional achievements), D7 Saptamsha (children), D12 Dwadashamsha (parents and ancestral lineage), and up to D60 Shashtiamsha (past life karma).',
  },
  {
    id: 'vimshottari-dasha',
    category: 'Predictive Timing',
    question: 'How does the 120-year Vimshottari Dasha system work?',
    answer:
      'The Vimshottari Dasha system measures cycles of planetary periods totaling 120 years, determined by the Moon’s exact degree and Nakshatra at the moment of birth. Each major period (Mahadasha) is ruled by a planet that awakens the houses and yogas connected to it, divided into sub-periods (Antardashas) for precise timing of milestones in career, relationships, wealth, and health.',
  },
  {
    id: 'panchang-importance',
    category: 'Daily Panchang',
    question: 'What are the five limbs of the Daily Panchang?',
    answer:
      'Panchang translates to "five limbs of time": Tithi (lunar day), Vaara (day of the week), Nakshatra (lunar constellation), Yoga (angular relationship of Sun and Moon), and Karana (half of a lunar day). Tracking the Panchang allows you to identify auspicious Muhurta timings (such as Abhijit Muhurta and Brahma Muhurta) and avoid inauspicious windows like Rahu Kaal.',
  },
  {
    id: 'export-and-vault',
    category: 'Privacy & Storage',
    question: 'Are my saved charts stored permanently and can I download them?',
    answer:
      'Yes! Charts saved in your browser stay permanently in local device storage without expiration. Registered clients and astrologers can also securely sync their charts to their private Cloud Vault. Any birth chart or divisional chart can be exported as a high-resolution, crisp PNG image with complete planetary coordinates and Lagna details with a single click.',
  },
];

export function SeoKnowledgeFaq() {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'calculation-accuracy': true,
    'chart-styles': true,
  });

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="seo-knowledge-section" aria-labelledby="seo-heading">
      {/* Knowledge Guide Cards */}
      <div className="seo-grid">
        <article className="card seo-card">
          <div className="seo-card-icon" aria-hidden>
            <Compass size={22} style={{ color: 'var(--gold)' }} />
          </div>
          <h3>Authentic Sidereal Ephemeris</h3>
          <p className="muted">
            Engineered with high-precision astronomical algorithms and Lahiri Ayanamsa. Calculations include true vs. mean lunar nodes, house cusps, and retrograde detections accurate to arc-seconds.
          </p>
        </article>

        <article className="card seo-card">
          <div className="seo-card-icon" aria-hidden>
            <Layers size={22} style={{ color: 'var(--gold)' }} />
          </div>
          <h3>Complete Shodashvarga (D1 - D60)</h3>
          <p className="muted">
            Seamlessly switch between D1 Rashi, D9 Navamsha, D10 Dashamsha, and 13 other harmonic divisions. View both North Indian diamond and South Indian grid layouts with one click.
          </p>
        </article>

        <article className="card seo-card">
          <div className="seo-card-icon" aria-hidden>
            <ShieldCheck size={22} style={{ color: 'var(--gold)' }} />
          </div>
          <h3>Private Vault & Permanent Retention</h3>
          <p className="muted">
            Your charts are safely kept on your device and in your encrypted cloud vault with zero expiration. Download your full horoscope as a publication-ready PNG image at any time.
          </p>
        </article>
      </div>

      {/* Interactive Crawlable FAQ Section */}
      <div className="card faq-card">
        <div className="faq-header">
          <div className="faq-badge" aria-hidden>
            <HelpCircle size={16} />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 id="seo-heading">Vedic Astrology & Janam Kundli Guide</h2>
          <p className="muted">
            Clear, authoritative answers to help you understand your birth chart calculations, astrological houses, and planetary periods.
          </p>
        </div>

        <div className="faq-list" role="region" aria-label="Frequently Asked Questions list">
          {FAQ_ITEMS.map((item) => {
            const isOpen = Boolean(openIds[item.id]);
            return (
              <div key={item.id} className={`faq-item ${isOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="faq-trigger"
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                >
                  <span className="faq-question-wrap">
                    <span className="faq-category">{item.category}</span>
                    <span className="faq-question">{item.question}</span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`faq-icon ${isOpen ? 'rotate' : ''}`}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <div id={`faq-answer-${item.id}`} className="faq-content">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Semantic Accessible Footer */}
      <footer className="app-footer" role="contentinfo">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo">✦ NextGenAstro</span>
            <p className="muted small">
              Vedic Astrology, Janam Kundli, Shodashvarga charts, Panchang, and planetary periods computed with astronomical precision.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <strong>Features</strong>
              <ul>
                <li><span>Janam Kundli (D1 & D9)</span></li>
                <li><span>Vimshottari Dasha</span></li>
                <li><span>Daily Panchang & Festivals</span></li>
                <li><span>High-Res PNG Export</span></li>
              </ul>
            </div>
            <div className="footer-col">
              <strong>Security</strong>
              <ul>
                <li><span>Permanent Local Storage</span></li>
                <li><span>Private Cloud Vault</span></li>
                <li><span>No Data Expiration</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="small muted">
            © {new Date().getFullYear()} NextGenAstro. Designed for spiritual growth, personal clarity, and astronomical exploration.
          </span>
          <span className="small muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} style={{ color: 'var(--gold)' }} /> Permanent Storage Guarantee
          </span>
        </div>
      </footer>
    </section>
  );
}
