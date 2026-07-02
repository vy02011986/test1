const fs = require('fs');
const path = require('path');

// Bộ nhớ đệm cơ sở dữ liệu In-Memory phía Server (Khởi động cùng serverless context)
let inMemoryDB = {
    attendance: [
        { name: "Nguyễn Văn A", checkedIn: false, time: "--:--", status: "Chưa điểm danh", count: 22, late: 1, leave: 1 },
        { name: "Trần Thị B", checkedIn: true, time: "07:45", status: "Đã vào ca", count: 24, late: 0, leave: 0 },
        { name: "Lê Văn C", checkedIn: false, time: "--:--", status: "Nghỉ phép", count: 20, late: 2, leave: 2 },
        { name: "Phạm Văn D", checkedIn: true, time: "08:15", status: "Đi trễ", count: 21, late: 3, leave: 1 }
    ],
    ctvs: [
        { id: "CTV001", name: "Trần Thanh Hải", phone: "0912345678", province: "Lâm Đồng", links: 12, status: "Hoạt động" },
        { id: "CTV002", name: "Nguyễn Thị Mai", phone: "0987654321", province: "Đắk Lắk", links: 18, status: "Hoạt động" },
        { id: "CTV003", name: "Lê Hồng Quân", phone: "0905123456", province: "Tiền Giang", links: 8, status: "Tạm ngưng" }
    ],
    shifts: [
        { name: "Ca Sáng (Standard)", time: "06:00 - 11:30", rate: "250.000 đ", status: "Đang mở" },
        { name: "Ca Chiều (Standard)", time: "12:30 - 18:00", rate: "250.000 đ", status: "Đang mở" },
        { name: "Ca Tăng ca (Overtime)", time: "18:30 - 21:30", rate: "350.000 đ", status: "Mở theo mùa vụ" }
    ],
    events: [
        { date: "02/07/2026", title: "Phun thuốc hữu cơ đợt 3", farm: "Phân khu Sầu riêng B" },
        { date: "05/07/2026", title: "Kiểm tra dư lượng thuốc thử GlobalGAP", farm: "Vườn Cà phê A" },
        { date: "12/07/2026", title: "Thu hoạch lúa thơm vụ Hè Thu", farm: "Cánh đồng An Giang" }
    ],
    tasks: [
        { id: 1, title: "Bón phân hữu cơ gốc lúa", assignee: "Nguyễn Văn A", deadline: "2026-07-02", status: "Đang làm" },
        { id: 2, title: "Làm cỏ hàng rào bao quanh vườn", assignee: "Trần Thị B", deadline: "2026-07-03", status: "Đang làm" },
        { id: 3, title: "Vệ sinh béc phun mưa tự động", assignee: "Lê Văn C", deadline: "2026-07-01", status: "Đã xong" }
    ],
    approvals: [
        { id: 101, name: "Nguyễn Văn A", date: "01/07/2026", shift: "Ca Sáng", hours: "5.5 giờ", note: "Làm thêm 30p dọn dẹp kho" },
        { id: 102, name: "Trần Thị B", date: "01/07/2026", shift: "Ca Chiều", hours: "5.5 giờ", note: "Không có ghi chú" },
        { id: 103, name: "Phạm Văn D", date: "01/07/2026", shift: "Ca Sáng", hours: "5.5 giờ", note: "Đi trễ do hư xe" }
    ],
    users: [
        { username: "admin", email: "admin@agrismart.vn", password: "123", role: "htx" },
        { username: "farmer", email: "farmer@agrismart.vn", password: "123", role: "farmer" }
    ]
};

// Hàm đọc file CSV thủ công từ đĩa cứng serverless
function readCSVFile(fileName, isDataSubdir = false) {
    try {
        const filePath = isDataSubdir
            ? path.join(process.cwd(), 'data', fileName)
            : path.join(process.cwd(), fileName);
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return '';
        }
        return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.error(`Error reading ${fileName}:`, err);
        return '';
    }
}

// Bộ phân tích cú pháp CSV thô gọn nhẹ không cần phụ thuộc thư viện ngoài
function parseCSV(content) {
    if (!content) return [];
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    // Header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split comma, ignoring inside quotes (basic implementation)
        const rowData = [];
        let insideQuote = false;
        let entry = '';
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
                rowData.push(entry.trim().replace(/^"|"$/g, ''));
                entry = '';
            } else {
                entry += char;
            }
        }
        rowData.push(entry.trim().replace(/^"|"$/g, ''));
        
        const row = {};
        headers.forEach((header, index) => {
            let val = rowData[index] || '';
            if (val !== '' && !isNaN(val)) {
                val = Number(val);
            }
            row[header] = val;
        });
        result.push(row);
    }
    return result;
}

