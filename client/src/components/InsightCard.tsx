interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
}

export default function InsightCard({ title, value, subtitle }: Props) {
  return (
    <div className="insight-card">
      <div className="insight-value">{value}</div>
      <div className="insight-title">{title}</div>
      {subtitle && <div className="insight-subtitle">{subtitle}</div>}
    </div>
  );
}
