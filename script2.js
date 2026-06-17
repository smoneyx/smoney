const fs = require('fs');
let c = fs.readFileSync('e:/Smoneys/backend_script.gs', 'utf8');
c = c.replace(/subject: \`.*?\`,/, 'subject: "[Smoney] Mã xác minh của bạn là " + otp + " - Tuyệt đối không chia sẻ!",');
fs.writeFileSync('e:/Smoneys/backend_script.gs', c, 'utf8');
