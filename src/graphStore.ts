import fs from 'fs-extra';
import path from 'path';

export function saveJSON(outDir: string, name: string, data: any) {
  fs.ensureDirSync(outDir);
  const p = path.join(outDir, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}
