const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Fix getTerms()
    // Current state (after my recent patch):
    // pronoun: isMale ? 'Anh' : 'Chị',
    // greeting: isMale ? 'anh' : 'chị',
    // self: 'Mình',
    // label: 'bạn',
    // spouse: 'bạn'

    content = content.replace("pronoun: isMale ? 'Anh' : 'Chị',", "pronoun: isMale ? 'Chồng' : 'Vợ',");
    content = content.replace("greeting: isMale ? 'anh' : 'chị',", "greeting: isMale ? 'chồng' : 'vợ',");
    content = content.replace("self: 'Mình',", "self: isMale ? 'Chồng' : 'Vợ',");
    content = content.replace("label: 'bạn',", "label: isMale ? 'chồng' : 'vợ',");
    content = content.replace("spouse: 'bạn'", "spouse: isMale ? 'vợ' : 'chồng'"); // spouse logic fixed!

    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
