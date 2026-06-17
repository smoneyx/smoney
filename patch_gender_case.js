const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Make gender check case-insensitive and robust
    content = content.replace(
        "const isMale = gender === 'nam';",
        "const isMale = String(gender).toLowerCase() === 'nam' || String(gender).toLowerCase() === 'male';"
    );
    
    // Also fix the audio checks
    content = content.replace(
        "if (state.user.gender === 'nam') {",
        "if (String(state.user.gender).toLowerCase() === 'nam' || String(state.user.gender).toLowerCase() === 'male') {"
    );
    content = content.replace(
        "if (state.user.gender === 'nam') {", // Replace the second occurrence
        "if (String(state.user.gender).toLowerCase() === 'nam' || String(state.user.gender).toLowerCase() === 'male') {"
    );

    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
