// Google Auth Configuration
const GOOGLE_CLIENT_ID = "235112932184-tqukmh6fuo085u5v07tphpidhelo0u5s.apps.googleusercontent.com"; // Thay bằng Client ID của bạn

// Helper to decode JWT
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }
    initApp();

    // Mở khóa âm thanh khi người dùng chạm vào màn hình lần đầu
    const unlockAudio = () => {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        silentAudio.play().then(() => {
            console.log("System: Audio Unlocked");
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        }).catch(() => { });
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
});

// State Management
const state = {
    currentTab: 'home',
    transactions: JSON.parse(localStorage.getItem('smoney_transactions')) || [],
    newTransaction: {
        type: 'expense',
        amount: 0,
        method: 'cash',
        note: '',
        photo: null
    },
    user: {
        name: localStorage.getItem('smoney_user_name') || '',
        gender: localStorage.getItem('smoney_user_gender') || 'nam', // 'nam' hoặc 'nữ'
        loggedIn: localStorage.getItem('smoney_logged_in') === 'true',
        email: localStorage.getItem('smoney_user_email') || ''
    },
    settings: {
        soundEnabled: localStorage.getItem('smoney_sound_enabled') !== 'false'
    },
    theme: JSON.parse(localStorage.getItem('smoney_theme')) || {
        mode: 'global',
        global: '#fff9fb',
        tabs: { home: '#fff9fb', transaction: '#fff9fb', stats: '#fff9fb', settings: '#fff9fb' }
    },
    security: {
        enabled: localStorage.getItem('smoney_security_enabled') === 'true',
        type: localStorage.getItem('smoney_security_type') || 'pin', // 'pin', 'pattern', 'biometric'
        pin: localStorage.getItem('smoney_security_pin') || '',
        pattern: localStorage.getItem('smoney_security_pattern') || '',
        biometricEnabled: localStorage.getItem('smoney_biometric_enabled') === 'true'
    },
    goals: JSON.parse(localStorage.getItem('smoney_goals')) || {
        monthlyBudget: 0
    },
    getTerms() {
        const gender = (this.user && this.user.gender) ? this.user.gender : 'nam';
        const isMale = gender === 'nam';
        return {
            pronoun: isMale ? 'Anh' : 'Em',
            greeting: isMale ? 'anh' : 'em',
            self: isMale ? 'Chồng' : 'Vợ',
            label: isMale ? 'chồng' : 'vợ',
            spouse: isMale ? 'chồng' : 'vợ'
        };
    },
    playSound(src) {
        if (!this.settings.soundEnabled) return;

        const audio = new Audio(src);
        audio.play().catch(e => {
            // Chỉ log lỗi nếu không phải là lỗi do chính sách Autoplay của trình duyệt
            if (e.name !== 'NotAllowedError') {
                console.warn("Audio play error:", e);
            }
        });
    }
};

const isAndroidApp = () => {
    // For testing on PC, you can add ?android=1 or ?emulate=1 to the URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('android') === '1' || urlParams.get('emulate') === '1') return true;

    if (window.Capacitor && window.Capacitor.isNativePlatform) return window.Capacitor.getPlatform() === 'android';
    if (window.cordova) return window.cordova.platformId === 'android';

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.indexOf("android") > -1;
    const isMobile = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua);

    return isAndroid || isMobile;
};

function initApp() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const isEmulating = urlParams.get('emulate') === '1';

        if (!isAndroidApp()) {
            if (isEmulating) {
                document.body.classList.add('emulator-mode');
                // Wrap #app in a phone frame
                const app = document.getElementById('app');
                const frame = document.createElement('div');
                frame.className = 'phone-emulator-frame';
                frame.innerHTML = `
                    <div class="phone-case">
                        <div class="phone-screen-container">
                            <div class="phone-notch"></div>
                        </div>
                        <div class="phone-buttons">
                            <div class="button-vol-up"></div>
                            <div class="button-vol-down"></div>
                            <div class="button-power"></div>
                        </div>
                    </div>
                `;
                app.parentNode.insertBefore(frame, app);
                frame.querySelector('.phone-screen-container').appendChild(app);
            } else {
                document.body.classList.add('web-layout');
            }
        }
        applyTheme(); // Áp dụng chủ đề ngay khi khởi động

        if (!state.user.loggedIn) {
            showAuthScreen();
        } else {
            // Try to sync from cloud on startup
            ApiService.syncFromCloud().then(success => {
                if (success) {
                    console.log("Synced from cloud successfully");
                    applyTheme();
                }
            });

            if (state.security.enabled && isAndroidApp()) {
                showLockScreen();
            } else {
                unlockApp();
            }
        }
    } catch (error) {
        console.error("App initialization failed:", error);
        // Fallback render
        unlockApp();
    }
}

