import fs from 'fs-extra';
import path from 'path';
export function saveJSON(outDir, name, data) {
    fs.ensureDirSync(outDir);
    const p = path.join(outDir, name);
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    return p;
}
