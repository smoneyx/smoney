function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var action = req.action;
    var payload = req.payload || {};
    var userId = req.userId; // Sử dụng email làm userId để phân biệt

    var result = { success: false, error: "Hành động không hợp lệ" };

    if (action === "login") {
      result = handleLogin(payload);
    } else if (action === "register") {
      result = handleRegister(payload);
    } else if (action === "sendOTP") {
      result = handleSendOTP(payload);
    } else if (action === "resetPassword") {
      result = handleResetPassword(payload);
    } else if (action === "saveData") {
      result = handleSaveData(userId, payload);
    } else if (action === "loadData") {
      result = handleLoadData(userId);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==============================================
// CÁC HÀM XỬ LÝ (HANDLERS)
// ==============================================

// Hàm hỗ trợ tự động tạo Sheet nếu chưa tồn tại
function getSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === "Users") {
      sheet.appendRow(["Username", "Email", "PasswordHash", "Name", "Gender"]);
    } else if (sheetName === "OTP") {
      sheet.appendRow(["Email", "OTP", "Timestamp"]);
    } else if (sheetName === "Data") {
      sheet.appendRow(["Email", "JSON_Data"]);
    }
  }
  return sheet;
}

// 1. Đăng nhập
function handleLogin(payload) {
  var sheet = getSheet("Users");
  var data = sheet.getDataRange().getValues();
  
  var inputUser = (payload.username || payload.email || "").toString().trim();
  var inputPass = (payload.passwordHash || payload.password_hash || payload.password || "").toString();

  for (var i = 1; i < data.length; i++) {
    var rowUser = (data[i][0] || "").toString().trim();
    var rowEmail = (data[i][1] || "").toString().trim();
    var rowPass = (data[i][2] || "").toString();
    
    if ((rowUser === inputUser || rowEmail === inputUser) && rowPass === inputPass) {
      return { 
        success: true, 
        user: {
          username: data[i][0],
          email: data[i][1],
          name: data[i][3],
          gender: data[i][4]
        }
      };
    }
  }
  return { success: false, error: "Sai tên đăng nhập hoặc mật khẩu" };
}

// 2. Gửi mã OTP
function handleSendOTP(payload) {
  var email = payload.email || "";
  if (!email) return { success: false, error: "Vui lòng cung cấp email" };
  var inputEmail = email.toString().trim();
  
  // Tạo OTP ngẫu nhiên 6 số
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  var sheet = getSheet("OTP");
  sheet.appendRow([inputEmail, otp, new Date().toISOString()]);
  
  // Gửi Email
  MailApp.sendEmail({
    to: inputEmail,
    subject: "Mã xác thực OTP - Smoney",
    body: "Xin chào,\n\nMã xác thực OTP của bạn là: " + otp + "\n\nVui lòng không chia sẻ mã này cho bất kỳ ai. Mã có hiệu lực trong 5 phút.\n\nTrân trọng,\nĐội ngũ Smoney."
  });
  
  return { success: true, message: "Mã OTP đã được gửi" };
}

// 3. Đăng ký tài khoản
function handleRegister(payload) {
  var otpSheet = getSheet("OTP");
  var otpData = otpSheet.getDataRange().getValues();
  var validOtp = false;
  
  var inputEmail = (payload.email || "").toString().trim();
  var inputUser = (payload.username || "").toString().trim();
  var pass = payload.passwordHash || payload.password_hash || payload.password || "";
  var name = payload.name || payload.full_name || "";
  var gender = payload.gender || "";

  // Kiểm tra mã OTP
  for (var i = otpData.length - 1; i >= 1; i--) {
    var otpEmail = (otpData[i][0] || "").toString().trim();
    if (otpEmail === inputEmail && otpData[i][1].toString() === payload.otp.toString()) {
      validOtp = true;
      break;
    }
  }
  if (!validOtp) return { success: false, error: "Mã OTP không đúng hoặc đã hết hạn" };

  var userSheet = getSheet("Users");
  var usersData = userSheet.getDataRange().getValues();
  
  // Kiểm tra trùng lặp User/Email
  for (var i = 1; i < usersData.length; i++) {
    var rowUser = (usersData[i][0] || "").toString().trim();
    var rowEmail = (usersData[i][1] || "").toString().trim();
    if (rowUser === inputUser) return { success: false, error: "Tên đăng nhập đã tồn tại" };
    if (rowEmail === inputEmail) return { success: false, error: "Email này đã được sử dụng" };
  }

  // Lưu người dùng mới
  userSheet.appendRow([payload.username, payload.email, pass, name, gender]);
  return { success: true, message: "Đăng ký thành công!" };
}

// 4. QUÊN MẬT KHẨU / ĐỔI MẬT KHẨU
function handleResetPassword(payload) {
  var otpSheet = getSheet("OTP");
  var otpData = otpSheet.getDataRange().getValues();
  var validOtp = false;
  
  var inputEmail = (payload.email || "").toString().trim();
  var newPass = payload.new_password_hash || payload.passwordHash || payload.password_hash || payload.password || "";

  // Xác thực OTP
  for (var i = otpData.length - 1; i >= 1; i--) {
    var otpEmail = (otpData[i][0] || "").toString().trim();
    if (otpEmail === inputEmail && otpData[i][1].toString() === payload.otp.toString()) {
      validOtp = true;
      break;
    }
  }
  if (!validOtp) return { success: false, error: "Mã OTP không đúng hoặc đã hết hạn" };

  var userSheet = getSheet("Users");
  var userData = userSheet.getDataRange().getValues();
  var userFound = false;
  
  // Tìm email và cập nhật Password (Cột thứ 3 là PasswordHash)
  for (var i = 1; i < userData.length; i++) {
    var rowEmail = (userData[i][1] || "").toString().trim();
    if (rowEmail === inputEmail) {
      userSheet.getRange(i + 1, 3).setValue(newPass);
      userFound = true;
      break;
    }
  }
  
  if (!userFound) return { success: false, error: "Không tìm thấy tài khoản với email này" };
  return { success: true, message: "Đổi mật khẩu thành công!" };
}

// 5. Lưu Dữ Liệu (Sync To Cloud)
function handleSaveData(userId, payload) {
  if (!userId) return { success: false, error: "Thiếu userId (email) để lưu dữ liệu" };
  var sheet = getSheet("Data");
  var data = sheet.getDataRange().getValues();
  var jsonStr = JSON.stringify(payload);
  
  // Ghi đè nếu đã có
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sheet.getRange(i + 1, 2).setValue(jsonStr);
      return { success: true };
    }
  }
  
  // Tạo mới nếu chưa có
  sheet.appendRow([userId, jsonStr]);
  return { success: true };
}

// 6. Tải Dữ Liệu (Sync From Cloud)
function handleLoadData(userId) {
  if (!userId) return { success: false, error: "Thiếu userId (email) để lấy dữ liệu" };
  var sheet = getSheet("Data");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      return { success: true, data: JSON.parse(data[i][1]) };
    }
  }
  return { success: true, data: null }; // Chưa có dữ liệu
}

// Xử lý request dạng GET đơn giản để kiểm tra link API
function doGet(e) {
  return ContentService.createTextOutput("✅ API Smoney đang hoạt động bình thường!").setMimeType(ContentService.MimeType.TEXT);
}