function applyThemeColor(color) {
    if (!color || !color.startsWith('#')) return;

    document.documentElement.style.setProperty('--theme-base', color);

    let c = color.substring(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    let rgb = parseInt(c, 16);
    let r = (rgb >> 16) & 0xff;
    let g = (rgb >> 8) & 0xff;
    let b = (rgb >> 0) & 0xff;
    let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (luma > 210) {
        document.documentElement.style.setProperty('--primary', `color-mix(in srgb, var(--theme-base) 75%, black)`);
    } else {
        document.documentElement.style.setProperty('--primary', `var(--theme-base)`);
    }

    document.documentElement.style.setProperty('--bg-color', `color-mix(in srgb, var(--primary) 10%, white)`);
    document.documentElement.style.setProperty('--secondary', `color-mix(in srgb, var(--primary) 60%, white)`);
    document.documentElement.style.setProperty('--accent', `color-mix(in srgb, var(--primary) 30%, white)`);

    document.documentElement.style.setProperty('--text-main', '#2d3436');
    document.documentElement.style.setProperty('--text-light', '#b2bec3');
    document.documentElement.style.setProperty('--card-bg', '#ffffff');
    document.documentElement.style.setProperty('--nav-bg', 'rgba(255, 255, 255, 0.9)');
}

function applyTheme() {
    // Ensure theme structure is valid (migration for old data)
    if (!state.theme.tabs) {
        state.theme.tabs = { home: '#fff9fb', transaction: '#fff9fb', stats: '#fff9fb', settings: '#fff9fb' };
    }
    if (!state.theme.mode) state.theme.mode = 'global';
    if (!state.theme.global) state.theme.global = '#fff9fb';

    let color = state.theme.global;
    if (state.theme.mode === 'per-tab') {
        const tabToColor = ['home', 'transaction', 'stats', 'settings'].includes(state.currentTab) ? state.currentTab : 'home';
        color = state.theme.tabs[tabToColor] || state.theme.global;
    }
    applyThemeColor(color);
}

let unlockCallback = null;

function unlockApp() {
    const lockScreen = document.getElementById('lock-screen');
    if (lockScreen) {
        lockScreen.classList.add('hidden');
        setTimeout(() => {
            lockScreen.style.display = 'none';
        }, 500); // Wait for transition
    }

    if (unlockCallback) {
        let cb = unlockCallback;
        unlockCallback = null;
        cb();
    } else {
        switchTab(state.currentTab);
        setupEventListeners();
    }
}

let lockPinInput = "";
let lockPatternCtx = null;
let lockDotPositions = [];
let lockTempPattern = [];
let isDrawingLockPattern = false;

function showLockScreen(callback = null) {
    unlockCallback = callback;
    const lockScreen = document.getElementById('lock-screen');
    lockScreen.classList.remove('hidden');
    lockScreen.style.display = 'flex';

    document.getElementById('lock-pin-area').classList.add('hidden');
    document.getElementById('lock-pattern-area').classList.add('hidden');
    document.getElementById('lock-biometric-area').classList.add('hidden');

    const cancelBtn = document.getElementById('lock-cancel-btn');
    if (callback) {
        cancelBtn.classList.remove('hidden');
        cancelBtn.onclick = () => {
            lockScreen.classList.add('hidden');
            setTimeout(() => { lockScreen.style.display = 'none'; }, 500);
            unlockCallback = null;
        };
    } else {
        cancelBtn.classList.add('hidden');
    }

    if (state.security.biometricEnabled) {
        document.getElementById('lock-biometric-area').classList.remove('hidden');
    }

    if (state.security.type === 'pin') {
        document.getElementById('lock-title').innerText = "Nhập mã PIN";
        document.getElementById('lock-pin-area').classList.remove('hidden');
        lockPinInput = "";
        updateLockPinDisplay();
        setupLockPinListeners();
    } else {
        document.getElementById('lock-title').innerText = "Vẽ mẫu hình";
        document.getElementById('lock-pattern-area').classList.remove('hidden');
        resetLockPattern();
        setupLockPatternListeners();
    }

    if (window.lucide) lucide.createIcons();
}

function updateLockPinDisplay() {
    const dots = document.querySelectorAll('.lock-pin-dot');
    dots.forEach((dot, i) => {
        if (i < lockPinInput.length) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

function showErrorShake() {
    const errorEl = document.getElementById('lock-error');
    errorEl.classList.remove('hidden', 'error-shake');
    void errorEl.offsetWidth; // trigger reflow
    errorEl.classList.add('error-shake');

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

function setupLockPinListeners() {
    const keys = document.querySelectorAll('.lock-key');
    const delBtn = document.querySelector('.lock-key-del');

    // Remove old listeners to prevent duplicates if called again
    keys.forEach(k => {
        const newK = k.cloneNode(true);
        k.parentNode.replaceChild(newK, k);
    });
    const newDelBtn = delBtn.cloneNode(true);
    delBtn.parentNode.replaceChild(newDelBtn, delBtn);

    document.querySelectorAll('.lock-key').forEach(key => {
        key.onclick = () => {
            document.getElementById('lock-error').classList.add('hidden');
            if (lockPinInput.length < 4 && key.innerText !== "") {
                lockPinInput += key.innerText;
                updateLockPinDisplay();

                if (lockPinInput.length === 4) {
                    setTimeout(async () => {
                        const hashedInput = await hashPassword(lockPinInput);
                        if (hashedInput === state.security.pin) {
                            showToast("Mở khóa thành công!");
                            unlockApp();
                        } else {
                            showErrorShake();
                            lockPinInput = "";
                            updateLockPinDisplay();
                        }
                    }, 200);
                }
            }
        };
    });

    document.querySelector('.lock-key-del').onclick = () => {
        lockPinInput = lockPinInput.slice(0, -1);
        updateLockPinDisplay();
    };

    const bioBtn = document.getElementById('lock-biometric-btn');
    if (bioBtn) {
        bioBtn.onclick = async () => {
            const success = await verifyRealBiometric();
            if (success) {
                showToast("Mở khóa thành công!");
                unlockApp();
            } else {
                showErrorShake();
                document.getElementById('lock-error').innerText = "Vân tay không hợp lệ hoặc bị hủy!";
            }
        };
    }
}

// ==========================================
// SECURITY & CRYPTO HELPERS
// ==========================================
async function hashPassword(password) {
    if (!password) return "";
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==========================================
// REAL BIOMETRIC AUTHENTICATION (WEBAUTHN)
// ==========================================

function bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const char of bytes) {
        str += String.fromCharCode(char);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url) {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
}

async function registerRealBiometric() {
    if (!window.PublicKeyCredential) {
        alert("Thiết bị hoặc trình duyệt này không hỗ trợ xác thực sinh trắc học!");
        return false;
    }

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const publicKey = {
            challenge: challenge,
            rp: { name: "Smoney App", id: window.location.hostname },
            user: {
                id: userId,
                name: "smoney_user",
                displayName: "Người dùng Smoney"
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
            authenticatorSelection: {
                authenticatorAttachment: "platform", // Forces TouchID/FaceID/Android Fingerprint
                userVerification: "required"
            },
            timeout: 60000
        };

        const credential = await navigator.credentials.create({ publicKey });
        // Save the generated credential ID to use later for unlocking
        localStorage.setItem('smoney_bio_credential', bufferToBase64url(credential.rawId));
        return true;
    } catch (err) {
        console.error("Biometric Registration Failed:", err);
        return false;
    }
}

async function verifyRealBiometric() {
    if (!window.PublicKeyCredential) return false;
    const credentialIdB64 = localStorage.getItem('smoney_bio_credential');
    if (!credentialIdB64) return false;

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKey = {
            challenge: challenge,
            rpId: window.location.hostname,
            allowCredentials: [{
                type: "public-key",
                id: base64urlToBuffer(credentialIdB64)
            }],
            userVerification: "required",
            timeout: 60000
        };

        await navigator.credentials.get({ publicKey });
        return true; // If promise resolves, fingerprint matched!
    } catch (err) {
        console.error("Biometric Verification Failed:", err);
        return false;
    }
}

function resetLockPattern() {
    lockTempPattern = [];
    isDrawingLockPattern = false;
    document.querySelectorAll('#lock-pattern-grid .lock-dot').forEach(d => d.classList.remove('active'));
    if (lockPatternCtx) lockPatternCtx.clearRect(0, 0, 240, 240);
    document.getElementById('lock-error').classList.add('hidden');
}

function setupLockPatternListeners() {
    setTimeout(() => {
        const canvas = document.getElementById('lock-pattern-canvas');
        if (!canvas) return;
        lockPatternCtx = canvas.getContext('2d');

        const dots = document.querySelectorAll('#lock-pattern-grid .lock-dot');
        lockDotPositions = [
            { x: 40, y: 40, element: dots[0] }, { x: 120, y: 40, element: dots[1] }, { x: 200, y: 40, element: dots[2] },
            { x: 40, y: 120, element: dots[3] }, { x: 120, y: 120, element: dots[4] }, { x: 200, y: 120, element: dots[5] },
            { x: 40, y: 200, element: dots[6] }, { x: 120, y: 200, element: dots[7] }, { x: 200, y: 200, element: dots[8] }
        ];

        // Reset immediately after getting context
        resetLockPattern();
    }, 100);

    const grid = document.getElementById('lock-pattern-grid');

    const oldGrid = grid.cloneNode(true);
    grid.parentNode.replaceChild(oldGrid, grid);
    const newGrid = document.getElementById('lock-pattern-grid');

    function getMousePos(evt) {
        const canvas = document.getElementById('lock-pattern-canvas');
        const rect = canvas.getBoundingClientRect();
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function drawLockPattern(currentPos = null) {
        if (!lockPatternCtx) return;
        lockPatternCtx.clearRect(0, 0, 240, 240);
        lockPatternCtx.beginPath();
        lockPatternCtx.lineWidth = 6;
        lockPatternCtx.lineCap = 'round';
        lockPatternCtx.lineJoin = 'round';
        lockPatternCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ff8fb1';

        if (lockTempPattern.length > 0) {
            lockPatternCtx.moveTo(lockDotPositions[lockTempPattern[0]].x, lockDotPositions[lockTempPattern[0]].y);
            for (let i = 1; i < lockTempPattern.length; i++) {
                lockPatternCtx.lineTo(lockDotPositions[lockTempPattern[i]].x, lockDotPositions[lockTempPattern[i]].y);
            }
            if (currentPos) lockPatternCtx.lineTo(currentPos.x, currentPos.y);
            lockPatternCtx.stroke();
        }
    }

    function handleMove(e) {
        if (!isDrawingLockPattern) return;
        if (e.cancelable) e.preventDefault();

        const pos = getMousePos(e);
        for (let i = 0; i < lockDotPositions.length; i++) {
            const dot = lockDotPositions[i];
            const dx = pos.x - dot.x;
            const dy = pos.y - dot.y;
            if (Math.sqrt(dx * dx + dy * dy) < 35 && !lockTempPattern.includes(i)) {
                lockTempPattern.push(i);
                dot.element.classList.add('active');
                if (navigator.vibrate) navigator.vibrate(20);
                break;
            }
        }
        drawLockPattern(pos);
    }

    newGrid.addEventListener('mousedown', (e) => { resetLockPattern(); isDrawingLockPattern = true; handleMove(e); });
    newGrid.addEventListener('touchstart', (e) => { resetLockPattern(); isDrawingLockPattern = true; handleMove(e); }, { passive: false });

    const globalMove = (e) => { if (isDrawingLockPattern) handleMove(e); };
    document.addEventListener('mousemove', globalMove);
    document.addEventListener('touchmove', globalMove, { passive: false });

    const endLockDrawing = () => {
        if (isDrawingLockPattern) {
            isDrawingLockPattern = false;
            drawLockPattern();

            if (lockTempPattern.length > 0) {
                setTimeout(async () => {
                    const enteredPattern = lockTempPattern.join(',');
                    const hashedInput = await hashPassword(enteredPattern);
                    if (hashedInput === state.security.pattern) {
                        showToast("Mở khóa thành công!");
                        unlockApp();
                    } else {
                        showErrorShake();
                        resetLockPattern();
                    }
                }, 200);
            }
        }
    };
    document.addEventListener('mouseup', endLockDrawing);
    document.addEventListener('touchend', endLockDrawing);
}

// Navigation logic cleaned up

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // Initialize Magic Bubble indicator on first load
    setTimeout(() => {
        moveNavIndicator(state.currentTab);
    }, 500);

    // Update indicator on window resize
    window.addEventListener('resize', () => {
        moveNavIndicator(state.currentTab);
    });

    // Modal controls
    const modal = document.getElementById('transaction-modal');
    const closeModal = document.getElementById('close-modal');
    const nextBtn = document.getElementById('next-btn');
    const saveBtn = document.getElementById('save-btn');
    const methodBtns = document.querySelectorAll('.method-btn');

    // Xử lý nhập tiền: Tự động thêm dấu chấm phân cách hàng ngàn
    const amountInput = document.getElementById('amount-input');
    amountInput.addEventListener('input', (e) => {
        // Xóa tất cả ký tự không phải số
        let value = e.target.value.replace(/\D/g, '');

        // Cập nhật giá trị số thực vào state
        state.newTransaction.amount = Number(value);

        // Định dạng hiển thị có dấu chấm
        if (value) {
            e.target.value = Number(value).toLocaleString('vi-VN');
        } else {
            e.target.value = '';
        }
    });

    // Cho phép nhấn Enter để tiếp theo hoặc lưu
    amountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') nextBtn.click();
    });

    const noteInput = document.getElementById('note-input');
    const noteWarning = document.getElementById('note-warning');

    noteInput.addEventListener('input', () => {
        noteWarning.classList.add('hidden');
    });

    noteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });

    closeModal.onclick = () => {
        modal.classList.add('hidden');
        resetTransactionForm();
    };

    nextBtn.onclick = () => {
        const amount = document.getElementById('amount-input').value;
        if (!amount || amount === '0') {
            return;
        }

        // Hiệu ứng chuyển sang "Bản mới" hoàn toàn khác
        const title = document.getElementById('modal-title');
        title.innerHTML = ''; // Xóa chữ tiêu đề ở trang 2
        title.classList.remove('wavy-text');

        const modalContent = document.querySelector('#transaction-modal .modal-content');
        modalContent.classList.add('step-2-active'); // Xóa khung mây, đổi sang bản mới

        // Cập nhật Placeholder thông minh cho Ghi chú
        const noteInput = document.getElementById('note-input');
        const terms = state.getTerms();

        if (state.newTransaction.type === 'income') {
            noteInput.placeholder = `Ở đâu có dạ ${terms.spouse}?`;
            // Phát âm thanh nếu là nam (delay 1s)
            if (state.user.gender === 'nam') {
                setTimeout(() => {
                    state.playSound('assets/ado/odaucodachong.wav');
                }, 1000);
            }
        } else {
            noteInput.placeholder = `${terms.pronoun} sài tiền làm gì?`;
        }

        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');

        nextBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
    };

    // Xử lý chụp ảnh / chọn ảnh
    const takePhotoBtn = document.getElementById('take-photo');
    const photoInput = document.getElementById('photo-input');

    takePhotoBtn.onclick = (e) => {
        e.preventDefault();
        photoInput.click();
    };

    photoInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                state.newTransaction.photo = event.target.result;
                takePhotoBtn.style.color = '#ff8fb1'; // Đổi màu icon để báo đã có ảnh
                photoInput.value = ''; // Reset để có thể chọn lại cùng 1 ảnh
            };
            reader.readAsDataURL(file);
        }
    };

    saveBtn.onclick = () => {
        const noteInput = document.getElementById('note-input');
        const note = noteInput.value.trim();
        const warning = document.getElementById('note-warning');

        // Nếu chưa nhập note và cảnh báo đang ẩn -> Hiện cảnh báo và dừng lại
        if (!note && warning.classList.contains('hidden')) {
            warning.classList.remove('hidden');
            noteInput.focus();
            return;
        }

        state.newTransaction.note = note || 'Nguồn tiền không xác định';
        state.newTransaction.date = new Date().toISOString().split('T')[0];

        // Add to list
        state.transactions.unshift({ ...state.newTransaction, id: Date.now() });

        modal.classList.add('hidden');
        resetTransactionForm();
        switchTab('home');

        // Sync to cloud after saving
        ApiService.syncToCloud().then(res => {
            if (res.success) console.log("Transaction synced to cloud");
        });
    };

    methodBtns.forEach(btn => {
        btn.onclick = () => {
            methodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.newTransaction.method = btn.getAttribute('data-method');
        };
    });

    // Global settings listeners
    document.addEventListener('click', (e) => {
        // Sound toggle
        const soundToggle = e.target.closest('.sound-toggle-area');
        if (soundToggle) {
            state.settings.soundEnabled = !state.settings.soundEnabled;
            localStorage.setItem('smoney_sound_enabled', state.settings.soundEnabled);
            renderTab(state.currentTab);
            return;
        }

        // Theme link
        const themeLink = e.target.closest('.theme-link');
        if (themeLink) {
            switchTab('theme');
            return;
        }

        // Security link
        const securityLink = e.target.closest('.security-link');
        if (securityLink) {
            if (state.security.enabled) {
                showLockScreen(() => {
                    switchTab('security');
                });
            } else {
                switchTab('security');
            }
            return;
        }

        // Security type selection (PIN/Pattern)
        const securityTypeItem = e.target.closest('.security-type-item[data-type]');
        if (securityTypeItem) {
            const type = securityTypeItem.getAttribute('data-type');
            openSecuritySetup(type);
            return;
        }

        // Biometric toggle
        const biometricToggle = e.target.closest('#biometric-toggle');
        if (biometricToggle) {
            if (!state.security.enabled) return;

            // If turning ON, we must register a fingerprint
            if (!state.security.biometricEnabled) {
                registerRealBiometric().then(success => {
                    if (success) {
                        state.security.biometricEnabled = true;
                        localStorage.setItem('smoney_biometric_enabled', true);
                        renderTab('security');
                    } else {
                        alert("Không thể thiết lập vân tay. Vui lòng thử lại!");
                    }
                });
            } else {
                // Turning OFF
                state.security.biometricEnabled = false;
                localStorage.setItem('smoney_biometric_enabled', false);
                localStorage.removeItem('smoney_bio_credential');
                renderTab('security');
            }
            return;
        }

        // Sync Cloud button
        const syncBtn = e.target.closest('#sync-cloud-btn');
        if (syncBtn) {
            const url = prompt("Nhập URL Web App từ Google Apps Script:", API_CONFIG.url);
            if (url) {
                try {
                    ApiService.setUrl(url);
                    showToast("Đang kết nối...");
                    ApiService.syncFromCloud().then(success => {
                        if (success) {
                            showToast("Kết nối và đồng bộ thành công!");
                            renderTab('settings');
                        } else {
                            showToast("Kết nối thất bại. Kiểm tra lại URL!");
                        }
                    });
                } catch (err) {
                    alert(err.message);
                }
            }
            return;
        }

    });

    setupSecurityListeners();
}

function moveNavIndicator(tabId) {
    const nav = document.querySelector('.bottom-nav');
    if (!nav || document.body.classList.contains('web-layout')) return;

    let indicator = nav.querySelector('.nav-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'nav-indicator';
        nav.appendChild(indicator);
    }

    const indicatorWidth = 70; // Fixed width matching CSS
    const activeBtn = nav.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (activeBtn) {
        const navRect = nav.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        const center = (btnRect.left - navRect.left) + (btnRect.width / 2) - (indicatorWidth / 2);
        indicator.style.left = `${center}px`;
    }
}

