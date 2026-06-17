const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const oldBlockRegex = /if \(checkResult\.reason === 'username'\) \{\s*showToast\("Tài khoản \(Username\) này đã có người sử dụng!"\);\s*\} else if \(checkResult\.reason === 'email'\) \{\s*showToast\("Email này đã được đăng ký!"\);\s*\}/;

    const newBlock = `if (checkResult.reason === 'username') {
                showToast("Tài khoản (Username) này đã có người sử dụng!");
            } else if (checkResult.reason === 'email') {
                showToast("Email này đã được đăng ký! Chuyển sang đăng nhập...");
                setTimeout(() => {
                    const showLoginBtn = document.getElementById('show-login');
                    if (showLoginBtn) showLoginBtn.click();
                    
                    const loginIdInput = document.getElementById('login-id');
                    if (loginIdInput) {
                        loginIdInput.value = email;
                    }
                    
                    const loginPassInput = document.getElementById('login-password');
                    if (loginPassInput) {
                        loginPassInput.focus();
                    }
                }, 1500);
            }`;

    if (oldBlockRegex.test(content)) {
        content = content.replace(oldBlockRegex, newBlock);
        console.log('Patched check account UX in ' + filePath);
        fs.writeFileSync(filePath, content);
    } else {
        console.log('Regex failed for check account UX in ' + filePath);
    }
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
