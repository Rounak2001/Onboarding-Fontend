import { readFileSync } from 'fs';
const ls = readFileSync('src/pages/admin/ConsultantDetail.jsx', 'utf8').split('\n');
let d = 0;
const SHOW_FROM = 494; // line 495 (0-indexed 494)
ls.slice(SHOW_FROM).forEach((l, i) => {
    const lineNum = i + SHOW_FROM + 1;
    const o = (l.match(/<div/g)||[]).length;
    const c = (l.match(/<\/div>/g)||[]).length;
    d += o - c;
    // Show every line where depth crosses certain thresholds near the end
    if (lineNum >= 2110) {
        console.log(`L${lineNum} d=${d}\t${l.trim().substring(0,70)}`);
    }
});
console.log('\nNET BALANCE FROM LINE 495:', d, '(should be 0)');