function switchTab(tab) {
    state.currentTab = tab;

    // Update Nav UI
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tab) {
            item.classList.add('active');
        }
    });

    // Move Magic Indicator
    moveNavIndicator(tab);

    renderTab(tab);
    applyTheme();
    // state.playSound('assets/sounds/pop.mp3'); // File này hiện không tồn tại
}

function renderTab(tab) {
    const container = document.getElementById('main-content');
    container.innerHTML = '';
    container.classList.remove('fade-in');
    void container.offsetWidth; // Trigger reflow
    container.classList.add('fade-in');

    if (tab === 'home') {
        renderHome(container);
    } else if (tab === 'transaction') {
        renderTransaction(container);
    } else if (tab === 'stats') {
        renderStats(container);
        initStatsSlider(); // Khởi tạo tính năng kéo lướt cho slider
    } else if (tab === 'settings') {
        renderSettings(container);
    } else if (tab === 'security') {
        renderSecuritySettings(container);
    } else if (tab === 'theme') {
        renderThemeSettings(container);
    } else if (tab === 'goals') {
        renderGoals(container);
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}

function initStatsSlider() {
    const slider = document.querySelector('.stats-slider');
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active');

        // Tự động tìm thẻ gần nhất để "hít" vào (Snap) cho PC
        const cards = slider.querySelectorAll('.stats-card-item');
        let closest = cards[0];
        let minDiff = Math.abs(cards[0].offsetLeft - slider.scrollLeft);

        cards.forEach(card => {
            const diff = Math.abs((card.offsetLeft - slider.offsetWidth / 2 + card.offsetWidth / 2) - slider.scrollLeft);
            // Một chút logic để tính toán vị trí trung tâm
            const cardCenter = card.offsetLeft + card.offsetWidth / 2;
            const sliderCenter = slider.scrollLeft + slider.offsetWidth / 2;
            const currentDiff = Math.abs(cardCenter - sliderCenter);

            if (currentDiff < minDiff) {
                minDiff = currentDiff;
                closest = card;
            }
        });

        if (closest) {
            closest.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });
}

