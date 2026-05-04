import fs from 'fs';
const content = fs.readFileSync('src/pages/admin/ConsultantDetail.jsx', 'utf8');
const lines = content.split('\n');

let depth = 0;
lines.forEach((line, i) => {
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    
    depth += opens;
    depth -= closes;
    
    if (i + 1 === 2124) {
        console.log(`Depth at line 2124: ${depth}`);
    }
});

console.log(`Final depth: ${depth}`);
