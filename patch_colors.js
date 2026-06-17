const fs = require('fs');

function patchHtml(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace hardcoded pink colors in the confirm modal
    content = content.replace(/background: #fff0f5;([^>]+)color: #ff8fb1;/g, "background: var(--bg-color);$1color: var(--primary);");
    content = content.replace(/background: #ff8fb1;([^>]+)color: white;/g, "background: var(--primary);$1color: white;");

    fs.writeFileSync(filePath, content);
    console.log('Patched HTML ' + filePath);
}

patchHtml('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/index.html');
patchHtml('e:/Smoneys/www/index.html');

function patchCss(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(
        /.logout-icon {\s*background: #fff2f2;\s*color: #ff5e5e;\s*}/g,
        ".logout-icon {\n    background: var(--bg-color);\n    color: var(--primary);\n}"
    );

    content = content.replace(
        /.logout-text {\s*color: #ff5e5e;\s*}/g,
        ".logout-text {\n    color: var(--primary);\n}"
    );

    fs.writeFileSync(filePath, content);
    console.log('Patched CSS ' + filePath);
}

patchCss('c:/Users/ND ELECTRONICS/Documents/GitHub/smoney/style.css');
patchCss('e:/Smoneys/www/style.css');