function renderHome(container) {
    const terms = state.getTerms();

    // Tổng
    const totalIncome = state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    // Tiền mặt
    const cashIncome = state.transactions.filter(t => t.type === 'income' && t.method === 'cash').reduce((sum, t) => sum + Number(t.amount), 0);
    const cashExpense = state.transactions.filter(t => t.type === 'expense' && t.method === 'cash').reduce((sum, t) => sum + Number(t.amount), 0);
    const cashBalance = cashIncome - cashExpense;

    // Tài khoản
    const bankIncome = state.transactions.filter(t => t.type === 'income' && t.method === 'bank').reduce((sum, t) => sum + Number(t.amount), 0);
    const bankExpense = state.transactions.filter(t => t.type === 'expense' && t.method === 'bank').reduce((sum, t) => sum + Number(t.amount), 0);
    const bankBalance = bankIncome - bankExpense;

    container.innerHTML = `
        <header>
            <h2 style="color: var(--text-light); margin-bottom: 5px;">Chào ${terms.greeting} ${state.user.name}! </h2>
            <h1 style="margin-bottom: 25px;">Smoney của ${terms.self} nè!</h1>
        </header>

        <div class="balance-card" style="margin-bottom: 25px;">
            <p class="balance-label">Tổng số dư hiện tại</p>
            <p class="balance-amount">${balance.toLocaleString()} VNĐ</p>
            <p style="font-size: 12px; opacity: 0.8; margin-top: 5px;">Smoney giúp ${terms.spouse} ghi nhớ!</p>
        </div>
        
        <div class="funds-grid" style="display: flex; gap: 15px; margin-bottom: 30px;">
            <div class="fund-card" style="flex: 1; background: white; padding: 20px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--primary);">
                    <div style="background: color-mix(in srgb, var(--primary) 15%, transparent); padding: 8px; border-radius: 12px; display: flex;">
                        <i data-lucide="banknote" style="width: 18px; height: 18px;"></i>
                    </div>
                    <span style="font-size: 13px; font-weight: 700; color: var(--text-light);">Tiền mặt</span>
                </div>
                <p style="font-size: 18px; font-weight: 800; color: var(--text-main);">${cashBalance.toLocaleString()} <span style="font-size: 14px; font-weight: 600; opacity: 0.7;">đ</span></p>
            </div>
            
            <div class="fund-card" style="flex: 1; background: white; padding: 20px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--primary);">
                    <div style="background: color-mix(in srgb, var(--primary) 15%, transparent); padding: 8px; border-radius: 12px; display: flex;">
                        <i data-lucide="landmark" style="width: 18px; height: 18px;"></i>
                    </div>
                    <span style="font-size: 13px; font-weight: 700; color: var(--text-light);">Tài khoản</span>
                </div>
                <p style="font-size: 18px; font-weight: 800; color: var(--text-main);">${bankBalance.toLocaleString()} <span style="font-size: 14px; font-weight: 600; opacity: 0.7;">đ</span></p>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-icon income"><i data-lucide="trending-up"></i></div>
                <div class="stat-info">
                    <span>Heo Ăn</span>
                    <p>+${totalIncome.toLocaleString()}</p>
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-icon expense"><i data-lucide="trending-down"></i></div>
                <div class="stat-info">
                    <span>Heo Tiêu</span>
                    <p>-${totalExpense.toLocaleString()}</p>
                </div>
            </div>
        </div>

        <div class="history-section">
            <div class="section-header">
                <h3>Nhật Ký Gần Đây</h3>
                <span style="font-size: 12px; color: var(--primary); font-weight: 600; cursor: pointer;">Xem tất cả</span>
            </div>
            <div id="history-list">
                ${state.transactions.slice(0, 5).map(t => `
                    <div class="history-item">
                        <div class="item-icon">
                            ${t.photo ? `<img src="${t.photo}" class="item-photo">` : `<i data-lucide="${t.type === 'income' ? 'sparkles' : 'shopping-cart'}"></i>`}
                        </div>
                        <div class="item-info">
                            <h4>${t.note}</h4>
                            <p>${t.date} • ${t.method === 'cash' ? 'Tiền mặt' : 'Tài khoản'}</p>
                        </div>
                        <div class="item-amount ${t.type}">
                            ${t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderTransaction(container) {
    container.innerHTML = `
        <header style="margin-bottom: 20px;">
            <h1 style="text-align: center;">Hôm nay thế nào?</h1>
            <p style="text-align: center; color: var(--text-light); margin-top: 8px;">Phải biết tiết kiệm nha ôn</p>
        </header>

        <div class="ben-container">
            <div class="ben-animation"></div>
            <button class="kute-btn transfer" id="btn-transfer"></button>
        </div>

        <div class="hero-buttons">
            <button class="kute-btn income" id="btn-income">
                <span>Heo Béo Lên (Thu)</span>
                <div class="btn-bubble"><i data-lucide="plus"></i></div>
            </button>
            
            <button class="kute-btn expense" id="btn-expense">
                <span>Heo Gầy Đi (Chi)</span>
                <div class="btn-bubble"><i data-lucide="minus"></i></div>
            </button>
        </div>

        <div id="transfer-modal" class="modal hidden">
            <div class="modal-content" style="background: white; border-radius: 20px; padding: 18px; width: 90%; max-width: 380px; text-align: center; position: relative; margin: 0 auto;">
                <h2 style="font-family: 'KoniBlack', sans-serif; color: var(--primary); font-size: 20px; margin-bottom: 2px;">Rút / Nạp Tiền</h2>
                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; background: #f8f8f8; padding: 12px 15px; border-radius: 16px;">
                    <div style="flex: 1;">
                        <span style="font-size: 11px; color: var(--text-light); font-weight: 600;">Từ</span>
                        <div style="font-weight: 700; color: var(--text-main); margin-top: 4px; font-size: 14px;" id="transfer-from" data-method="bank">Tài khoản</div>
                    </div>
                    <button id="transfer-swap" style="background: var(--primary); color: white; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 143, 177, 0.3);">
                        <i data-lucide="arrow-right-left" style="width: 18px; height: 18px;"></i>
                    </button>
                    <div style="flex: 1;">
                        <span style="font-size: 11px; color: var(--text-light); font-weight: 600;">Đến</span>
                        <div style="font-weight: 700; color: var(--text-main); margin-top: 4px; font-size: 14px;" id="transfer-to" data-method="cash">Tiền mặt</div>
                    </div>
                </div>

                <div class="input-group" style="text-align: left; margin-bottom: 2px;">
                    <input type="tel" id="transfer-amount" placeholder="Nhập số tiền..." style="width: 100%; box-sizing: border-box; border-radius: 16px; border: 2px solid var(--bg-color); background: var(--bg-color); font-weight: 700; color: var(--primary); outline: none;">
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 6px;">
                    <button id="transfer-cancel" style="flex: 1; padding: 14px; border-radius: 16px; border: none; background: #f0f0f0; color: var(--text-main); font-weight: 700; cursor: pointer;">Hủy</button>
                    <button id="transfer-confirm" style="flex: 1; padding: 14px; border-radius: 16px; border: none; background: var(--primary); color: white; font-weight: 700; cursor: pointer;">Chuyển</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-income').onclick = () => openModal('income');
    document.getElementById('btn-expense').onclick = () => openModal('expense');

    // Transfer logic
    const modal = document.getElementById('transfer-modal');
    const btnTransfer = document.getElementById('btn-transfer');
    const btnCancel = document.getElementById('transfer-cancel');
    const btnConfirm = document.getElementById('transfer-confirm');
    const btnSwap = document.getElementById('transfer-swap');
    const fromEl = document.getElementById('transfer-from');
    const toEl = document.getElementById('transfer-to');
    const amountInput = document.getElementById('transfer-amount');

    // Format amount input
    amountInput.addEventListener('input', function () {
        let value = this.value.replace(/\D/g, '');
        if (value) {
            this.value = Number(value).toLocaleString('en-US');
        } else {
            this.value = '';
        }
    });

    btnTransfer.onclick = () => {
        modal.classList.remove('hidden');
        amountInput.value = '';
        setTimeout(() => amountInput.focus(), 100);
    };

    btnCancel.onclick = () => {
        modal.classList.add('hidden');
    };

    btnSwap.onclick = () => {
        const fromMethod = fromEl.getAttribute('data-method');
        const toMethod = toEl.getAttribute('data-method');

        fromEl.setAttribute('data-method', toMethod);
        fromEl.innerText = toMethod === 'cash' ? 'Tiền mặt' : 'Tài khoản';

        toEl.setAttribute('data-method', fromMethod);
        toEl.innerText = fromMethod === 'cash' ? 'Tiền mặt' : 'Tài khoản';
    };

    btnConfirm.onclick = () => {
        const amountStr = amountInput.value.replace(/\D/g, '');
        if (!amountStr) {
            showToast("Vui lòng nhập số tiền!");
            return;
        }

        const amount = Number(amountStr);
        const fromMethod = fromEl.getAttribute('data-method');
        const toMethod = toEl.getAttribute('data-method');
        const date = new Date().toISOString().split('T')[0];
        const note = fromMethod === 'bank' ? "Rút tiền từ tài khoản ra tiền mặt" : "Nạp tiền mặt vào tài khoản";

        // Create Expense from source
        const expenseTx = {
            id: Date.now().toString() + '-exp',
            type: 'expense',
            amount: amount,
            note: note,
            date: date,
            method: fromMethod,
            photo: null
        };

        // Create Income to destination
        const incomeTx = {
            id: Date.now().toString() + '-inc',
            type: 'income',
            amount: amount,
            note: note,
            date: date,
            method: toMethod,
            photo: null
        };

        state.transactions.unshift(incomeTx);
        state.transactions.unshift(expenseTx);

        localStorage.setItem('smoney_transactions', JSON.stringify(state.transactions));
        showToast("Đã chuyển quỹ thành công!");
        modal.classList.add('hidden');
    };
}

function renderStats(container) {
    // Default: current week (Mon-Sun)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = d => d.toISOString().split('T')[0]; // yyyy-mm-dd

    const isAndroid = isAndroidApp();
    const dateDisplay = (d) => {
        const parts = d.split('-');
        return `${parts[2]}/${parts[1]}`;
    };

    container.innerHTML = `
        <header style="margin-bottom: 25px;">
        </header>

        <div class="history-section" style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <div style="display: flex; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span class="chart-legend-line" style="width: 14px; height: 3px; border-radius: 2px; background: var(--primary);"></span>
                    <span style="font-size: 11px; color: var(--text-light);">Thu</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span class="chart-legend-line" style="width: 14px; height: 3px; border-radius: 2px; background: color-mix(in srgb, var(--primary) 60%, #333);"></span>
                    <span style="font-size: 11px; color: var(--text-light);">Chi</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; position: relative;">
                ${isAndroid ? `
                    <button id="date-range-trigger" style="background: transparent; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s ease; padding: 0;">
                        <i data-lucide="calendar" style="width: 17px; height: 17px; color: var(--primary);"></i>
                    </button>
                    <div id="date-range-popover" style="display: none; position: absolute; top: calc(100% + 10px); right: 0; background: white; padding: 20px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); z-index: 1000; min-width: 220px; border: 1px solid #f0f0f0;">
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <div style="font-size: 12px; font-weight: 700; color: var(--text-main); margin-bottom: 5px; text-align: center;" id="date-range-label">
                                ${dateDisplay(fmt(monday))} - ${dateDisplay(fmt(sunday))}
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 11px; font-weight: 600; color: var(--text-light); margin-left: 5px;">Từ ngày</label>
                                <input type="date" id="chart-start" value="${fmt(monday)}" style="border: 1px solid #e0e0e0; background: #f8f8f8; padding: 8px 12px; border-radius: 12px; font-size: 13px; color: var(--text-main); width: 100%; outline: none;">
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="font-size: 11px; font-weight: 600; color: var(--text-light); margin-left: 5px;">Đến ngày</label>
                                <input type="date" id="chart-end" value="${fmt(sunday)}" style="border: 1px solid #e0e0e0; background: #f8f8f8; padding: 8px 12px; border-radius: 12px; font-size: 13px; color: var(--text-main); width: 100%; outline: none;">
                            </div>
                            <p id="chart-warning-modal" style="display: none; font-size: 10px; color: #f44336; font-weight: 600; margin-top: -5px;"></p>
                        </div>
                    </div>
                ` : `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="date" id="chart-start" value="${fmt(monday)}" style="border: 1px solid #e0e0e0; background: #f8f8f8; padding: 5px 10px; border-radius: 10px; font-size: 12px; color: var(--text-main);">
                        <span style="font-size: 12px; color: var(--text-light);">đến</span>
                        <input type="date" id="chart-end" value="${fmt(sunday)}" style="border: 1px solid #e0e0e0; background: #f8f8f8; padding: 5px 10px; border-radius: 10px; font-size: 12px; color: var(--text-main);">
                    </div>
                `}
            </div>
        </div>

        <div class="stat-card" style="background: transparent; padding: 0px; margin-bottom: 25px;">
            <canvas id="stats-chart" width="600" height="220" style="width: 100%; height: auto;"></canvas>
            <p id="chart-warning" style="display: none; font-size: 11px; color: #f44336; margin-top: 5px; font-weight: 600;"></p>
        </div>

        <div class="history-section">
            <h3>Chi tiết Thu Chi</h3>
            <div id="stats-list" class="stats-slider" style="margin-top: 5px;">
                ${state.transactions.map(t => `
                    <div class="stats-card-item" style="position: relative; overflow: hidden;">
                        <!-- Số tiền - Ghim cố định ở trên -->
                        <div style="position: absolute; top: 65px; left: 0; right: 0; text-align: center; pointer-events: none; z-index: 10;">
                            <div class="item-amount ${t.type}" style="font-size: 27px; font-family: 'KoniBlack', sans-serif;">
                                ${t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                            </div>
                        </div>

                        <!-- Ghi chú - Ghim ở giữa -->
                        <div class="item-info" style="position: absolute; top: 100px; left: 45px; right: 75px; text-align: center; transform: rotate(2deg); opacity: 0.85; z-index: 5;">
                            <h4 style="font-size: ${t.note.length > 80 ? '11px' : t.note.length > 50 ? '13px' : t.note.length > 20 ? '15px' : '18px'}; color: var(--text-main); display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; word-break: break-word; line-height: 1.2; margin: 0;">
                                <i data-lucide="${t.method === 'cash' ? 'banknote' : 'landmark'}" style="width: 16px; height: 16px; color: var(--primary); opacity: 0.8; flex-shrink: 0;"></i>
                                <span style="max-width: 100%;">${t.note}</span>
                            </h4>
                        </div>

                        <!-- Ảnh - Ghim dưới ghi chú -->
                        ${t.photo ? `
                        <div style="position: absolute; top: ${t.note.length > 40 ? '165px' : '145px'}; left: 50%; transform: translateX(-50%) rotate(2deg); width: ${t.note.length > 60 ? '35%' : '50%'}; aspect-ratio: 4 / 3; border-radius: 12px; overflow: hidden; z-index: 4;">
                            <img src="${t.photo}" style="width: 100%; height: 100%; object-fit: contain;">
                        </div>` : ''}

                        <!-- Ngày - Ghim cố định góc dưới -->
                        <div style="position: absolute; bottom: 62px; right: 82px; transform: rotate(2deg); opacity: 0.6; pointer-events: none; z-index: 10;">
                            <p style="font-size: 10.5px; color: var(--text-light); font-weight: 700;">${t.date}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
    drawStatsChart(fmt(monday), fmt(sunday));

    const startInput = document.getElementById('chart-start');
    const endInput = document.getElementById('chart-end');
    const warning = document.getElementById('chart-warning');
    const warningModal = document.getElementById('chart-warning-modal');
    const label = document.getElementById('date-range-label');

    const onDateChange = () => {
        const s = startInput.value;
        const e = endInput.value;
        if (!s || !e) return;

        const sd = new Date(s);
        const ed = new Date(e);
        const diffDays = Math.round((ed - sd) / (1000 * 60 * 60 * 24));

        let error = '';
        if (diffDays < 0) error = 'Ngày bắt đầu phải trước ngày kết thúc!';
        else if (diffDays > 6) error = 'Tối đa 7 ngày! Vui lòng chọn lại.';

        if (error) {
            if (warning) { warning.textContent = error; warning.style.display = 'block'; }
            if (warningModal) { warningModal.textContent = error; warningModal.style.display = 'block'; }
            return;
        }

        if (warning) warning.style.display = 'none';
        if (warningModal) warningModal.style.display = 'none';

        if (label) label.innerText = `${dateDisplay(s)} - ${dateDisplay(e)}`;
        drawStatsChart(s, e);
    };

    startInput.addEventListener('change', onDateChange);
    endInput.addEventListener('change', onDateChange);

    if (isAndroid) {
        const trigger = document.getElementById('date-range-trigger');
        const popover = document.getElementById('date-range-popover');
        trigger.onclick = (e) => {
            e.stopPropagation();
            popover.style.display = popover.style.display === 'none' ? 'block' : 'none';
        };
        document.addEventListener('click', (e) => {
            if (popover && !popover.contains(e.target) && e.target !== trigger) {
                popover.style.display = 'none';
            }
        });
    }
}

// Chart state for tooltip interaction
let _chartMeta = null;

function formatMoney(val) {
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace('.0', '') + 'tr';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
    return val.toString();
}

function drawStatsChart(startStr, endStr) {
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    // Get theme colors
    const cs = getComputedStyle(document.documentElement);
    const primaryColor = cs.getPropertyValue('--primary').trim() || '#ff8fb1';
    // Derive expense color: darker shade of primary
    const expenseColor = `color-mix(in srgb, ${primaryColor} 60%, #333)`;
    // We'll compute the actual hex for canvas from a temp element
    const tempEl = document.createElement('div');
    tempEl.style.color = primaryColor;
    document.body.appendChild(tempEl);
    const incomeHex = getComputedStyle(tempEl).color;
    tempEl.style.color = expenseColor;
    const expenseHex = getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);

    // Build date list
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    const dates = [];
    const dd = new Date(startDate);
    while (dd <= endDate) {
        dates.push(dd.toISOString().split('T')[0]);
        dd.setDate(dd.getDate() + 1);
    }
    if (dates.length === 0) return;

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // Aggregate data per day
    const incomeData = dates.map(date =>
        state.transactions.filter(t => t.date === date && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    );
    const expenseData = dates.map(date =>
        state.transactions.filter(t => t.date === date && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    );

    const allValues = [...incomeData, ...expenseData].filter(v => v > 0);
    const rawMax = Math.max(...allValues, 1000);

    // Smart scaling: use sqrt scale when disparity is > 10x
    const minNonZero = Math.min(...allValues.filter(v => v > 0), rawMax);
    const ratio = rawMax / Math.max(minNonZero, 1);
    const useSmartScale = ratio > 10;

    function scaleVal(v) {
        if (!useSmartScale) return v / rawMax;
        // Square root scale to compress large values and reveal small ones
        return Math.sqrt(v) / Math.sqrt(rawMax);
    }

    // For Y-axis labels, use nice ticks
    function niceMax(v) {
        if (v <= 1000) return 1000;
        const mag = Math.pow(10, Math.floor(Math.log10(v)));
        return Math.ceil(v / mag) * mag;
    }
    const labelMax = niceMax(rawMax);

    // Chart area
    const padLeft = 55;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 40;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;

    // Grid lines & Y labels
    const gridCount = 4;
    ctx.font = '10px Outfit, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridCount; i++) {
        const frac = i / gridCount;
        const y = padTop + chartH - frac * chartH;
        let val;
        if (useSmartScale) {
            // Inverse sqrt to get the actual value at this visual position
            val = Math.round(Math.pow(frac * Math.sqrt(rawMax), 2));
        } else {
            val = Math.round(frac * rawMax);
        }
        ctx.fillStyle = '#b0b0b0';
        ctx.fillText(formatMoney(val), padLeft - 10, y + 3);
        ctx.strokeStyle = i === 0 ? '#e0e0e0' : '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.setLineDash(i === 0 ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(W - padRight, y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // X labels + vertical guides
    ctx.textAlign = 'center';
    const stepX = dates.length > 1 ? chartW / (dates.length - 1) : chartW;
    const dotPositionsX = [];
    dates.forEach((date, i) => {
        const x = padLeft + (dates.length > 1 ? i * stepX : chartW / 2);
        dotPositionsX.push(x);
        const dow = new Date(date).getDay();
        ctx.fillStyle = '#a0a0a0';
        ctx.font = '11px Outfit, sans-serif';
        ctx.fillText(dayNames[dow], x, H - 10);
        // Subtle vertical guide
        ctx.strokeStyle = '#f2f2f2';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // Helper: smooth Bezier curve through points
    function drawSmoothLine(data, strokeColor, labelOffset) {
        if (data.length === 0) return;
        const points = data.map((val, i) => ({
            x: dotPositionsX[i],
            y: padTop + chartH - scaleVal(val) * chartH
        }));

        // Draw smooth path
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
            const cp = (points[i + 1].x - points[i].x) / 2.5;
            ctx.bezierCurveTo(
                points[i].x + cp, points[i].y,
                points[i + 1].x - cp, points[i + 1].y,
                points[i + 1].x, points[i + 1].y
            );
        }
        const isAndroid = isAndroidApp();
        const lineW = isAndroid ? 1.5 : 2.5;
        const dotR = isAndroid ? 3.5 : 5;
        const glowR = isAndroid ? 6 : 8;
        const innerR = isAndroid ? 1.2 : 2;

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineW;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Fill area with globalAlpha to avoid color parsing issues
        ctx.lineTo(points[points.length - 1].x, padTop + chartH);
        ctx.lineTo(points[0].x, padTop + chartH);
        ctx.closePath();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Draw dots with glow and text labels
        points.forEach((pt, i) => {
            const val = data[i];
            if (val === 0) return; // Hide dots and 0 amounts for days without transactions

            // Glow
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, glowR, 0, Math.PI * 2);
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = strokeColor;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Outer ring
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, dotR, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isAndroid ? 1.5 : 2.5;
            ctx.stroke();

            // Inner dot
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, innerR, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.fill();

            // Draw value text
            ctx.fillStyle = strokeColor;
            ctx.font = `bold ${isAndroid ? '9.5px' : '10.5px'} Outfit, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(formatMoney(val), pt.x, pt.y + labelOffset);
        });

        return points;
    }

    // Draw lines
    const incomePoints = drawSmoothLine(incomeData, incomeHex, -12);
    const expensePoints = drawSmoothLine(expenseData, expenseHex, 18);

    // Update legend colors dynamically
    const legendEls = document.querySelectorAll('.chart-legend-line');
    if (legendEls[0]) legendEls[0].style.background = incomeHex;
    if (legendEls[1]) legendEls[1].style.background = expenseHex;

    // Store metadata for click interaction
    _chartMeta = { dates, incomeData, expenseData, dotPositionsX, dayNames, canvas, padTop, chartH, scaleVal, incomeHex, expenseHex };

    // Setup click/tap listener (only once)
    if (!canvas._hasClickListener) {
        canvas._hasClickListener = true;
        const handleClick = (e) => {
            if (!_chartMeta) return;
            const r = canvas.getBoundingClientRect();
            const clickX = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
            // Find nearest day
            let nearestIdx = 0;
            let nearestDist = Infinity;
            _chartMeta.dotPositionsX.forEach((x, i) => {
                const dist = Math.abs(clickX - x);
                if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
            });
            if (nearestDist > 40) {
                // Clicked too far, hide tooltip
                const tip = document.getElementById('chart-tooltip');
                if (tip) tip.style.display = 'none';
                return;
            }
            showChartTooltip(nearestIdx);
        };
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', handleClick, { passive: true });
    }
}

function showChartTooltip(idx) {
    if (!_chartMeta) return;
    const { dates, incomeData, expenseData, dotPositionsX, dayNames, canvas, incomeHex, expenseHex } = _chartMeta;
    let tip = document.getElementById('chart-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'chart-tooltip';
        tip.style.cssText = 'position:absolute;padding:10px 14px;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);font-size:12px;z-index:50;pointer-events:none;transition:all 0.2s ease;min-width:120px;';
        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(tip);
    }
    const dow = new Date(dates[idx]).getDay();
    const dayLabel = dayNames[dow];
    const inc = incomeData[idx];
    const exp = expenseData[idx];
    tip.innerHTML = `
        <div style="font-weight:700;color:var(--text-main);margin-bottom:6px;">${dayLabel} - ${dates[idx]}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${incomeHex};"></span>
            <span style="color:var(--text-light);">Thu:</span>
            <span style="font-weight:700;color:${incomeHex};">+${Number(inc).toLocaleString()}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${expenseHex};"></span>
            <span style="color:var(--text-light);">Chi:</span>
            <span style="font-weight:700;color:${expenseHex};">-${Number(exp).toLocaleString()}</span>
        </div>
    `;
    tip.style.display = 'block';
    // Position tooltip near the dot
    const canvasRect = canvas.getBoundingClientRect();
    const parentRect = canvas.parentElement.getBoundingClientRect();
    let left = dotPositionsX[idx] - 60;
    if (left < 5) left = 5;
    if (left + 140 > canvasRect.width) left = canvasRect.width - 145;
    tip.style.left = left + 'px';
    tip.style.top = '5px';
}

function renderSettings(container) {
    const terms = state.getTerms();
    container.innerHTML = `
        <header style="margin-bottom: 35px; text-align: center;">
        </header>

        <div class="settings-profile">
            <div class="avatar-wrapper">
                <i data-lucide="user"></i>
            </div>
            <h2 class="user-name">${state.user.name}</h2>
            <p class="user-email">${state.user.email || 'nguoidung@smoney.vn'}</p>
        </div>

        <div class="settings-list">
            <div class="settings-item sound-toggle-area">
                <div class="item-icon-pink"><i data-lucide="${state.settings.soundEnabled ? 'bell' : 'bell-off'}"></i></div>
                <div class="item-text">Âm thanh ứng dụng</div>
                <div class="toggle-switch ${state.settings.soundEnabled ? 'active' : ''}">
                    <div class="toggle-dot"></div>
                </div>
            </div>
            ${isAndroidApp() ? `
            <div class="settings-item security-link">
                <div class="item-icon-pink"><i data-lucide="shield"></i></div>
                <div class="item-text">Bảo mật</div>
                <div style="font-size: 11px; color: ${state.security.enabled ? 'var(--primary)' : 'var(--text-light)'}; background: ${state.security.enabled ? '#fff0f5' : '#f5f5f5'}; padding: 4px 8px; border-radius: 10px; margin-right: 5px; font-weight: 600;">
                    ${state.security.enabled ? 'Đang bật' : 'Đang tắt'}
                </div>
                <i data-lucide="chevron-right" class="chevron"></i>
            </div>
            ` : ''}

            <div class="settings-item theme-link">
                <div class="item-icon-pink"><i data-lucide="palette"></i></div>
                <div class="item-text">Chủ đề</div>
                <i data-lucide="chevron-right" class="chevron"></i>
            </div>

            <div class="settings-item" id="sync-cloud-btn">
                <div class="item-icon-pink" style="background: #e3f2fd; color: #2196f3;"><i data-lucide="cloud-cloud-sync"></i></div>
                <div class="item-text">Kết nối Cloud</div>
                <div style="font-size: 11px; color: ${API_CONFIG.enabled ? '#4caf50' : '#f44336'}; font-weight: 700;">
                    ${API_CONFIG.enabled ? 'Đã kết nối' : 'Chưa kết nối'}
                </div>
            </div>
            <div class="settings-item logout-btn-trigger" id="logout-btn">
                <div class="item-icon-pink logout-icon" style="background: #fff0f0; color: #ff4d4d;"><i data-lucide="log-out"></i></div>
                <div class="item-text logout-text" style="color: #ff4d4d; font-weight: 700;">Đăng xuất</div>
            </div>
        </div>
    `;

    // Add listener directly after rendering
    const logoutBtn = container.querySelector('#logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            showConfirmModal();
        };
    }
}

function renderSecuritySettings(container) {
    container.innerHTML = `
        <header style="margin-bottom: 35px; display: flex; align-items: center; gap: 15px;">
            <button class="back-btn" onclick="switchTab('settings')"><i data-lucide="arrow-left"></i></button>
            <h1 style="font-family: 'KoniBlack', sans-serif; font-size: 28px;">Bảo Mật</h1>
        </header>

        <div class="security-card">
            <div class="security-header">
                <div class="security-icon-large"><i data-lucide="shield-check"></i></div>
                <h3>Khóa ứng dụng</h3>
                <p>Giúp Heo bảo vệ bí mật của ${state.getTerms().greeting}</p>
                <div class="toggle-switch ${state.security.enabled ? 'active' : ''}" id="toggle-security">
                    <div class="toggle-dot"></div>
                </div>
            </div>
        </div>

        <div class="security-options ${state.security.enabled ? '' : 'disabled-area'}">
            <h4 style="margin: 25px 0 15px 5px; color: var(--text-light); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Kiểu khóa</h4>
            
            <div class="security-type-item ${state.security.type === 'pin' ? 'active' : ''}" data-type="pin">
                <div class="type-icon"><i data-lucide="lock"></i></div>
                <div class="type-info">
                    <h5>Mã PIN</h5>
                    <p>${state.security.pin ? '● ● ● ● (Bấm để đổi mã)' : 'Bấm để thiết lập mã PIN mới'}</p>
                </div>
                <div class="type-check"><i data-lucide="check-circle"></i></div>
            </div>

            <div class="security-type-item ${state.security.type === 'pattern' ? 'active' : ''}" data-type="pattern">
                <div class="type-icon"><i data-lucide="grid-3x3"></i></div>
                <div class="type-info">
                    <h5>Mẫu hình</h5>
                    <p>${state.security.type === 'pattern' ? 'Đã có mẫu hình (Bấm để vẽ lại)' : 'Bấm để vẽ mẫu hình mới'}</p>
                </div>
                <div class="type-check"><i data-lucide="check-circle"></i></div>
            </div>

            <h4 style="margin: 25px 0 15px 5px; color: var(--text-light); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Nâng cao</h4>

            <div class="security-type-item biometric-toggle">
                <div class="type-icon"><i data-lucide="fingerprint"></i></div>
                <div class="type-info">
                    <h5>Vân tay / Khuôn mặt</h5>
                    <p>Mở khóa nhanh hơn</p>
                </div>
                <div class="toggle-switch ${state.security.biometricEnabled ? 'active' : ''}">
                    <div class="toggle-dot"></div>
                </div>
            </div>
        </div>
    `;

    // Add listeners for security sub-page
    const toggleSecurity = document.getElementById('toggle-security');
    if (toggleSecurity) {
        toggleSecurity.onclick = (e) => {
            e.stopPropagation();
            state.security.enabled = !state.security.enabled;
            localStorage.setItem('smoney_security_enabled', state.security.enabled);
            renderSecuritySettings(container);
            if (window.lucide) lucide.createIcons();
        };
    }
}

let tempPin = "";
let tempPattern = [];
let isDrawingPattern = false;
let patternCtx = null;
let dotPositions = [];

function openSecuritySetup(type) {
    const modal = document.getElementById('security-modal');
    const title = document.getElementById('security-modal-title');
    const pinSetup = document.getElementById('pin-setup');
    const patternSetup = document.getElementById('pattern-setup');

    modal.classList.remove('hidden');
    pinSetup.classList.add('hidden');
    patternSetup.classList.add('hidden');

    if (type === 'pin') {
        title.innerText = "Thiết lập mã PIN";
        pinSetup.classList.remove('hidden');
        tempPin = "";
        updatePinDisplay();
    } else if (type === 'pattern') {
        title.innerText = "Thiết lập mẫu hình";
        patternSetup.classList.remove('hidden');

        // Initialize canvas instantly
        const canvas = document.getElementById('pattern-canvas');
        patternCtx = canvas.getContext('2d');

        // Reset everything
        resetPattern();

        // Hardcode positions since the grid is fixed at 240x240
        const dots = document.querySelectorAll('.pattern-grid .dot');
        dotPositions = [
            { x: 40, y: 40, element: dots[0] }, { x: 120, y: 40, element: dots[1] }, { x: 200, y: 40, element: dots[2] },
            { x: 40, y: 120, element: dots[3] }, { x: 120, y: 120, element: dots[4] }, { x: 200, y: 120, element: dots[5] },
            { x: 40, y: 200, element: dots[6] }, { x: 120, y: 200, element: dots[7] }, { x: 200, y: 200, element: dots[8] }
        ];
    }
}

function resetPattern() {
    tempPattern = [];
    isDrawingPattern = false;
    document.querySelectorAll('.pattern-grid .dot').forEach(d => d.classList.remove('active'));
    if (patternCtx) {
        patternCtx.clearRect(0, 0, 240, 240);
    }
}

function updatePinDisplay() {
    const dots = document.querySelectorAll('#pin-setup .pin-dot');
    dots.forEach((dot, i) => {
        if (i < tempPin.length) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function setupSecurityListeners() {
    // PIN Keypad
    document.querySelectorAll('#pin-setup .key').forEach(key => {
        key.onclick = () => {
            if (tempPin.length < 4 && key.innerText !== "") {
                tempPin += key.innerText;
                updatePinDisplay();
            }
        };
    });

    document.querySelector('#pin-setup .key-del').onclick = () => {
        tempPin = tempPin.slice(0, -1);
        updatePinDisplay();
    };

    // Close Security Modal
    document.getElementById('close-security-modal').onclick = () => {
        document.getElementById('security-modal').classList.add('hidden');
    };

    // Save Security
    document.getElementById('security-save-btn').onclick = async () => {
        const modal = document.getElementById('security-modal');
        const activeSetup = !document.getElementById('pin-setup').classList.contains('hidden') ? 'pin' : 'pattern';

        if (activeSetup === 'pin') {
            if (tempPin.length < 4) {
                alert("Vui lòng nhập đủ 4 số nha!");
                return;
            }
            const hashedPin = await hashPassword(tempPin);
            state.security.pin = hashedPin;
            state.security.type = 'pin';
            localStorage.setItem('smoney_security_pin', hashedPin);
            localStorage.setItem('smoney_security_type', 'pin');
        } else {
            if (tempPattern.length < 4) {
                alert("Vui lòng vẽ ít nhất 4 điểm!");
                resetPattern();
                return;
            }
            const patternString = tempPattern.join(',');
            const hashedPattern = await hashPassword(patternString);
            state.security.pattern = hashedPattern;
            state.security.type = 'pattern';
            localStorage.setItem('smoney_security_pattern', hashedPattern);
            localStorage.setItem('smoney_security_type', 'pattern');
        }

        state.security.enabled = true; // Auto-enable when a password is saved
        localStorage.setItem('smoney_security_enabled', true);

        modal.classList.add('hidden');
        showToast("Đã thiết lập bảo mật");
        renderTab('security');
    };

    // Pattern drawing logic
    const grid = document.getElementById('pattern-grid');
    const canvas = document.getElementById('pattern-canvas');

    function getMousePos(evt) {
        const rect = canvas.getBoundingClientRect();
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function drawPattern(currentPos = null) {
        if (!patternCtx) return;
        patternCtx.clearRect(0, 0, 240, 240);
        patternCtx.beginPath();
        patternCtx.lineWidth = 6;
        patternCtx.lineCap = 'round';
        patternCtx.lineJoin = 'round';
        patternCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ff8fb1';

        if (tempPattern.length > 0) {
            patternCtx.moveTo(dotPositions[tempPattern[0]].x, dotPositions[tempPattern[0]].y);
            for (let i = 1; i < tempPattern.length; i++) {
                patternCtx.lineTo(dotPositions[tempPattern[i]].x, dotPositions[tempPattern[i]].y);
            }
            if (currentPos) {
                patternCtx.lineTo(currentPos.x, currentPos.y);
            }
            patternCtx.stroke();
        }
    }

    function handlePatternMove(e) {
        if (!isDrawingPattern) return;
        if (e.cancelable) e.preventDefault(); // Prevent scrolling on touch

        const pos = getMousePos(e);

        // Check if near any dot
        for (let i = 0; i < dotPositions.length; i++) {
            const dot = dotPositions[i];
            const dx = pos.x - dot.x;
            const dy = pos.y - dot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 35 && !tempPattern.includes(i)) {
                tempPattern.push(i);
                dot.element.classList.add('active');

                // Optional: Vibrate on success
                if (navigator.vibrate) navigator.vibrate(20);

                break; // Only activate one dot per move frame
            }
        }

        drawPattern(pos);
    }

    grid.addEventListener('mousedown', (e) => {
        resetPattern();
        isDrawingPattern = true;

        // Get canvas context immediately in case it wasn't set
        if (!patternCtx) {
            patternCtx = document.getElementById('pattern-canvas').getContext('2d');
        }

        handlePatternMove(e);
    });
    grid.addEventListener('touchstart', (e) => {
        resetPattern();
        isDrawingPattern = true;

        if (!patternCtx) {
            patternCtx = document.getElementById('pattern-canvas').getContext('2d');
        }

        handlePatternMove(e);
    }, { passive: false });

    document.addEventListener('mousemove', handlePatternMove);
    document.addEventListener('touchmove', handlePatternMove, { passive: false });

    const endDrawing = () => {
        if (isDrawingPattern) {
            isDrawingPattern = false;
            drawPattern(); // Redraw without the floating line to the cursor
        }
    };

    document.addEventListener('mouseup', endDrawing);
    document.addEventListener('touchend', endDrawing);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'kute-toast';
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    }, 100);
}

function openModal(type) {
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('modal-title');
    const terms = state.getTerms();

    state.newTransaction.type = type;

    // Phát âm thanh kute nếu là nam (delay 1s)
    if (state.user.gender === 'nam') {
        setTimeout(() => {
            state.playSound('assets/ado/baonhieudachong.wav');
        }, 1000);
    }

    // Tạo hiệu ứng uốn cong hình vòng cung (ôm theo khung)
    const text = `Bao nhiêu dạ ${terms.spouse}?`;
    const chars = text.split('');
    title.innerHTML = chars.map((char, i) => {
        // Tính toán theo hình vòng cung đơn (Single Arc)
        // Dùng Math.sin từ 0 đến PI để tạo một cung duy nhất
        const progress = i / (chars.length - 1);
        const offset = Math.sin(progress * Math.PI) * -12; // Độ cong vòng cung
        return `<span style="--offset: ${offset}px">${char === ' ' ? '&nbsp;' : char}</span>`;
    }).join('');
    title.classList.add('wavy-text');

    modal.classList.remove('hidden');
    document.getElementById('amount-input').focus();
}

function resetTransactionForm() {
    state.newTransaction = { type: 'expense', amount: 0, method: 'cash', note: '', photo: null };
    document.getElementById('amount-input').value = '';
    document.getElementById('note-input').value = '';

    // Đưa về bước 1
    const modalContent = document.querySelector('#transaction-modal .modal-content');
    modalContent.classList.remove('step-2-active'); // Trở lại khung mây gốc

    document.getElementById('step-1').classList.remove('hidden');
    document.getElementById('step-2').classList.add('hidden');

    document.getElementById('next-btn').classList.remove('hidden');
    document.getElementById('save-btn').classList.add('hidden');

    document.getElementById('note-warning').classList.add('hidden');

    const methodBtns = document.querySelectorAll('.method-btn');
    methodBtns.forEach(b => b.classList.remove('active'));
    methodBtns[0].classList.add('active');
}
// Image Zoom Logic
window.showFullImage = function (src) {
    const overlay = document.getElementById('image-overlay');
    const img = document.getElementById('overlay-img');
    img.src = src;
    overlay.classList.remove('hidden');
};

window.hideFullImage = function () {
    const overlay = document.getElementById('image-overlay');
    overlay.classList.add('hidden');
};


function renderGoals(container) {
    const terms = state.getTerms();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysLeft = daysInMonth - today; // Days after today
    const daysRemainingIncludingToday = daysInMonth - today + 1;

    // Calculate this month's spending
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthExpenses = state.transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(monthStr));
    const totalSpent = monthExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

    // Today's spending
    const todayStr = now.toISOString().split('T')[0];
    const todayExpenses = state.transactions.filter(t => t.type === 'expense' && t.date === todayStr);
    const todaySpent = todayExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

    // Budget calculations
    const monthlyBudget = state.goals.monthlyBudget || 0;

    // 1. Initial Planned Daily (Dự kiến ban đầu)
    const initialDailyBudget = monthlyBudget > 0 ? Math.floor(monthlyBudget / daysInMonth) : 0;

    // 2. Adjusted Daily (Ngoài dự kiến/Tính lại)
    const monthlyRemaining = monthlyBudget - totalSpent;
    const adjustedDailyBudget = (monthlyBudget > 0 && daysRemainingIncludingToday > 0)
        ? Math.max(0, Math.floor((monthlyRemaining + todaySpent) / daysRemainingIncludingToday))
        : 0;

    // For progress bar and status, we compare against the Adjusted Budget (Actual allowance)
    const effectiveDailyBudget = adjustedDailyBudget || initialDailyBudget;

    const dailyRemaining = effectiveDailyBudget - todaySpent;
    const monthlyPercent = monthlyBudget > 0 ? Math.min((totalSpent / monthlyBudget) * 100, 100) : 0;
    const dailyPercent = effectiveDailyBudget > 0 ? Math.min((todaySpent / effectiveDailyBudget) * 100, 100) : 0;

    // Daily spending breakdown for the month (for chart)
    const dailyData = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayExpenses = state.transactions.filter(t => t.type === 'expense' && t.date === dateStr);
        const dayTotal = dayExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
        dailyData.push({ day: d, amount: dayTotal, over: initialDailyBudget > 0 && dayTotal > initialDailyBudget });
    }

    // Count overspend days
    const overspendDays = dailyData.filter(d => d.over && d.day <= today).length;

    // Top spending categories this month
    const categoryMap = {};
    monthExpenses.forEach(t => {
        const note = t.note || 'Khác';
        categoryMap[note] = (categoryMap[note] || 0) + Number(t.amount);
    });
    const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const monthlyBarColor = monthlyPercent >= 90 ? '#ff4d4d' : monthlyPercent >= 70 ? '#f9c74f' : 'var(--primary)';
    const dailyBarColor = dailyPercent >= 90 ? '#ff4d4d' : dailyPercent >= 70 ? '#f9c74f' : 'var(--primary)';

    container.innerHTML = `
        <header style="margin-bottom: 20px;">
            <h2 style="color: var(--text-light); margin-bottom: 5px; font-size: clamp(12px, 4vw, 15px);">Quản lý chi tiêu của ${terms.greeting}</h2>
            <h1 style="font-size: clamp(22px, 7vw, 28px);">Mục Tiêu Tháng ${month + 1}</h1>
        </header>

        <!-- Budget Setting Cards -->
        <div style="background: white; padding: 16px; border-radius: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02); margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <div style="background: color-mix(in srgb, var(--primary) 15%, transparent); padding: 6px; border-radius: 10px; display: flex; color: var(--primary);">
                    <i data-lucide="calendar" style="width: 16px; height: 16px;"></i>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">Thiết lập ngân sách</span>
            </div>
            
            <div style="margin-bottom: 15px;">
                <span style="font-size: 10px; color: var(--text-light); display: block; margin-bottom: 5px;">Tổng số tiền ${terms.greeting} muốn sài tháng này:</span>
                <div style="display: flex; align-items: baseline; gap: 5px;">
                    <input type="text" id="monthly-budget-input" placeholder="Nhập số tiền..." value="${monthlyBudget > 0 ? monthlyBudget.toLocaleString('vi-VN') : ''}" 
                        inputmode="numeric"
                        style="flex: 1; border: none; border-bottom: 2px solid #f0f0f0; outline: none; font-size: 24px; font-weight: 800; color: var(--text-main); background: transparent; padding: 5px 0; font-family: 'Outfit', sans-serif;">
                    <span style="font-size: 14px; font-weight: 700; color: var(--text-light);">VNĐ</span>
                </div>
            </div>

            <div style="display: flex; gap: 10px;">
                <div style="flex: 1; background: #fafafa; padding: 10px; border-radius: 12px;">
                    <span style="font-size: 9px; color: var(--text-light); display: block;">Dự kiến (Ban đầu)</span>
                    <span style="font-size: 13px; font-weight: 700; color: var(--text-main);">${initialDailyBudget.toLocaleString()}đ<small style="font-weight: normal; font-size: 9px; margin-left: 2px;">/ngày</small></span>
                </div>
                <div style="flex: 1; background: color-mix(in srgb, var(--primary) 5%, #fafafa); padding: 10px; border-radius: 12px; border: 1px dashed var(--primary);">
                    <span style="font-size: 9px; color: var(--primary); font-weight: 700; display: block;">Tính lại (Thực tế)</span>
                    <span style="font-size: 13px; font-weight: 800; color: var(--primary);">${adjustedDailyBudget.toLocaleString()}đ<small style="font-weight: normal; font-size: 9px; margin-left: 2px;">/ngày</small></span>
                </div>
            </div>

            <button id="save-goals-btn" style="width: 100%; padding: 12px; border-radius: 15px; border: none; background: var(--primary); color: white; font-weight: 700; font-size: 14px; cursor: pointer; margin-top: 15px; font-family: 'Outfit', sans-serif; box-shadow: 0 4px 15px color-mix(in srgb, var(--primary) 30%, transparent);">
                Lưu ngân sách
            </button>
        </div>

        <!-- Monthly Progress -->
        <div style="background: white; padding: 16px; border-radius: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--text-main);">Chi tiêu tháng này</span>
                <span style="font-size: 10px; font-weight: 600; color: var(--text-light);">Còn ${daysLeft} ngày</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <span style="font-size: 18px; font-weight: 800; color: ${monthlyPercent >= 90 ? '#ff4d4d' : 'var(--text-main)'};">${totalSpent.toLocaleString()}đ</span>
                <span style="font-size: 12px; color: var(--text-light);">/ ${monthlyBudget > 0 ? monthlyBudget.toLocaleString() + 'đ' : 'Chưa đặt'}</span>
            </div>
            <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                <div style="width: ${monthlyPercent}%; height: 100%; background: ${monthlyBarColor}; border-radius: 10px; transition: width 0.5s ease;"></div>
            </div>
            ${monthlyBudget > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                    <span style="font-size: 10px; color: ${monthlyRemaining < 0 ? '#ff4d4d' : 'var(--text-light)'}; font-weight: 600;">
                        ${monthlyRemaining >= 0 ? 'Còn lại: ' + monthlyRemaining.toLocaleString() + 'đ' : 'Vượt: ' + Math.abs(monthlyRemaining).toLocaleString() + 'đ'}
                    </span>
                    <span style="font-size: 10px; color: var(--text-light); font-weight: 600;">${Math.round(monthlyPercent)}%</span>
                </div>
            ` : ''}
        </div>

        <!-- Daily Progress -->
        <div style="background: white; padding: 16px; border-radius: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--text-main);">Chi tiêu hôm nay</span>
                <span style="font-size: 10px; font-weight: 600; color: ${overspendDays > 0 ? '#ff4d4d' : 'var(--text-light)'};">
                    ${overspendDays > 0 ? '⚠ ' + overspendDays + ' ngày vượt mức' : 'Đang tốt'}
                </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <span style="font-size: 18px; font-weight: 800; color: ${dailyPercent >= 90 ? '#ff4d4d' : 'var(--text-main)'};">${todaySpent.toLocaleString()}đ</span>
                <span style="font-size: 12px; color: var(--text-light);">/ ${effectiveDailyBudget > 0 ? effectiveDailyBudget.toLocaleString() + 'đ' : 'Chưa đặt'}</span>
            </div>
            <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                <div style="width: ${dailyPercent}%; height: 100%; background: ${dailyBarColor}; border-radius: 10px; transition: width 0.5s ease;"></div>
            </div>
            ${effectiveDailyBudget > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                    <span style="font-size: 10px; color: ${dailyRemaining < 0 ? '#ff4d4d' : 'var(--text-light)'}; font-weight: 600;">
                        ${dailyRemaining >= 0 ? 'Hôm nay được sài: ' + dailyRemaining.toLocaleString() + 'đ' : 'Hôm nay vượt: ' + Math.abs(dailyRemaining).toLocaleString() + 'đ'}
                    </span>
                    <span style="font-size: 10px; color: var(--text-light); font-weight: 600;">${Math.round(dailyPercent)}%</span>
                </div>
            ` : ''}
        </div>

        <!-- Daily Spending Bar Chart -->
        <div style="background: white; padding: 16px; border-radius: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--text-main);">Biểu đồ chi tiêu theo ngày</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <span style="width: 8px; height: 8px; border-radius: 2px; background: var(--primary);"></span>
                        <span style="font-size: 9px; color: var(--text-light);">Đúng mức</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <span style="width: 8px; height: 8px; border-radius: 2px; background: #ff4d4d;"></span>
                        <span style="font-size: 9px; color: var(--text-light);">Vượt mức</span>
                    </div>
                </div>
            </div>
            <div style="position: relative;">
                <canvas id="goals-chart" style="width: 100%; height: 180px;"></canvas>
            </div>
        </div>

        <!-- Top Spending Categories -->
        ${topCategories.length > 0 ? `
        <div style="background: white; padding: 16px; border-radius: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 100px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-main); display: block; margin-bottom: 12px;">Khoản chi tiêu lớn nhất</span>
            ${topCategories.map(([note, amount], i) => {
        const catPercent = totalSpent > 0 ? (amount / totalSpent * 100) : 0;
        return `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 10px; font-weight: 700; color: white; background: var(--primary); width: 20px; height: 20px; border-radius: 6px; display: flex; align-items: center; justify-content: center; opacity: ${1 - i * 0.15};">${i + 1}</span>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span style="font-size: 11px; font-weight: 600; color: var(--text-main);">${note}</span>
                            <span style="font-size: 11px; font-weight: 700; color: var(--text-main);">${amount.toLocaleString()}đ</span>
                        </div>
                        <div style="width: 100%; height: 4px; background: #f0f0f0; border-radius: 5px; overflow: hidden;">
                            <div style="width: ${catPercent}%; height: 100%; background: color-mix(in srgb, var(--primary) ${100 - i * 15}%, transparent); border-radius: 5px;"></div>
                        </div>
                    </div>
                </div>`;
    }).join('')}
        </div>
        ` : `
        <div style="background: white; padding: 30px; border-radius: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 100px; text-align: center;">
            <i data-lucide="inbox" style="width: 40px; height: 40px; color: var(--text-light); opacity: 0.5; margin-bottom: 10px;"></i>
            <p style="font-size: 12px; color: var(--text-light);">Chưa có khoản chi nào tháng này</p>
        </div>
        `}
    `;

    // Format budget inputs
    const monthlyInput = document.getElementById('monthly-budget-input');

    if (monthlyInput) {
        monthlyInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value) {
                e.target.value = Number(value).toLocaleString('vi-VN');
            } else {
                e.target.value = '';
            }
        });
    }

    // Save goals
    document.getElementById('save-goals-btn').onclick = () => {
        const monthly = Number(monthlyInput.value.replace(/\D/g, ''));
        state.goals.monthlyBudget = monthly;
        localStorage.setItem('smoney_goals', JSON.stringify(state.goals));
        showToast('Đã lưu mục tiêu!');
        renderGoals(container);
        if (window.lucide) lucide.createIcons();
    };

    // Draw bar chart
    setTimeout(() => drawGoalsChart(dailyData, initialDailyBudget, today), 100);
}

function drawGoalsChart(dailyData, dailyBudget, today) {
    const canvas = document.getElementById('goals-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const cs = getComputedStyle(document.documentElement);
    const primaryColor = cs.getPropertyValue('--primary').trim() || '#ff8fb1';

    // Get actual color values
    const tempEl = document.createElement('div');
    tempEl.style.color = primaryColor;
    document.body.appendChild(tempEl);
    const normalHex = getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);
    const overHex = '#ff4d4d';

    const daysInMonth = dailyData.length;
    const padding = { top: 20, bottom: 25, left: 5, right: 5 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const maxVal = Math.max(...dailyData.map(d => d.amount), dailyBudget, 1);
    const barWidth = Math.max((chartW / daysInMonth) - 2, 3);
    const gap = (chartW - barWidth * daysInMonth) / (daysInMonth + 1);

    // Draw budget line
    if (dailyBudget > 0) {
        const budgetY = padding.top + chartH - (dailyBudget / maxVal) * chartH;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#ff4d4d';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(padding.left, budgetY);
        ctx.lineTo(W - padding.right, budgetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Budget label
        ctx.fillStyle = '#ff4d4d';
        ctx.font = 'bold 8px Outfit, sans-serif';
        ctx.textAlign = 'right';
        ctx.globalAlpha = 0.6;
        ctx.fillText('Giới hạn', W - padding.right, budgetY - 3);
        ctx.globalAlpha = 1;
    }

    // Draw bars
    dailyData.forEach((d, i) => {
        const x = padding.left + gap + i * (barWidth + gap);
        const barH = maxVal > 0 ? (d.amount / maxVal) * chartH : 0;
        const y = padding.top + chartH - barH;

        if (d.amount > 0) {
            const color = d.over ? overHex : normalHex;
            ctx.fillStyle = color;
            ctx.globalAlpha = d.day <= today ? 0.85 : 0.25;

            // Rounded top bars
            const radius = Math.min(barWidth / 2, 3);
            ctx.beginPath();
            ctx.moveTo(x, padding.top + chartH);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.lineTo(x + barWidth - radius, y);
            ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
            ctx.lineTo(x + barWidth, padding.top + chartH);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Day labels (show every 5th day + day 1 and last day)
        if (d.day === 1 || d.day % 5 === 0 || d.day === dailyData.length) {
            ctx.fillStyle = d.day === today ? primaryColor : '#aaa';
            ctx.font = `${d.day === today ? 'bold ' : ''}8px Outfit, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(d.day, x + barWidth / 2, H - 5);
        }

        // Today marker
        if (d.day === today) {
            ctx.fillStyle = primaryColor;
            ctx.beginPath();
            ctx.arc(x + barWidth / 2, H - 15, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}


function renderThemeSettings(container) {
    container.innerHTML = `
        <header style="margin-bottom: 35px; display: flex; align-items: center; gap: 15px;">
            <button class="back-btn" onclick="switchTab('settings')"><i data-lucide="arrow-left"></i></button>
            <h1 style="font-family: 'KoniBlack', sans-serif; font-size: 28px;">Chủ đề</h1>
        </header>

        <div style="background: white; padding: 20px; border-radius: 20px; box-shadow: var(--shadow); margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: var(--text-main);">Chế độ áp dụng</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button class="theme-mode-btn ${state.theme.mode === 'global' ? 'active' : ''}" data-mode="global" style="flex:1; padding:10px; border-radius:10px; border: 1px solid var(--primary); background: ${state.theme.mode === 'global' ? 'var(--primary)' : 'white'}; color: ${state.theme.mode === 'global' ? 'white' : 'var(--primary)'}; font-weight: bold; cursor: pointer; font-size: 13px;">Màu nền</button>
                <button class="theme-mode-btn ${state.theme.mode === 'per-tab' ? 'active' : ''}" data-mode="per-tab" style="flex:1; padding:10px; border-radius:10px; border: 1px solid var(--primary); background: ${state.theme.mode === 'per-tab' ? 'var(--primary)' : 'white'}; color: ${state.theme.mode === 'per-tab' ? 'white' : 'var(--primary)'}; font-weight: bold; cursor: pointer; font-size: 13px;">Custom</button>
            </div>
            
            ${state.theme.mode === 'per-tab' ? `
                <div style="margin-bottom: 15px;">
                    <p style="font-size: 12px; color: var(--text-light); margin-bottom: 5px;">Chọn tab để đổi màu:</p>
                    <select id="theme-tab-select" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #eee; outline: none; color: var(--text-main); font-weight: bold; background: #fafafa;">
                        <option value="home">Nhà (Home)</option>
                        <option value="transaction">Thu Chi</option>
                        <option value="stats">Thống Kê</option>
                        <option value="settings">Cài Đặt</option>
                    </select>
                </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0 10px 0;">
                <h4 style="color: var(--text-main); margin: 0;">Chọn màu chủ đạo</h4>
                <button id="reset-default-btn" style="padding: 5px 12px; border-radius: 15px; border: 1px solid #ddd; background: #fff9fb; color: var(--primary); font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="rotate-ccw" style="width: 12px; height: 12px;"></i> Mặc định
                </button>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
                <!-- Preset colors (vibrant) -->
                <div class="color-preset" data-color="#ff8fb1" style="width: 40px; height: 40px; border-radius: 50%; background: #ff8fb1; border: 2px solid #ddd; cursor: pointer;"></div>
                <div class="color-preset" data-color="#4ea8de" style="width: 40px; height: 40px; border-radius: 50%; background: #4ea8de; border: 2px solid #ddd; cursor: pointer;"></div>
                <div class="color-preset" data-color="#48c5c1" style="width: 40px; height: 40px; border-radius: 50%; background: #48c5c1; border: 2px solid #ddd; cursor: pointer;"></div>
                <div class="color-preset" data-color="#b1a0ff" style="width: 40px; height: 40px; border-radius: 50%; background: #b1a0ff; border: 2px solid #ddd; cursor: pointer;"></div>
                <div class="color-preset" data-color="#f9c74f" style="width: 40px; height: 40px; border-radius: 50%; background: #f9c74f; border: 2px solid #ddd; cursor: pointer;"></div>
                <div class="color-preset" data-color="#ff5e5e" style="width: 40px; height: 40px; border-radius: 50%; background: #ff5e5e; border: 2px solid #ddd; cursor: pointer;"></div>
                <div class="color-preset" data-color="#000000" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #000000 50%, #ffffff 50%); border: 2px solid #ddd; cursor: pointer;" title="Trắng Đen"></div>
                
                <!-- Custom Color Picker -->
                <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; border: 2px dashed var(--primary); cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);">
                    <div style="width: 24px; height: 24px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="plus" style="color: var(--primary); pointer-events: none; width: 14px; height: 14px;"></i>
                    </div>
                    <input type="color" id="custom-color-picker" style="position: absolute; opacity: 0; width: 200%; height: 200%; cursor: pointer; top: -50%; left: -50%;" value="#ffffff">
                </div>
            </div>
            
            <button id="save-theme-btn" class="primary-btn">Lưu màu sắc</button>
        </div>
    `;

    const modeBtns = container.querySelectorAll('.theme-mode-btn');
    modeBtns.forEach(btn => {
        btn.onclick = () => {
            state.theme.mode = btn.getAttribute('data-mode');
            renderThemeSettings(container);
            if (window.lucide) lucide.createIcons();
        };
    });

    const presets = container.querySelectorAll('.color-preset');
    const colorPicker = document.getElementById('custom-color-picker');
    const saveBtn = document.getElementById('save-theme-btn');
    const tabSelect = document.getElementById('theme-tab-select');

    let currentSelectedTab = tabSelect ? tabSelect.value : 'home';
    if (!state.theme.tabs) state.theme.tabs = { home: '#fff9fb', transaction: '#fff9fb', stats: '#fff9fb', settings: '#fff9fb' };
    let selectedColor = state.theme.mode === 'global' ? state.theme.global : (state.theme.tabs[currentSelectedTab] || state.theme.global);

    function updateActivePreset() {
        presets.forEach(p => {
            p.style.border = p.getAttribute('data-color') === selectedColor ? '2px solid var(--primary)' : '2px solid #ddd';
        });
    }
    updateActivePreset();

    if (tabSelect) {
        tabSelect.onchange = (e) => {
            currentSelectedTab = e.target.value;
            selectedColor = state.theme.tabs[currentSelectedTab] || '#fff9fb';
            updateActivePreset();
            applyPreviewColor();
        };
    }

    presets.forEach(p => {
        p.onclick = () => {
            selectedColor = p.getAttribute('data-color');
            updateActivePreset();
            applyPreviewColor();
        };
    });

    if (colorPicker) {
        colorPicker.onchange = (e) => {
            selectedColor = e.target.value;
            updateActivePreset();
            applyPreviewColor();
        };
    }

    function applyPreviewColor() {
        applyThemeColor(selectedColor);
    }

    const resetBtn = document.getElementById('reset-default-btn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            selectedColor = '#ff8fb1';
            updateActivePreset();
            applyPreviewColor();
        };
    }

    // Khôi phục lại màu cũ nếu rời khỏi mà chưa lưu
    const backBtn = container.querySelector('.back-btn');
    backBtn.onclick = () => {
        applyTheme(); // Restore theme
        switchTab('settings');
    };

    saveBtn.onclick = () => {
        if (state.theme.mode === 'global') {
            state.theme.global = selectedColor;
        } else {
            state.theme.tabs[currentSelectedTab] = selectedColor;
        }
        localStorage.setItem('smoney_theme', JSON.stringify(state.theme));
        showToast("Đã lưu chủ đề màu!");
        applyTheme();
    };
}

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================

function showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.remove('hidden');
        setupAuthListeners();
        if (window.lucide) lucide.createIcons();
    }
}

function hideAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.add('hidden');
    }
}

function setupAuthListeners() {
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const showForgot = document.getElementById('show-forgot');
    const backToLogin = document.getElementById('back-to-login');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-password-form');
    const authWelcome = document.getElementById('auth-welcome');

    if (showRegister) {
        showRegister.onclick = () => {
            loginForm.classList.add('hidden');
            forgotForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        };
    }

    if (showLogin) {
        showLogin.onclick = () => {
            registerForm.classList.add('hidden');
            forgotForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        };
    }

    if (showForgot) {
        showForgot.onclick = () => {
            loginForm.classList.add('hidden');
            registerForm.classList.add('hidden');
            forgotForm.classList.remove('hidden');
        };
    }

    if (backToLogin) {
        backToLogin.onclick = () => {
            forgotForm.classList.add('hidden');
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');

            // Reset forgot form
            const forgotEmail = document.getElementById('forgot-email');
            if (forgotEmail) {
                forgotEmail.disabled = false;
                forgotEmail.value = '';
            }
            const forgotOtpGroup = document.getElementById('forgot-otp-group');
            if (forgotOtpGroup) forgotOtpGroup.classList.add('hidden');
            const forgotBtn = document.getElementById('forgot-btn');
            if (forgotBtn) forgotBtn.classList.remove('hidden');
            const verifyForgotBtn = document.getElementById('verify-forgot-btn');
            if (verifyForgotBtn) verifyForgotBtn.classList.add('hidden');
            const forgotOtp = document.getElementById('forgot-otp');
            if (forgotOtp) forgotOtp.value = '';
            const forgotNewPassword = document.getElementById('forgot-new-password');
            if (forgotNewPassword) forgotNewPassword.value = '';
        };
    }

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = handleLogin;
    }

    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.onclick = handleRegister;
    }

    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    if (verifyOtpBtn) {
        verifyOtpBtn.onclick = handleVerifyOTP;
    }

    const otpBack = document.getElementById('otp-back');
    if (otpBack) {
        otpBack.onclick = () => {
            document.getElementById('otp-group').classList.add('hidden');
            document.getElementById('verify-otp-btn').classList.add('hidden');
            document.getElementById('otp-back').classList.add('hidden');
            document.getElementById('register-btn').classList.remove('hidden');

            document.getElementById('reg-name').disabled = false;
            document.getElementById('reg-email').disabled = false;
            document.getElementById('reg-password').disabled = false;
        };
    }

    const forgotBtn = document.getElementById('forgot-btn');
    if (forgotBtn) {
        forgotBtn.onclick = handleForgotPassword;
    }

    const verifyForgotBtn = document.getElementById('verify-forgot-btn');
    if (verifyForgotBtn) {
        verifyForgotBtn.onclick = handleVerifyForgotPassword;
    }

    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.onclick = handleGoogleLogin;
    }

    // Gender Toggle Logic
    const genderToggle = document.getElementById('gender-toggle-container');
    if (genderToggle) {
        const options = genderToggle.querySelectorAll('.gender-option');
        const hiddenInput = document.getElementById('reg-gender');
        options.forEach(opt => {
            opt.onclick = () => {
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                hiddenInput.value = opt.getAttribute('data-value');
            };
        });
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    showToast("Đang xác thực...");

    // Hash password for security
    const passwordHash = await hashPassword(password);

    const result = await ApiService.call('login', { email, password_hash: passwordHash });

    if (result.success) {
        state.user.loggedIn = true;
        state.user.email = result.user.email;
        state.user.name = result.user.name;
        state.user.gender = result.user.gender;

        ApiService.saveLocal();
        localStorage.setItem('smoney_logged_in', 'true');

        hideAuthScreen();
        unlockApp();
        showToast("Chào mừng quay trở lại, " + state.user.name + "!");

        // Initial sync
        ApiService.syncFromCloud();
    } else {
        showToast(result.error || "Đăng nhập thất bại!");
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('forgot-email').value;
    if (!email) {
        showToast("Vui lòng nhập Email!");
        return;
    }
    showToast("Đang gửi mã OTP...");

    const result = await ApiService.call('sendOTP', { email });

    if (result.success) {
        showToast("Mã OTP đã được gửi đến " + email);

        document.getElementById('forgot-otp-group').classList.remove('hidden');
        document.getElementById('forgot-btn').classList.add('hidden');
        document.getElementById('verify-forgot-btn').classList.remove('hidden');

        document.getElementById('forgot-email').disabled = true;
        document.getElementById('forgot-otp').focus();
    } else {
        showToast(result.error || "Gửi OTP thất bại! Vui lòng thử lại.");
    }
}

async function handleVerifyForgotPassword() {
    const email = document.getElementById('forgot-email').value;
    const otp = document.getElementById('forgot-otp').value;
    const newPassword = document.getElementById('forgot-new-password').value;

    if (!otp || !newPassword) {
        showToast("Vui lòng nhập mã OTP và mật khẩu mới!");
        return;
    }

    showToast("Đang xác thực...");
    const passwordHash = await hashPassword(newPassword);

    const result = await ApiService.call('resetPassword', {
        email,
        otp,
        new_password_hash: passwordHash
    });

    if (result.success) {
        showToast("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        setTimeout(() => {
            document.getElementById('back-to-login').click();
        }, 1500);
    } else {
        showToast(result.error || "Mã OTP không đúng hoặc đã hết hạn!");
    }
}

async function handleRegister() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const username = document.getElementById('reg-id').value;
    const password = document.getElementById('reg-password').value;
    const gender = document.getElementById('reg-gender').value;

    if (!name || !email || !password || !username) {
        showToast("Vui lòng điền đầy đủ thông tin!");
        return;
    }
    showToast("Đang gửi mã OTP...");

    // Gọi API để gửi OTP
    const result = await ApiService.call('sendOTP', { email });

    if (result.success) {
        showToast("Mã OTP đã được gửi đến " + email);

        // Hiển thị phần nhập OTP
        document.getElementById('otp-group').classList.remove('hidden');
        document.getElementById('verify-otp-btn').classList.remove('hidden');
        document.getElementById('otp-back').classList.remove('hidden');
        document.getElementById('register-btn').classList.add('hidden');

        // Khóa các trường thông tin lại để tránh thay đổi
        document.getElementById('reg-name').disabled = true;
        document.getElementById('reg-email').disabled = true;
        document.getElementById('reg-id').disabled = true;
        document.getElementById('reg-password').disabled = true;

        document.getElementById('reg-otp').focus();
    } else {
        showToast(result.error || "Gửi OTP thất bại! Vui lòng thử lại.");
    }
}

async function handleVerifyOTP() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const username = document.getElementById('reg-id').value;
    const password = document.getElementById('reg-password').value;
    const gender = document.getElementById('reg-gender').value;
    const otp = document.getElementById('reg-otp').value;

    if (!otp) {
        showToast("Vui lòng nhập mã OTP!");
        return;
    }

    showToast("Đang xác thực...");

    const passwordHash = await hashPassword(password);

    const result = await ApiService.call('register', {
        email,
        username,
        password_hash: passwordHash,
        full_name: name,
        gender: gender,
        otp: otp // Gửi mã OTP lên để server xác thực
    });

    if (result.success) {
        showToast("Đăng ký thành công! Chào mừng " + name);
        // Reset form và quay về đăng nhập
        setTimeout(() => {
            document.getElementById('show-login').click();
            // Reset fields
            document.getElementById('reg-name').value = '';
            document.getElementById('reg-email').value = '';
            document.getElementById('reg-id').value = '';
            document.getElementById('reg-password').value = '';
            document.getElementById('reg-otp').value = '';

            // Unlock fields
            document.getElementById('reg-name').disabled = false;
            document.getElementById('reg-email').disabled = false;
            document.getElementById('reg-id').disabled = false;
            document.getElementById('reg-password').disabled = false;

            // Hide OTP fields
            document.getElementById('otp-group').classList.add('hidden');
            document.getElementById('verify-otp-btn').classList.add('hidden');
            document.getElementById('otp-back').classList.add('hidden');
            document.getElementById('register-btn').classList.remove('hidden');
        }, 1500);
    } else {
        showToast(result.error || "Mã OTP không đúng hoặc đã hết hạn!");
    }
}

function showConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    document.getElementById('confirm-cancel').onclick = () => modal.classList.add('hidden');
    document.getElementById('confirm-ok').onclick = () => {
        modal.classList.add('hidden');
        logoutUser();
    };
    if (window.lucide) lucide.createIcons();
}

function logoutUser() {
    state.user.loggedIn = false;
    localStorage.removeItem('smoney_logged_in');
    location.reload();
}
window.logoutUser = logoutUser;

// Make sure showToast exists or create a simple one
if (typeof showToast === 'undefined') {
    window.showToast = function (message) {
        // Check if toast element exists
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:12px 24px;border-radius:25px;font-size:14px;z-index:3000;transition:opacity 0.3s;pointer-events:none;white-space:nowrap;';
            document.body.appendChild(toast);
        }
        toast.innerText = message;
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    };
}

// ==========================================
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

    if (result.success) {
        state.user.loggedIn = true;
        state.user.email = result.user.email;
        state.user.name = result.user.name;
        state.user.gender = result.user.gender || 'nam';

        ApiService.saveLocal();
        localStorage.setItem('smoney_logged_in', 'true');

        hideAuthScreen();
        unlockApp();
        showToast("Chào mừng " + state.user.name + "!");
        ApiService.syncFromCloud();
    }
}
