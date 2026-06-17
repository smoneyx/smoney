const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const regex = /ApiService\.syncFromCloud\(\)\.then\(\(\) => \{\s*applyTheme\(\);\s*if \(typeof renderTab === 'function'\) \{\s*renderTab\(state\.currentTab \|\| 'home'\);\s*\}\s*\}\);/;

    const newCode = `ApiService.syncFromCloud().then((success) => {
        applyTheme();
        if (success) {
            if (typeof switchTab === 'function') {
                switchTab(state.currentTab || 'home');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast("Đã xảy ra lỗi khi tải dữ liệu. Vui lòng tải lại trang.");
            }
        }
    });`;

    if (regex.test(content)) {
        content = content.replace(regex, newCode);
        fs.writeFileSync(filePath, content);
        console.log('Patched ' + filePath);
    } else {
        console.log('Regex failed for ' + filePath);
    }
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
