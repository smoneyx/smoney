const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const regex = /const registerBtn = document\.getElementById\('register-btn'\);\s*if \(registerBtn\) \{\s*registerBtn\.onclick = handleRegister;\s*\}/;

    const newStr = `const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.onclick = handleRegister;
    }

    // Tự động định dạng Username: viết liền, không dấu, chữ thường và số
    const regIdInput = document.getElementById('reg-id');
    if (regIdInput) {
        regIdInput.addEventListener('input', function(e) {
            let val = this.value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''); // Xóa dấu tiếng Việt
            val = val.toLowerCase(); // Chuyển thành chữ thường
            val = val.replace(/[^a-z0-9]/g, ''); // Xóa khoảng trắng và ký tự đặc biệt, chỉ giữ a-z và 0-9
            this.value = val;
        });
    }`;

    if (regex.test(content)) {
        content = content.replace(regex, newStr);
        console.log('Patched username format in ' + filePath);
        fs.writeFileSync(filePath, content);
    } else {
        console.log('Regex not found in ' + filePath);
    }
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
