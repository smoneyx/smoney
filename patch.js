const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Add change-name-btn to renderSettings
    if (!content.includes('id="change-name-btn"')) {
        content = content.replace(
            '<div class="settings-item theme-link">',
            `<div class="settings-item" id="change-name-btn">
                <div class="item-icon-pink" style="background: #e3f2fd; color: #2196f3;"><i data-lucide="edit-2"></i></div>
                <div class="item-text">Đổi tên hiển thị</div>
                <i data-lucide="chevron-right" class="chevron"></i>
            </div>

            <div class="settings-item theme-link">`
        );
    }

    // Add changeNameBtn handler if missing
    if (!content.includes('const changeNameBtn = e.target.closest(\'#change-name-btn\');')) {
        content = content.replace(
            "const themeLink = e.target.closest('.theme-link');",
            `const changeNameBtn = e.target.closest('#change-name-btn');
        if (changeNameBtn) {
            const modal = document.getElementById('change-name-modal');
            const input = document.getElementById('new-name-input');
            const okBtn = document.getElementById('change-name-ok');
            const cancelBtn = document.getElementById('change-name-cancel');

            if (modal && input) {
                input.value = state.user.name || "";
                modal.classList.remove('hidden');

                const closeModal = () => {
                    modal.classList.add('hidden');
                    okBtn.onclick = null;
                    cancelBtn.onclick = null;
                };

                cancelBtn.onclick = closeModal;

                okBtn.onclick = () => {
                    const newName = input.value.trim();
                    if (newName && newName !== state.user.name) {
                        showToast("Đang cập nhật tên...");
                        closeModal();

                        ApiService.call('changeDisplayName', { name: newName }).then(result => {
                            if (result && result.success) {
                                state.user.name = newName;
                                ApiService.saveLocal();
                                ApiService.syncToCloud();
                                renderTab('settings');
                                showToast("Đã đổi tên thành công!");
                            } else {
                                showToast("Lỗi: " + ((result && result.error) || "Không thể đổi tên"));
                            }
                        });
                    } else {
                        closeModal();
                    }
                };
            }
            return;
        }

        const themeLink = e.target.closest('.theme-link');`
        );
    }

    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');
