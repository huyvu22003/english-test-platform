import type { ReactNode } from "react";

export interface StatCard {
  label: string;
  value: ReactNode;
  urgent?: boolean;
}

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  stats?: StatCard[];
  statsAriaLabel?: string;
}

export function AdminPageHeader({ eyebrow, title, subtitle, actions, stats, statsAriaLabel }: Props) {
  return (
    <>
      <header className="admin-page-head">
        <div>
          <span className="eyebrow dark">{eyebrow}</span>
          <h1>{title}</h1>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {stats && stats.length > 0 && (
        <section className="admin-stat-grid" aria-label={statsAriaLabel}>
          {stats.map((s) => (
            <div className={`admin-stat-card${s.urgent ? " urgent" : ""}`} key={s.label}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
