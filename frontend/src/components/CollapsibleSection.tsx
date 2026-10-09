import type { ReactNode } from 'react';

/**
 * Wraps an advanced/technical card so it starts collapsed, showing only a short
 * plain-language teaser. Keeps the underlying card's own heading and content
 * unchanged once expanded — this is purely a decluttering affordance for
 * beginners, not a replacement for the card's own copy.
 */
export function CollapsibleSection({ title, description, defaultOpen = false, children }: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="card collapsible-section" open={defaultOpen}>
      <summary>
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-desc muted small">{description}</span>
        <span className="collapsible-chevron" aria-hidden>▾</span>
      </summary>
      <div className="collapsible-body">{children}</div>
    </details>
  );
}
