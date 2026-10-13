// Minimal parser for mysqldump/phpMyAdmin multi-row INSERT statements.
const esc = { n: '\n', r: '\r', t: '\t', '0': '\0' };

export function parseInserts(src, wanted) {
  const out = {};
  const re = /INSERT INTO `(\w+)` \(([^)]*)\) VALUES\s*/g;
  let m;
  while ((m = re.exec(src))) {
    const table = m[1];
    const cols = m[2].split(',').map((c) => c.replace(/[` ]/g, ''));
    let i = re.lastIndex;
    const rows = [];
    for (;;) {
      while (' \n\r\t,'.includes(src[i])) i++;
      if (src[i] === ';') { i++; break; }
      i++; // (
      const vals = [];
      for (;;) {
        while (' \n\t'.includes(src[i])) i++;
        if (src[i] === "'") {
          i++;
          let buf = '';
          for (;;) {
            const c = src[i];
            if (c === '\\') { buf += esc[src[i + 1]] ?? src[i + 1]; i += 2; }
            else if (c === "'") {
              if (src[i + 1] === "'") { buf += "'"; i += 2; } else { i++; break; }
            } else { buf += c; i++; }
          }
          vals.push(buf);
        } else {
          let j = i;
          while (src[j] !== ',' && src[j] !== ')') j++;
          const tok = src.slice(i, j).trim();
          i = j;
          vals.push(tok === 'NULL' ? null : tok);
        }
        while (' \n\t'.includes(src[i])) i++;
        if (src[i] === ',') { i++; continue; }
        if (src[i] === ')') { i++; break; }
      }
      rows.push(Object.fromEntries(cols.map((c, k) => [c, vals[k]])));
    }
    re.lastIndex = i;
    if (wanted.has(table)) (out[table] ||= []).push(...rows);
  }
  return out;
}
