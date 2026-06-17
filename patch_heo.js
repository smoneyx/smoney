const fs = require('fs');

function patch(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Fix getTerms()
    content = content.replace(
        "pronoun: isMale ? 'Anh' : 'Em',",
        "pronoun: isMale ? 'Anh' : 'Chị',"
    ).replace(
        "greeting: isMale ? 'anh' : 'em',",
        "greeting: isMale ? 'anh' : 'chị',"
    ).replace(
        "self: isMale ? 'Chồng' : 'Vợ',",
        "self: 'Mình',"
    ).replace(
        "label: isMale ? 'chồng' : 'vợ',",
        "label: 'bạn',"
    ).replace(
        "spouse: isMale ? 'chồng' : 'vợ'",
        "spouse: 'bạn'"
    );

    // 2. Fix "Heo Ăn" -> "Tiền thu", "Heo Tiêu" -> "Tiền chi"
    content = content.replace("<span>Heo Ăn</span>", "<span>Tiền thu</span>");
    content = content.replace("<span>Heo Tiêu</span>", "<span>Tiền chi</span>");
    content = content.replace("<span>Heo Béo Lên (Thu)</span>", "<span>Tiền Thu</span>");
    content = content.replace("<span>Heo Gầy Đi (Chi)</span>", "<span>Tiền Chi</span>");

    // Fix other Heo texts
    content = content.replace("Giúp Heo bảo vệ bí mật", "Giúp bảo vệ bí mật");
    content = content.replace("Cho Heo biết thêm về bạn nha", "Cho chúng tôi biết thêm về bạn nha");
    content = content.replace("Đừng lo, Heo Con sẽ giúp bạn lấy lại nha", "Đừng lo, chúng tôi sẽ giúp bạn lấy lại nha"); // this one is in index.html

    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
}

patch('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patch('e:/Smoneys/www/app.js');

// Patch index.html
let html1 = fs.readFileSync('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/index.html', 'utf8');
html1 = html1.replace("Đừng lo, Heo Con sẽ giúp bạn lấy lại nha", "Đừng lo, hệ thống sẽ giúp bạn lấy lại nha");
fs.writeFileSync('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/index.html', html1);

let html2 = fs.readFileSync('e:/Smoneys/www/index.html', 'utf8');
html2 = html2.replace("Đừng lo, Heo Con sẽ giúp bạn lấy lại nha", "Đừng lo, hệ thống sẽ giúp bạn lấy lại nha");
fs.writeFileSync('e:/Smoneys/www/index.html', html2);

console.log('Patched index.html');
