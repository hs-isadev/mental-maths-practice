const digits = [
  ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"],
  ["8", "8"], ["9", "9"], ["A", "10"], ["B", "11"], ["C", "12"], ["D", "13"], ["E", "14"], ["F", "15"],
];

export function HexReference({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "hex-reference compact" : "hex-reference"} aria-labelledby={compact ? "session-ref-title" : "reference-title"}>
      <div className="panel-title">
        <div><span className="kicker">Reference</span><h2 id={compact ? "session-ref-title" : "reference-title"}>The sixteen symbols</h2></div>
        <span className="mono-note">BASE<sub>16</sub></span>
      </div>
      <div className="digit-grid" aria-label="Hexadecimal digit values">
        {digits.map(([hex, dec]) => <span key={hex}><strong>{hex}</strong><small>{dec}</small></span>)}
      </div>
      {!compact && <div className="place-value-strip"><span><small>16³</small><strong>4096</strong></span><i>+</i><span><small>16²</small><strong>256</strong></span><i>+</i><span><small>16¹</small><strong>16</strong></span><i>+</i><span><small>16⁰</small><strong>1</strong></span></div>}
    </section>
  );
}
