const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Patch the init() syncFromCloud block
    const oldInitSync = `ApiService.syncFromCloud().then(success => {
                if (success) {
                    console.log("Synced from cloud successfully");
                    applyTheme();
                }
            });`;

    const newInitSync = `ApiService.syncFromCloud().then(success => {
                if (success) {
                    console.log("Synced from cloud successfully");
                    applyTheme();
                    if (typeof switchTab === 'function') {
                        switchTab(state.currentTab || 'home');
                    }
                }
            });`;

    if (content.includes(oldInitSync)) {
        content = content.replace(oldInitSync, newInitSync);
        console.log('Patched init() in ' + filePath);
    } else {
        console.log('Regex failed for init() in ' + filePath);
    }

    fs.writeFileSync(filePath, content);
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
