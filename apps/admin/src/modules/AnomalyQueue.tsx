const rows = [
  ["Gabah Kering Panen", "Ngantru", "Rp5.200", "-1.9"],
  ["Beras Medium", "Kauman", "Rp12.600", "-1.6"],
  ["Jagung Pipilan", "Sendang", "Rp5.750", "-1.5"]
];

export function AnomalyQueue() {
  return (
    <section className="panel" id="monitoring">
      <div className="panel-title">
        <h3>Antrean anomali</h3>
        <span>Z-Score</span>
      </div>
      <div className="table">
        {rows.map(([commodity, district, price, score]) => (
          <article key={`${commodity}-${district}`} className="row">
            <div>
              <strong>{commodity}</strong>
              <p>{district}</p>
            </div>
            <span>{price}</span>
            <em>{score}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
