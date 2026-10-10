import { BookOpenText } from 'lucide-react';

const ARTICLES = [
  {
    category: 'Getting started',
    title: 'How to read your birth chart',
    summary: 'Start with the rising sign, Moon and Sun. The rising sign sets the houses, the Moon describes emotional habits, and the Sun adds a sense of purpose. Read the chart as a set of interacting factors, not one placement in isolation.',
    terms: 'Lagna · Rashi · Nakshatra',
  },
  {
    category: 'Relationships',
    title: 'What astrologers look at for marriage',
    summary: 'The 7th house and its ruler describe partnership themes. Venus is a general relationship significator; the Navamsa (D9), the Upapada and the running planetary periods add context. Compatibility also depends on both people and their real-world choices.',
    terms: '7th house · Navamsa · Upapada',
  },
  {
    category: 'Timing',
    title: 'Dashas and transits answer different questions',
    summary: 'A dasha is a longer chapter in life, while a transit is a planet’s current movement. A timing window is more notable when the running period connects to a life area and transits reinforce it. Neither fixes an event to an exact date.',
    terms: 'Mahadasha · Antardasha · Gochar',
  },
  {
    category: 'Chart strength',
    title: 'Why divisional charts are used',
    summary: 'The Rashi chart is the foundation. Divisional charts zoom in on a topic: D9 for marriage, D10 for career, D4 for home and property, and D20 for spiritual practice. They refine the reading; they do not replace the birth chart.',
    terms: 'Varga · D9 · D10 · D4',
  },
  {
    category: 'Planetary patterns',
    title: 'Yogas are patterns, not guarantees',
    summary: 'A yoga is a combination of placements that traditional astrology associates with a theme. Its expression depends on the planets involved, their strength, the rest of the chart and the periods being activated. Treat it as context, not a promise.',
    terms: 'Raja Yoga · Dhana Yoga · Jaimini',
  },
  {
    category: 'Everyday life',
    title: 'Bringing chart insights into everyday life',
    summary: 'Use the chart’s themes as a starting point for reflection. Consider the wider chart, the current planetary periods and how each theme connects with your goals and lived experience.',
    terms: 'Patterns · Timing · Personal goals',
  },
];

export function ArticlesTab() {
  return (
    <section className="articles-page" aria-label="Articles">
      <header className="articles-head">
        <BookOpenText size={24} aria-hidden />
        <div>
          <h2>Articles</h2>
          <p className="muted small">Short guides to the chart terms and methods used in NextGenAstro.</p>
        </div>
      </header>
      <div className="article-grid">
        {ARTICLES.map((article) => (
          <article className="article-item" key={article.title}>
            <span className="eyebrow">{article.category}</span>
            <h3>{article.title}</h3>
            <p>{article.summary}</p>
            <small className="muted">{article.terms}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