// Entrypoint chính của Vercel Serverless Function
module.exports = async (req, res) => {
    // Kích hoạt CORS hỗ trợ kiểm thử dễ dàng
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Phân tích đường dẫn tương đối (ví dụ: /api/data)
    const url = req.url.split('?')[0];
    const endpoint = url.replace('/api', '');

    try {
        // 1. ENDPOINT: Nạp toàn bộ dữ liệu CSV đã xử lý phía Server
        if (endpoint === '/data' && req.method === 'GET') {
            const farmersCsv = readCSVFile('farmers.csv', true);
            const farmsCsv = readCSVFile('farms.csv', true);
            const productionCsv = readCSVFile('production.csv', true);
            
            const blockchainCsv = readCSVFile('blockchain.csv', false);
            const esgCsv = readCSVFile('esg.csv', false);
            const marketplaceCsv = readCSVFile('marketplace.csv', false);
            const monthlySummaryCsv = readCSVFile('monthly_summary.csv', false);
            const weatherCsv = readCSVFile('weather.csv', false);

            return res.status(200).json({
                status: 'success',
                data: {
                    farmers: parseCSV(farmersCsv),
                    farms: parseCSV(farmsCsv),
                    production: parseCSV(productionCsv),
                    blockchain: parseCSV(blockchainCsv),
                    esg: parseCSV(esgCsv),
                    marketplace: parseCSV(marketplaceCsv),
                    weather: parseCSV(weatherCsv),
                    monthlySummary: parseCSV(monthlySummaryCsv),
                    // Kèm theo dữ liệu quản trị động đang lưu trong bộ nhớ server
                    management: {
                        attendance: inMemoryDB.attendance,
                        ctvs: inMemoryDB.ctvs,
                        shifts: inMemoryDB.shifts,
                        events: inMemoryDB.events,
                        tasks: inMemoryDB.tasks,
                        approvals: inMemoryDB.approvals
                    }
                }
            });
        }

        // 2. ENDPOINT: Xác thực Đăng nhập
        if (endpoint === '/auth/login' && req.method === 'POST') {
            const { username, password } = req.body;
            const user = inMemoryDB.users.find(u => u.username === username && u.password === password);
            if (!user) {
                return res.status(401).json({ status: 'error', message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
            }
            return res.status(200).json({ status: 'success', user });
        }

        // 3. ENDPOINT: Đăng ký tài khoản
        if (endpoint === '/auth/register' && req.method === 'POST') {
            const { username, email, password, role } = req.body;
            if (inMemoryDB.users.some(u => u.username === username)) {
                return res.status(400).json({ status: 'error', message: 'Tên tài khoản này đã được đăng ký.' });
            }
            const newUser = { username, email, password, role };
            inMemoryDB.users.push(newUser);
            return res.status(201).json({ status: 'success', user: newUser });
        }

        // 3.1 ENDPOINT: Lấy danh sách tất cả tài khoản (Cho Admin quản trị)
        if (endpoint === '/auth/users' && req.method === 'GET') {
            const safeUsers = inMemoryDB.users.map(u => ({ username: u.username, email: u.email, role: u.role }));
            return res.status(200).json({ status: 'success', users: safeUsers });
        }

        // 3.2 ENDPOINT: Xóa tài khoản (Cho Admin)
        if (endpoint === '/auth/users/delete' && req.method === 'POST') {
            const { username } = req.body;
            if (username === 'admin') {
                return res.status(400).json({ status: 'error', message: 'Không thể xóa tài khoản Admin mặc định!' });
            }
            const userIdx = inMemoryDB.users.findIndex(u => u.username === username);
            if (userIdx !== -1) {
                inMemoryDB.users.splice(userIdx, 1);
                const safeUsers = inMemoryDB.users.map(u => ({ username: u.username, email: u.email, role: u.role }));
                return res.status(200).json({ status: 'success', users: safeUsers });
            }
            return res.status(404).json({ status: 'error', message: 'Tài khoản không tồn tại.' });
        // 3.3 ENDPOINT: Sửa đổi thông tin tài khoản (Cho Admin)
        if (endpoint === '/auth/users/edit' && req.method === 'POST') {
            const { username, email, role, password } = req.body;
            const user = inMemoryDB.users.find(u => u.username === username);
            if (!user) {
                return res.status(404).json({ status: 'error', message: 'Tài khoản không tồn tại.' });
            }
            if (email) user.email = email;
            if (role) user.role = role;
            if (password) user.password = password;
            
            const safeUsers = inMemoryDB.users.map(u => ({ username: u.username, email: u.email, role: u.role }));
            return res.status(200).json({ status: 'success', users: safeUsers });
        }

        // 4. ENDPOINT: Điểm danh (Chấm công)
        if (endpoint === '/management/attendance/toggle' && req.method === 'POST') {
            const { employeeIndex } = req.body;
            if (employeeIndex === undefined || employeeIndex >= inMemoryDB.attendance.length) {
                return res.status(400).json({ status: 'error', message: 'Chỉ số nhân viên không hợp lệ.' });
            }
            const att = inMemoryDB.attendance[employeeIndex];
            att.checkedIn = !att.checkedIn;
            if (att.checkedIn) {
                const now = new Date();
                att.time = now.toTimeString().substring(0, 5);
                att.status = "Đã vào ca";
                att.count += 1;
            } else {
                att.time = "--:--";
                att.status = "Chưa điểm danh";
                att.count -= 1;
            }
            return res.status(200).json({ status: 'success', attendance: inMemoryDB.attendance });
        }

        // 5. ENDPOINT: Thêm CTV mới
        if (endpoint === '/management/ctvs' && req.method === 'POST') {
            const { name, phone, province, links } = req.body;
            const newId = "CTV00" + (inMemoryDB.ctvs.length + 1);
            const newCTV = {
                id: newId,
                name,
                phone: phone || "09xxxxxxx",
                province: province || "Lâm Đồng",
                links: parseInt(links) || 0,
                status: "Hoạt động"
            };
            inMemoryDB.ctvs.push(newCTV);
            return res.status(201).json({ status: 'success', ctvs: inMemoryDB.ctvs });
        }

        // 6. ENDPOINT: Giao nhiệm vụ mới
        if (endpoint === '/management/tasks' && req.method === 'POST') {
            const { title, assignee, deadline } = req.body;
            const newId = inMemoryDB.tasks.length ? Math.max(...inMemoryDB.tasks.map(t => t.id)) + 1 : 1;
            const newTask = {
                id: newId,
                title,
                assignee,
                deadline,
                status: "Đang làm"
            };
            inMemoryDB.tasks.push(newTask);
            return res.status(201).json({ status: 'success', tasks: inMemoryDB.tasks });
        }

        // 7. ENDPOINT: Hoàn thành nhiệm vụ
        if (endpoint === '/management/tasks/complete' && req.method === 'POST') {
            const { taskId } = req.body;
            const task = inMemoryDB.tasks.find(t => t.id === taskId);
            if (!task) {
                return res.status(404).json({ status: 'error', message: 'Nhiệm vụ không tồn tại.' });
            }
            task.status = "Đã xong";
            
            // Đồng thời thưởng ca làm cho nhân viên tương ứng
            const att = inMemoryDB.attendance.find(a => a.name === task.assignee);
            if (att) {
                att.count += 1;
            }
            return res.status(200).json({ status: 'success', tasks: inMemoryDB.tasks, attendance: inMemoryDB.attendance });
        }

        // 8. ENDPOINT: Xử lý duyệt công nhân viên
        if (endpoint === '/management/approvals/process' && req.method === 'POST') {
            const { approvalId, isApproved } = req.body;
            const appIdx = inMemoryDB.approvals.findIndex(a => a.id === approvalId);
            if (appIdx === -1) {
                return res.status(404).json({ status: 'error', message: 'Yêu cầu phê duyệt không tồn tại.' });
            }
            
            const app = inMemoryDB.approvals[appIdx];
            inMemoryDB.approvals.splice(appIdx, 1);
            
            if (isApproved) {
                const att = inMemoryDB.attendance.find(a => a.name === app.name);
                if (att) {
                    att.count += 1;
                }
            }
            return res.status(200).json({ 
                status: 'success', 
                approvals: inMemoryDB.approvals,
                attendance: inMemoryDB.attendance 
            });
        }

        // Các đường dẫn API không khớp
        return res.status(404).json({ status: 'error', message: `Không tìm thấy endpoint API: ${endpoint}` });
    } catch (e) {
        console.error('API Error:', e);
        return res.status(500).json({ status: 'error', message: e.message });
    }
};
