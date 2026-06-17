const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace login-id with login-email
    if (content.includes("document.getElementById('login-id')")) {
        content = content.replace(/document\.getElementById\('login-id'\)/g, "document.getElementById('login-email')");
        console.log('Patched login-id to login-email in ' + filePath);
        fs.writeFileSync(filePath, content);
    } else {
        console.log('Could not find login-id in ' + filePath);
    }
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
