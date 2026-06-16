const fs = require('fs');
let c = fs.readFileSync('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js', 'utf8');

const newGoogleLogic = `// ==========================================
// GOOGLE LOGIN HANDLERS
// ==========================================
async function handleGoogleLogin() {
    if (GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID") || GOOGLE_CLIENT_ID.includes("n8n8n8n8n8")) {
        showToast("Vui lòng cấu hình Google Client ID trong app.js!");
        return;
    }

    if (isAndroidApp()) {
        showToast("Đang khởi động Google Sign-In trên Android...");
        return;
    }

    try {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false
        });
        google.accounts.id.prompt();
    } catch (error) {
        console.error("Google Init Error:", error);
        showToast("Lỗi khởi tạo Google Login!");
    }
}

async function handleGoogleCredentialResponse(response) {
    const payload = decodeJwt(response.credential);
    if (!payload) {
        showToast("Không thể xác thực tài khoản Google!");
        return;
    }

    showToast("Đang đăng nhập: " + payload.email);

    const result = await ApiService.call('googleLogin', {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub
    });

    if (result && result.success) {
        state.user.email = result.user.email;
        state.user.name = result.user.name;
        state.user.avatar = payload.picture || result.user.avatar || '';

        // Nếu là tài khoản mới (chưa có ID hoặc giới tính mặc định)
        if (!result.user.username || !result.user.gender) {
            const loginForm = document.getElementById('login-form');
            if(loginForm) loginForm.classList.add('hidden');
            const regForm = document.getElementById('register-form');
            if(regForm) regForm.classList.add('hidden');
            const forgotForm = document.getElementById('forgot-password-form');
            if(forgotForm) forgotForm.classList.add('hidden');
            const setupForm = document.getElementById('google-setup-form');
            if(setupForm) setupForm.classList.remove('hidden');

            const setupName = document.getElementById('setup-name');
            if(setupName) setupName.value = result.user.name || "";
            const setupId = document.getElementById('setup-id');
            if(setupId) setupId.value = (result.user.email || "").split('@')[0];
            showToast("Gần xong rồi! Cho Heo biết thêm về bạn nha.");
        } else {
            finalizeLogin(result.user);
        }
    } else {
        showToast("Đăng nhập thất bại, vui lòng thử lại!");
    }
}

function finalizeLogin(userData) {
    state.user.loggedIn = true;
    state.user.email = userData.email;
    state.user.name = userData.name;
    state.user.gender = userData.gender || 'nam';
    if(userData.username) state.user.username = userData.username;

    ApiService.saveLocal();
    localStorage.setItem('smoney_logged_in', 'true');

    hideAuthScreen();
    unlockApp();
    showToast("Chào mừng " + state.user.name + "!");
    ApiService.syncFromCloud();
}
`;

c = c.replace(/\/\/ ==========================================\s*\n\/\/ GOOGLE LOGIN HANDLERS[\s\S]*?(?=$)/, newGoogleLogic);
fs.writeFileSync('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js', c, 'utf8');
