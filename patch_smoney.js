const fs = require('fs');

function patchAppJs(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace generic terms with Smoney
    content = content.replace("Giúp bảo vệ bí mật", "Giúp Smoney bảo vệ bí mật");
    content = content.replace("Cho chúng tôi biết thêm về bạn nha", "Cho Smoney biết thêm về bạn nha");
    // Just in case it's still Heo
    content = content.replace("Giúp Heo bảo vệ bí mật", "Giúp Smoney bảo vệ bí mật");
    content = content.replace("Cho Heo biết thêm về bạn nha", "Cho Smoney biết thêm về bạn nha");

    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
}

patchAppJs('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/app.js');
patchAppJs('e:/Smoneys/www/app.js');

function patchHtml(filePath) {
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace("Đừng lo, hệ thống sẽ giúp bạn lấy lại nha", "Đừng lo, Smoney sẽ giúp bạn lấy lại nha");
    html = html.replace("Đừng lo, Heo Con sẽ giúp bạn lấy lại nha", "Đừng lo, Smoney sẽ giúp bạn lấy lại nha");
    fs.writeFileSync(filePath, html);
    console.log('Patched ' + filePath);
}

patchHtml('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/index.html');
patchHtml('e:/Smoneys/www/index.html');
