const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Current state in file (after my previous patch):
    // pronoun: isMale ? 'Chồng' : 'Vợ',
    // greeting: isMale ? 'chồng' : 'vợ',
    // self: isMale ? 'Chồng' : 'Vợ',
    // label: isMale ? 'chồng' : 'vợ',
    // spouse: isMale ? 'vợ' : 'chồng'

    // Fix spouse back to 'chồng' / 'vợ'
    content = content.replace(
        "spouse: isMale ? 'vợ' : 'chồng'",
        "spouse: isMale ? 'chồng' : 'vợ'"
    );

    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
