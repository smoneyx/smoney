const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const regex = /if \(!name \|\| !email \|\| !password \|\| !username\) \{\s*showToast\("Vui lòng điền đầy đủ thông tin!"\);\s*return;\s*\}\s*showToast\("Đang gửi mã OTP\.\.\."\);/;

    const newBlock = `if (!name || !email || !password || !username) {
        showToast("Vui lòng điền đầy đủ thông tin!");
        return;
    }
    
    // Check if username or email already exists before sending OTP
    showToast("Đang kiểm tra thông tin...");
    try {
        const checkResult = await ApiService.call('checkAccount', { username, email });
        if (checkResult.success && checkResult.exists) {
            if (checkResult.reason === 'username') {
                showToast("Tài khoản (Username) này đã có người sử dụng!");
            } else if (checkResult.reason === 'email') {
                showToast("Email này đã được đăng ký!");
            }
            return; // Stop here, don't send OTP
        }
    } catch (err) {
        console.error("Check account failed:", err);
    }
    
    showToast("Đang gửi mã OTP...");`;

    if (regex.test(content)) {
        content = content.replace(regex, newBlock);
        console.log('Patched handleRegister in ' + filePath);
        fs.writeFileSync(filePath, content);
    } else {
        console.log('Regex failed for handleRegister in ' + filePath);
    }
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
