const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const oldSync = `ApiService.syncFromCloud().then(() => {
        applyTheme();
    });`;

    const newSync = `ApiService.syncFromCloud().then(() => {
        applyTheme();
        if (typeof renderTab === 'function') {
            renderTab(state.currentTab || 'home');
        }
    });`;

    if (content.includes(oldSync)) {
        content = content.replace(oldSync, newSync);
    } else {
        console.log('Could not find oldSync in ' + filePath);
    }

    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
