const fs = require('fs');
let c = fs.readFileSync('e:/Smoneys/backend_script.gs', 'utf8');
c = c.replace(/const htmlBody = `([\s\S]*?)`;/, function(match, p1) {
    let lines = p1.split('\n');
    let newLines = lines.map(line => {
        let esc = line.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return '"' + esc + '\\n"';
    });
    return 'const htmlBody = ' + newLines.join(' +\n') + ';';
});
c = c.replace(/\$\{otp\}/g, '" + otp + "');
fs.writeFileSync('e:/Smoneys/backend_script.gs', c, 'utf8');
