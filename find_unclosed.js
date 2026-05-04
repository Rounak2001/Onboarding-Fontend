import fs from 'fs';
const content = fs.readFileSync('src/pages/admin/ConsultantDetail.jsx', 'utf8');
const lines = content.split('\n');

let stack = [];
lines.forEach((line, i) => {
    const lineNum = i + 1;
    // Simple regex to find <div and </div
    // This doesn't handle strings or comments perfectly but usually good enough
    const tokens = line.match(/<div|<\/div>/g) || [];
    
    tokens.forEach(token => {
        if (token === '<div') {
            stack.push(lineNum);
        } else {
            if (stack.length === 0) {
                console.log(`Extra </div> at line ${lineNum}`);
            } else {
                stack.pop();
            }
        }
    });
});

console.log('\nUnclosed divs (line numbers):');
console.log(stack.join(', '));
console.log(`\nTotal unclosed: ${stack.length}`);
