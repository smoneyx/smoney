const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Revert "Tiền thu" -> "Heo Ăn"
    content = content.replace("<span>Tiền thu</span>", "<span>Heo Ăn</span>");
    content = content.replace("<span>Tiền chi</span>", "<span>Heo Tiêu</span>");
    content = content.replace("<span>Tiền Thu</span>", "<span>Heo Béo Lên (Thu)</span>");
    content = content.replace("<span>Tiền Chi</span>", "<span>Heo Gầy Đi (Chi)</span>");

    content = content.replace("Giúp bảo vệ bí mật", "Giúp Heo bảo vệ bí mật");
    content = content.replace("Cho chúng tôi biết thêm về bạn nha", "Cho Heo biết thêm về bạn nha");
    
    // Specifically inside app.js if there was "Đừng lo, chúng tôi sẽ giúp bạn lấy lại nha"
    content = content.replace("Đừng lo, chúng tôi sẽ giúp bạn lấy lại nha", "Đừng lo, Heo Con sẽ giúp bạn lấy lại nha");

    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');

// Patch index.html
let html1 = fs.readFileSync('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/index.html', 'utf8');
html1 = html1.replace("Đừng lo, hệ thống sẽ giúp bạn lấy lại nha", "Đừng lo, Heo Con sẽ giúp bạn lấy lại nha");
fs.writeFileSync('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/index.html', html1);

let html2 = fs.readFileSync('e:/Smoneys/www/index.html', 'utf8');
html2 = html2.replace("Đừng lo, hệ thống sẽ giúp bạn lấy lại nha", "Đừng lo, Heo Con sẽ giúp bạn lấy lại nha");
fs.writeFileSync('e:/Smoneys/www/index.html', html2);

console.log('Patched index.html');
