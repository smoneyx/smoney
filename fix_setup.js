const fs = require('fs');
let c = fs.readFileSync('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js', 'utf8');

const setupListener = `
    const setupSaveBtn = document.getElementById('setup-save-btn');
    if (setupSaveBtn) {
        setupSaveBtn.onclick = handleSetupSave;
    }
    
    const setupGenderOptions = document.querySelectorAll('#setup-gender-toggle .gender-option');
    if(setupGenderOptions) {
        setupGenderOptions.forEach(opt => {
            opt.onclick = () => {
                setupGenderOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                document.getElementById('setup-gender').value = opt.getAttribute('data-value');
            };
        });
    }
`;

// Insert into setupAuthListeners
if(c.includes('if (showRegister)')) {
    c = c.replace('if (showRegister)', setupListener + '\n    if (showRegister)');
}

const handleSetupSaveCode = `
async function handleSetupSave() {
    const name = document.getElementById('setup-name').value.trim();
    const id = document.getElementById('setup-id').value.trim();
    const gender = document.getElementById('setup-gender').value;
    const password = document.getElementById('setup-password').value;

    if (!name || !id) {
        showToast("Vui lòng điền tên và username!");
        return;
    }
    if (id.length < 4 || id.includes(" ")) {
        showToast("Username ít nhất 4 ký tự và không chứa khoảng trắng");
        return;
    }
    if (!password || password.length < 6) {
        showToast("Vui lòng nhập mật khẩu (ít nhất 6 ký tự)!");
        return;
    }

    // Check account exists
    const checkRes = await ApiService.call('checkAccount', { username: id });
    if (checkRes.exists && checkRes.reason === 'username') {
        showToast("Username đã tồn tại, vui lòng chọn tên khác");
        return;
    }

    const hashed = await hashPassword(password);

    showToast("Đang lưu thông tin...");
    const res = await ApiService.call('updateProfile', {
        email: state.user.email,
        username: id,
        name: name,
        gender: gender,
        password_hash: hashed
    });

    if (res.success) {
        finalizeLogin({
            email: state.user.email,
            username: id,
            name: name,
            gender: gender
        });
    } else {
        showToast("Lỗi: " + (res.error || "Không thể lưu thông tin"));
    }
}
`;

c = c + '\n' + handleSetupSaveCode;
fs.writeFileSync('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js', c, 'utf8');
