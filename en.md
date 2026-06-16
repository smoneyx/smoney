`javascript
/**
 * Smoney Backend - Phiên bản TỔNG HỢP (Hỗ trợ Quên mật khẩu OTP)
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

// Hàm hỗ trợ lấy Sheet không phân biệt hoa thường
function getSheetSafe(name) {
  const sheets = ss.getSheets();
  let sheet = sheets.find(s => s.getName().toLowerCase() === name.toLowerCase());
  if (!sheet) {
    sheet = ss.insertSheet(name); 
  }
  return sheet;
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload;
    const userId = request.userId || (payload ? payload.email : "");

    let result = { success: false };

    switch (action) {
      case 'googleLogin':
        result = handleGoogleLogin(payload);
        break;
      case 'updateProfile':
        result = handleUpdateProfile(payload);
        break;
      case 'sendOTP':
        result = handleSendOTP(payload.email);
        break;
      case 'resetPassword': 
        result = handleResetPassword(payload);
        break;
      case 'register':
        result = handleRegister(payload);
        break;
      case 'login':
        result = handleLogin(payload);
        break;
      case 'saveData':
        result = handleSaveData(userId, payload);
        break;
      case 'loadData':
        result = handleLoadData(userId);
        break;
      case 'changeDisplayName':
        result = handleChangeDisplayName(userId, payload);
        break;
      case 'checkAccount':
        result = handleCheckAccount(payload);
        break;
      default:
        result.error = "Hành động không hợp lệ";
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- HÀM XỬ LÝ QUÊN MẬT KHẨU ---
function handleResetPassword(p) {
  const otpSheet = getSheetSafe('otp');
  const otpData = otpSheet.getDataRange().getValues();
  let validOtp = false;
  const inputEmail = (p.email || '').toString().toLowerCase().trim();
  for (let i = 1; i < otpData.length; i++) {
    if ((otpData[i][0] || '').toString().toLowerCase().trim() === inputEmail && otpData[i][1].toString() === p.otp.toString()) {
      if (new Date().getTime() < otpData[i][2]) {
        validOtp = true;
        otpSheet.deleteRow(i + 1);
        break;
      }
    }
  }
  if (!validOtp) return { success: false, error: "Mã OTP không đúng hoặc hết hạn" };
  const userSheet = getSheetSafe('users');
  const users = userSheet.getDataRange().getValues();
  const rowIndex = users.findIndex(row => (row[1] || '').toString().toLowerCase().trim() === inputEmail);
  if (rowIndex === -1) return { success: false, error: "Không tìm thấy người dùng" };
  userSheet.getRange(rowIndex + 1, 3).setValue(p.password_hash);
  return { success: true };
}

// --- HÀM XỬ LÝ GOOGLE LOGIN ---
function handleGoogleLogin(p) {
  const userSheet = getSheetSafe('users');
  const data = userSheet.getDataRange().getValues();
  const inputEmail = (p.email || '').toString().toLowerCase().trim();
  const rowIndex = data.findIndex(row => (row[1] || '').toString().toLowerCase().trim() === inputEmail);
  if (rowIndex !== -1) {
    const user = data[rowIndex];
    return { success: true, user: { username: user[0], email: user[1], name: user[3], gender: user[4] } };
  } else {
    return { success: true, user: { email: p.email, name: p.name, username: null, gender: null } };
  }
}

function handleUpdateProfile(p) {
  const userSheet = getSheetSafe('users');
  const data = userSheet.getDataRange().getValues();
  const inputEmail = (p.email || '').toString().toLowerCase().trim();
  let rowIndex = data.findIndex(row => (row[1] || '').toString().toLowerCase().trim() === inputEmail);
  if (rowIndex !== -1) {
    userSheet.getRange(rowIndex + 1, 1).setValue(p.username);
    userSheet.getRange(rowIndex + 1, 4).setValue(p.name);
    userSheet.getRange(rowIndex + 1, 5).setValue(p.gender);
  } else {
    userSheet.appendRow([p.username, p.email, 'GOOGLE_AUTH', p.name, p.gender, '', 'google', 'true', new Date()]);
  }
  return { success: true };
}

// --- HÀM GỬI OTP (DÙNG THƯƠNG HIỆU SMONEY) ---
function handleSendOTP(email) {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sheet = getSheetSafe('otp');
    const data = sheet.getDataRange().getValues();
    const inputEmail = (email || '').toString().toLowerCase().trim();
    for (let i = data.length - 1; i >= 1; i--) {
      if ((data[i][0] || '').toString().toLowerCase().trim() === inputEmail) sheet.deleteRow(i + 1);
    }
    const expiry = new Date().getTime() + (5 * 60 * 1000);
    sheet.appendRow([email, otp, expiry]);
    
    // THIẾT KẾ EMAIL SMONEY KUTE CÓ DẤU
    const htmlBody = "\n" +
"      <div style=\"font-family: 'Segoe UI', Arial, sans-serif; background-color: #fff9fb; padding: 40px 20px; border-radius: 30px; border: 1px solid #ff8fb1; max-width: 450px; margin: auto; text-align: center;\">\n" +
"        <h2 style=\"color: #ff8fb1; margin-bottom: 10px; font-size: 26px;\">Chào bạn đến với Smoney!</h2>\n" +
"        <p style=\"color: #666; font-size: 15px; margin-bottom: 25px;\">Bạn đang thực hiện xác thực bảo mật tài khoản.<br>Mã số xác minh của bạn là:</p>\n" +
"        \n" +
"        <div style=\"background-color: #ffffff; border: 2px dashed #ff8fb1; border-radius: 20px; padding: 25px; margin-bottom: 25px; display: inline-block; min-width: 200px;\">\n" +
"          <span style=\"font-size: 40px; font-weight: bold; color: #ff8fb1; letter-spacing: 10px;\">" + otp + "</span>\n" +
"        </div>\n" +
"        \n" +
"        <div style=\"background-color: #fff0f5; padding: 15px; border-radius: 15px; margin-bottom: 25px;\">\n" +
"          <p style=\"color: #d63384; font-weight: bold; font-size: 13px; margin: 0;\">⚠️ LỜI KHUYÊN TỪ SMONEY:</p>\n" +
"          <p style=\"color: #d63384; font-size: 13px; margin: 5px 0 0 0;\">Tuyệt đối KHÔNG chia sẻ mã này cho bất kỳ ai để bảo vệ tài khoản và dữ liệu cá nhân của bạn nhé!</p>\n" +
"        </div>\n" +
"        \n" +
"        <p style=\"color: #999; font-size: 12px;\">Mã này sẽ hết hạn sau 5 phút.<br>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>\n" +
"        <p style=\"color: #ff8fb1; font-weight: bold; font-size: 16px; margin-top: 20px;\">Đội ngũ Smoney ❤️</p>\n" +
"      </div>\n" +
"    \n";

    MailApp.sendEmail({ 
      to: email, 
      subject: "[Smoney] Mã xác minh của bạn là " + otp + " - Tuyệt đối không chia sẻ!", 
      htmlBody: htmlBody 
    });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// --- HÀM ĐĂNG KÝ ---
function handleRegister(p) {
  const otpSheet = getSheetSafe('otp');
  const otpData = otpSheet.getDataRange().getValues();
  let validOtp = false;
  const inputEmail = (p.email || '').toString().toLowerCase().trim();
  for (let i = 1; i < otpData.length; i++) {
    if ((otpData[i][0] || '').toString().toLowerCase().trim() === inputEmail && otpData[i][1].toString() === p.otp.toString()) {
      if (new Date().getTime() < otpData[i][2]) {
        validOtp = true;
        otpSheet.deleteRow(i + 1);
        break;
      }
    }
  }
  if (!validOtp) return { success: false, error: "Mã OTP không đúng hoặc hết hạn" };
  const userSheet = getSheetSafe('users');
  const users = userSheet.getDataRange().getValues();
  if (users.some(row => (row[1] || '').toString().toLowerCase().trim() === inputEmail)) return { success: false, error: "Email đã tồn tại" };
  userSheet.appendRow([p.username, p.email, p.password_hash, p.full_name, p.gender, '', 'email', 'true', new Date()]);
  return { success: true };
}

function handleLogin(p) {
  const userSheet = getSheetSafe('users');
  const users = userSheet.getDataRange().getValues();
  
  const inputId = (p.email || '').toString().toLowerCase().trim();
  const inputPass = (p.password_hash || '').toString();

  const user = users.find(row => {
    const rowUser = (row[0] || '').toString().toLowerCase().trim();
    const rowEmail = (row[1] || '').toString().toLowerCase().trim();
    const rowPass = (row[2] || '').toString();
    return (rowUser === inputId || rowEmail === inputId) && rowPass === inputPass;
  });

  if (user) {
    return { success: true, user: { email: user[1], name: user[3], gender: user[4], username: user[0] } };
  }
  return { success: false, error: "Sai tài khoản hoặc mật khẩu" };
}

function handleSaveData(email, data) {
  const sheet = getSheetSafe('data');
  const rows = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === email) {
      sheet.getRange(i + 1, 2).setValue(JSON.stringify(data));
      sheet.getRange(i + 1, 3).setValue(new Date());
      found = true;
      break;
    }
  }
  if (!found) sheet.appendRow([email, JSON.stringify(data), new Date()]);
  return { success: true };
}

function handleLoadData(email) {
  const sheet = getSheetSafe('data');
  if (sheet.getLastRow() < 2) return { success: true, data: {} };
  const rows = sheet.getDataRange().getValues();
  const row = rows.find(r => r[0] === email);
  return { success: true, data: row ? JSON.parse(row[1]) : {} };
}

function handleCheckAccount(payload) {
  const username = (payload.username || '').toString().trim();
  const email = (payload.email || '').toString().trim();
  
  const sheet = getSheetSafe('users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowUsername = (data[i][0] || '').toString().trim();
    const rowEmail = (data[i][1] || '').toString().trim();
    
    if (username && rowUsername === username) {
      return { success: true, exists: true, reason: 'username' };
    }
    if (email && rowEmail === email) {
      return { success: true, exists: true, reason: 'email' };
    }
  }
  return { success: true, exists: false };
}

function handleChangeDisplayName(email, payload) {
  if (!email) return { success: false, error: "Thiếu thông tin người dùng" };
  const newName = (payload.name || '').toString().trim();
  if (!newName) return { success: false, error: "Tên hiển thị không được để trống" };

  const inputEmail = email.toString().trim();
  const sheet = getSheetSafe('users');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowEmail = (rows[i][1] || '').toString().trim();
    if (rowEmail === inputEmail) {
      const cell = sheet.getRange(i + 1, 4); // Col 4 is Name (full_name)
      cell.clearContent(); // Xóa ô cũ
      cell.setValue(newName); // Điền tên mới
      return { success: true, message: "Cập nhật tên thành công!" };
    }
  }
  return { success: false, error: "Không tìm thấy người dùng: " + inputEmail };
}

`