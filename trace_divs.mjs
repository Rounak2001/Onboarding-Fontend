import fs from 'fs';
const content = fs.readFileSync('src/pages/admin/ConsultantDetail.jsx', 'utf8');
const lines = content.split('\n');

let stack = [];
lines.forEach((line, i) => {
    const lineNum = i + 1;
    // This is naive but works for standard JSX
    const tokens = line.match(/<div|<\/div>/g) || [];
    
    tokens.forEach(token => {
        if (token === '<div') {
            stack.push(lineNum);
        } else {
            if (stack.length === 0) {
                console.log(`Extra closing div at line ${lineNum}`);
            } else {
                stack.pop();
            }
        }
    });
});

console.log('\nUnclosed divs (line numbers):');
stack.forEach(ln => console.log(`Line ${ln}: ${lines[ln-1].trim().substring(0, 50)}`));
