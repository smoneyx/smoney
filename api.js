/**
 * Smoney API Client for Google Sheets Integration
 */
const API_CONFIG = {
    // Default Google Apps Script Web App URL
    url: localStorage.getItem('smoney_api_url') || 'https://script.google.com/macros/s/AKfycbyo7L90FFXmLkbSauubudBGUY_fu7comioBiCDhdFMPbGSlcZZfSc5MD6dS7mq13cFr/exec',
    enabled: true
};

const ApiService = {
    setUrl(url) {
        if (!url.startsWith('https://script.google.com/')) {
            throw new Error('Link không hợp lệ. Vui lòng dùng link Google Apps Script.');
        }
        localStorage.setItem('smoney_api_url', url);
        API_CONFIG.url = url;
        API_CONFIG.enabled = true;
    },

    async call(action, payload = {}) {
        if (!API_CONFIG.enabled) {
            console.warn('API is not configured. Using local storage only.');
            return { success: false, error: 'API_NOT_CONFIGURED' };
        }

        try {
            const response = await fetch(API_CONFIG.url, {
                method: 'POST',
                body: JSON.stringify({ action, payload, userId: state.user.email })
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API Call Error:', error);
            return { success: false, error: error.message };
        }
    },

    // Sync all data to cloud
    async syncToCloud() {
        const data = {
            transactions: state.transactions,
            settings: state.settings,
            theme: state.theme,
            goals: state.goals,
            security: state.security,
            user: {
                name: state.user.name,
                gender: state.user.gender,
                email: state.user.email
            }
        };
        return await this.call('saveData', data);
    },

    // Sync all data from cloud
    async syncFromCloud() {
        const result = await this.call('loadData');
        if (result.success && result.data) {
            const cloudData = result.data;

            // Update state
            state.transactions = cloudData.transactions || [];
            state.settings = cloudData.settings || { soundEnabled: true };
            state.theme = cloudData.theme || { mode: 'global', global: '#ff8fb1', tabs: {} };
            state.goals = cloudData.goals || { monthlyBudget: 0 };
            state.security = cloudData.security || { enabled: false, type: 'pin', pin: '', pattern: '', biometricEnabled: false };

            // Save to local for offline use
            this.saveLocal();
            return true;
        }
        return false;
    },

    saveLocal() {
        localStorage.setItem('smoney_user_name', state.user.name);
        localStorage.setItem('smoney_user_gender', state.user.gender);
        localStorage.setItem('smoney_user_email', state.user.email);
        localStorage.setItem('smoney_user_avatar', state.user.avatar || '');
    }
};
