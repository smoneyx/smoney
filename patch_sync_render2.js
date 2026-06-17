const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const newSync = `ApiService.syncFromCloud().then(() => {
        applyTheme();
        if (typeof renderTab === 'function') {
            renderTab(state.currentTab || 'home');
        }
    });`;

    // Regex to match the old block regardless of spaces
    const regex = /ApiService\.syncFromCloud\(\)\.then\(\(\) => \{\s*applyTheme\(\);\s*\}\);/;
    
    if (regex.test(content)) {
        content = content.replace(regex, newSync);
        fs.writeFileSync(filePath, content);
        console.log('Patched ' + filePath);
    } else {
        console.log('Could not find sync block in ' + filePath);
    }
}

patch('e:/Smoneys/www/app.js');
