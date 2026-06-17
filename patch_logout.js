const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const oldLogout = `function logoutUser() {
    state.user.loggedIn = false;
    localStorage.removeItem('smoney_logged_in');
    location.reload();
}`;

    const newLogout = `function logoutUser() {
    state.user.loggedIn = false;
    localStorage.removeItem('smoney_logged_in');
    localStorage.removeItem('smoney_current_user');
    localStorage.removeItem('smoney_transactions');
    localStorage.removeItem('smoney_goals');
    localStorage.removeItem('smoney_settings');
    location.reload();
}`;

    // Replace the function directly
    if (content.includes(oldLogout)) {
        content = content.replace(oldLogout, newLogout);
    } else {
        // Fallback for slight whitespace differences
        content = content.replace(/function logoutUser\(\) \{[\s\S]*?location\.reload\(\);\s*\}/, newLogout);
    }
    
    // Also clear state when logging in with a different account (during finalizeLogin)
    // just in case they don't log out but override login somehow
    const oldFinalize = `state.user.loggedIn = true;
    state.user.email = userData.email;`;
    
    const newFinalize = `// Clear old transactions to prevent flashing old data
    state.transactions = [];
    state.user.loggedIn = true;
    state.user.email = userData.email;`;

    if (content.includes(oldFinalize)) {
        content = content.replace(oldFinalize, newFinalize);
    }

    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
