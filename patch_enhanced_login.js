const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const regex = /if \(checkResult\.reason === 'username'\) \{\s*showToast\("Tài khoản \(Username\) này đã có người sử dụng!"\);\s*\} else if \(checkResult\.reason === 'email'\) \{\s*showToast\("Email này đã được đăng ký! Chuyển sang đăng nhập\.\.\."\);\s*setTimeout\(\(\) => \{\s*const showLoginBtn = document\.getElementById\('show-login'\);\s*if \(showLoginBtn\) showLoginBtn\.click\(\);\s*const loginIdInput = document\.getElementById\('login-email'\);\s*if \(loginIdInput\) \{\s*loginIdInput\.value = email;\s*\}\s*const loginPassInput = document\.getElementById\('login-password'\);\s*if \(loginPassInput\) \{\s*loginPassInput\.focus\(\);\s*\}\s*\}, 1500\);\s*\}/;

    const newBlock = `if (checkResult.reason === 'username' || checkResult.reason === 'email') {
                const msg = checkResult.reason === 'username' 
                    ? "Tài khoản này đã tồn tại! Chuyển sang đăng nhập..." 
                    : "Email này đã được đăng ký! Chuyển sang đăng nhập...";
                
                showToast(msg);
                
                setTimeout(() => {
                    const showLoginBtn = document.getElementById('show-login');
                    if (showLoginBtn) showLoginBtn.click();
                    
                    const loginIdInput = document.getElementById('login-email');
                    if (loginIdInput) {
                        // Tự động điền email hoặc username đã trùng
                        loginIdInput.value = checkResult.reason === 'email' ? email : username;
                    }
                    
                    const loginPassInput = document.getElementById('login-password');
                    if (loginPassInput) {
                        loginPassInput.focus();
                    }
                }, 1500);
            }`;

    if (regex.test(content)) {
        content = content.replace(regex, newBlock);
        console.log('Patched enhanced auto-login in ' + filePath);
        fs.writeFileSync(filePath, content);
    } else {
        console.log('Regex failed for enhanced auto-login in ' + filePath);
    }
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
