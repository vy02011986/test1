/* ==========================================================================
   AGRISMART PORTAL & DASHBOARD - MVC ARCHITECTURE
   Separation of Concerns:
   - MODEL: Manages data (CSV parsing, state, calculations, localStorage auth)
   - VIEW: Manages DOM rendering (views, notifications, Chart.js updates)
   - CONTROLLER: Binds Model & View, handles user interactions and events
   ========================================================================== */

// ==========================================
// 1. MODEL (Dữ liệu & Nghiệp vụ hệ thống)
// ==========================================
class AgriSmartModel {
    constructor() {
        this.currentUser = null;
        this.isUsingMockData = false;
        this.data = {
            farmers: [],
            farms: [],
            production: [],
            blockchain: [],
            esg: [],
            marketplace: [],
            weather: [],
            monthlySummary: []
        };
        this.provinces = ['Đắk Lắk', 'Tiền Giang', 'Đồng Tháp', 'An Giang', 'Lâm Đồng'];
        this.crops = ['Thanh long', 'Cà phê', 'Lúa', 'Xoài', 'Sầu riêng'];
    }

    // Quản lý tài khoản trong LocalStorage
    getUsers() {
        const defaultUsers = [
            { username: 'admin', password: 'admin123', role: 'admin', email: 'admin@agrismart.vn' },
            { username: 'nongho1', password: 'password', role: 'farmer', email: 'farmer1@gmail.com' }
        ];
        let users = [];
        try {
            const stored = localStorage.getItem('agrismart_users');
            if (stored) {
                users = JSON.parse(stored);
            }
        } catch (e) {
            console.error(e);
        }
        
        if (!Array.isArray(users) || users.length === 0) {
            users = defaultUsers;
            localStorage.setItem('agrismart_users', JSON.stringify(users));
        } else {
            // Đảm bảo luôn có tài khoản admin dùng thử
            const hasAdmin = users.some(u => u.username.toLowerCase() === 'admin');
            if (!hasAdmin) {
                users.push(defaultUsers[0]);
                localStorage.setItem('agrismart_users', JSON.stringify(users));
            }
        }
        return users;
    }

    registerUser(username, email, password, role) {
        const users = this.getUsers();
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error('Tên đăng nhập này đã tồn tại!');
        }
        const newUser = { username, password, role, email };
        users.push(newUser);
        try {
            localStorage.setItem('agrismart_users', JSON.stringify(users));
        } catch (e) {
            console.error('Failed to save user to localStorage:', e);
        }
        return newUser;
    }

    authenticateUser(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        if (!user) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng!');
        this.currentUser = user;
        localStorage.setItem('agrismart_session', JSON.stringify(user));
        return user;
    }

    clearSession() {
        this.currentUser = null;
        localStorage.removeItem('agrismart_session');
    }

    checkActiveSession() {
        const session = localStorage.getItem('agrismart_session');
        if (session) {
            this.currentUser = JSON.parse(session);
            return this.currentUser;
        }
        return null;
    }

    // Đọc dữ liệu CSV và tính toán dự phòng
    async loadCSVData() {
        const fetchFile = async (filePath) => {
            const response = await fetch(`./${filePath}`);
            if (!response.ok) throw new Error(`Không thể đọc file ${filePath}`);
            const text = await response.text();
            return new Promise((resolve) => {
                Papa.parse(text, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => resolve(results.data)
                });
            });
        };

        try {
            const [farmers, farms, production, blockchain, esg, marketplace, weather, monthlySummary] = await Promise.all([
                fetchFile('data/farmers.csv'),
                fetchFile('data/farms.csv'),
                fetchFile('data/production.csv'),
                fetchFile('blockchain.csv'),
                fetchFile('esg.csv'),
                fetchFile('marketplace.csv'),
                fetchFile('weather.csv'),
                fetchFile('monthly_summary.csv')
            ]);
            this.data.farmers = farmers;
            this.data.farms = farms;
            this.data.production = production;
            this.data.blockchain = blockchain;
            this.data.esg = esg;
            this.data.marketplace = marketplace;
            this.data.weather = weather;
            this.data.monthlySummary = monthlySummary;
            this.isUsingMockData = false;
        } catch (error) {
            console.warn('Sử dụng dữ liệu giả lập (CORS block/Thiếu tệp CSV).', error);
            this.loadMockData();
            this.isUsingMockData = true;
        }
    }

    loadMockData() {
        // Tạo 100 nông hộ giả lập giống hệt dữ liệu thực
        this.data.farmers = [];
        for (let i = 1; i <= 100; i++) {
            const province = this.provinces[Math.floor(Math.random() * this.provinces.length)];
            const crop = this.crops[Math.floor(Math.random() * this.crops.length)];
            const area = Number((Math.random() * 5 + 1.5).toFixed(1));
            const revenue = Number((area * (Math.random() * 80 + 100)).toFixed(1));
            const cost = Number((revenue * (Math.random() * 0.3 + 0.45)).toFixed(1));
            const profit = Number((revenue - cost).toFixed(1));
            
            this.data.farmers.push({
                Farmer_ID: `F${String(i).padStart(3, '0')}`,
                Farmer_Name: `Nông hộ ${i}`,
                Province: province,
                Crop: crop,
                Area_Ha: area,
                Revenue_Million_VND: revenue,
                Cost_Million_VND: cost,
                Profit_Million_VND: profit,
                Blockchain: Math.random() > 0.35 ? 'Yes' : 'No',
                IoT_Device: Math.random() > 0.4 ? 'Yes' : 'No'
            });
        }

        // Tạo 100 trang trại tương ứng
        this.data.farms = this.data.farmers.map((farmer, idx) => ({
            Farm_ID: `FM${String(idx+1).padStart(3, '0')}`,
            Farmer_ID: farmer.Farmer_ID,
            Province: farmer.Province,
            Crop: farmer.Crop,
            Area_Ha: farmer.Area_Ha,
            Yield_Ton: Number((farmer.Area_Ha * (Math.random() * 3 + 5)).toFixed(1)),
            Soil_Moisture_Percent: Number((Math.random() * 40 + 45).toFixed(1)),
            Temperature_C: Number((Math.random() * 10 + 24).toFixed(1)),
            IoT_Device: farmer.IoT_Device,
            Blockchain: farmer.Blockchain
        }));

        // Tạo 1000 lượt thu hoạch/sản xuất
        this.data.production = [];
        for (let i = 1; i <= 1000; i++) {
            const farm = this.data.farms[Math.floor(Math.random() * this.data.farms.length)];
            const qty = Number((Math.random() * 45 + 5).toFixed(1));
            const unitPrice = farm.Crop === 'Sầu riêng' ? 65000 : 
                              farm.Crop === 'Cà phê' ? 45000 : 
                              farm.Crop === 'Thanh long' ? 30000 : 
                              farm.Crop === 'Xoài' ? 25000 : 18000;
            const revenue = qty * unitPrice;
            const cost = revenue * (Math.random() * 0.2 + 0.4);
            const profit = revenue - cost;
            const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            
            this.data.production.push({
                Production_ID: `P${String(i).padStart(5, '0')}`,
                Farm_ID: farm.Farm_ID,
                Farmer_ID: farm.Farmer_ID,
                Date: `2025-${month}-15`,
                Crop: farm.Crop,
                Quantity_Ton: qty,
                Unit_Price_VND: unitPrice,
                Revenue_VND: revenue,
                Cost_VND: cost,
                Profit_VND: profit,
                AI_Prediction_Accuracy: Math.floor(Math.random() * 12 + 87),
                AI_Error_Percent: Number((Math.random() * 10 + 2).toFixed(1)),
                Disease_Risk: Math.random() > 0.8 ? 'High' : (Math.random() > 0.5 ? 'Medium' : 'Low'),
                Weather_Risk: Math.random() > 0.85 ? 'High' : (Math.random() > 0.4 ? 'Medium' : 'Low'),
                ESG_Score: Math.floor(Math.random() * 30 + 70),
                Export_Market: ['USA', 'Japan', 'Korea', 'Singapore', 'Germany', 'Australia'][Math.floor(Math.random() * 6)],
                Logistics: ['DHL', 'FedEx', 'Viettel Post', 'VNPost'][Math.floor(Math.random() * 4)]
            });
        }

        // Tạo dữ liệu Blockchain giả lập
        this.data.blockchain = this.data.production.map((p, idx) => ({
            Transaction_ID: `TX-${String(idx+1).padStart(5, '0')}`,
            Production_ID: p.Production_ID,
            QR_Code_URL: `https://agrismart.vn/trace/${p.Production_ID}`,
            Traceability_Level: idx % 2 === 0 ? 'Full - Seed to Table' : 'Standard - Farm to Market',
            Verification_Time: `2025-${p.Date.split('-')[1]}-15 12:00:00`,
            Blockchain_Hash: '0xce' + Array.from({length: 38}, () => Math.floor(Math.random()*16).toString(16)).join(''),
            Node_Confirmed: Math.floor(Math.random() * 15 + 10)
        }));

        // Tạo dữ liệu ESG giả lập
        this.data.esg = this.data.production.map((p, idx) => ({
            ESG_ID: `ESG-${String(idx+1).padStart(5, '0')}`,
            Farm_ID: p.Farm_ID,
            Production_ID: p.Production_ID,
            Carbon_Reduction_kgCO2: Number((Math.random() * 1500 + 100).toFixed(2)),
            Water_Saving_m3: Number((Math.random() * 500 + 30).toFixed(2)),
            ESG_Score: p.ESG_Score,
            Sustainability_Index: Number((Math.random() * 0.3 + 0.7).toFixed(2))
        }));

        // Tạo dữ liệu Marketplace giả lập
        this.data.marketplace = this.data.production.filter((p, idx) => idx % 2 === 0).map((p, idx) => ({
            Order_ID: `ORD-${String(idx+1).padStart(5, '0')}`,
            Production_ID: p.Production_ID,
            Buyer_Name: ['VinMart', 'Aeon Vietnam', 'Bach Hoa Xanh', 'Singapore AgriTrade', 'Korea Harvest', 'EU EcoFruit'][Math.floor(Math.random() * 6)],
            Crop: p.Crop,
            Quantity_Ton: p.Quantity_Ton,
            Unit_Price_VND: p.Unit_Price_VND,
            Revenue_VND: p.Revenue_VND,
            Order_Status: Math.random() > 0.1 ? 'Completed' : (Math.random() > 0.5 ? 'Processing' : 'Cancelled'),
            Destination_Country: p.Export_Market === 'USA' ? 'Hoa Kỳ' : (p.Export_Market === 'Japan' ? 'Nhật Bản' : (p.Export_Market === 'Korea' ? 'Hàn Quốc' : p.Export_Market)),
            Logistics_Provider: p.Logistics === 'DHL' ? 'DHL Express' : (p.Logistics === 'FedEx' ? 'FedEx' : p.Logistics),
            Delivery_Time_Days: Math.floor(Math.random() * 20 + 2),
            Customer_Rating: Number((Math.random() * 1 + 4).toFixed(1))
        }));

        // Tạo dữ liệu khí tượng giả lập
        this.data.weather = this.data.production.map((p, idx) => ({
            Weather_ID: `WEA-${String(idx+1).padStart(5, '0')}`,
            Farm_ID: p.Farm_ID,
            Date: p.Date,
            Temperature_C: Number((Math.random() * 12 + 22).toFixed(1)),
            Humidity_Percent: Number((Math.random() * 30 + 60).toFixed(1)),
            Rainfall_mm: Number((Math.random() * 150).toFixed(1)),
            Disease_Risk: p.Disease_Risk,
            Weather_Alert: Math.random() > 0.85 ? 'Heavy Rain Alert' : 'None'
        }));

        // Tạo dữ liệu tổng hợp theo tháng giả lập
        const monthlyData = {};
        this.data.production.forEach(p => {
            const m = p.Date.substring(0, 7); // YYYY-MM
            if (!monthlyData[m]) {
                monthlyData[m] = {
                    Month: m,
                    Revenue_VND: 0,
                    Cost_VND: 0,
                    Profit_VND: 0,
                    Quantity_Ton: 0,
                    AI_Prediction_Accuracy: 0,
                    ESG_Score: 0,
                    Total_Orders: 0,
                    Marketplace_Revenue_VND: 0,
                    count: 0
                };
            }
            monthlyData[m].Revenue_VND += p.Revenue_VND;
            monthlyData[m].Cost_VND += p.Cost_VND;
            monthlyData[m].Profit_VND += p.Profit_VND;
            monthlyData[m].Quantity_Ton += p.Quantity_Ton;
            monthlyData[m].AI_Prediction_Accuracy += p.AI_Prediction_Accuracy;
            monthlyData[m].ESG_Score += p.ESG_Score;
            monthlyData[m].Total_Orders += 1;
            monthlyData[m].Marketplace_Revenue_VND += p.Revenue_VND * 0.4;
            monthlyData[m].count += 1;
        });

        this.data.monthlySummary = Object.values(monthlyData).map(m => ({
            Month: m.Month,
            Revenue_VND: m.Revenue_VND,
            Cost_VND: m.Cost_VND,
            Profit_VND: m.Profit_VND,
            Quantity_Ton: Number(m.Quantity_Ton.toFixed(1)),
            AI_Prediction_Accuracy: Number((m.AI_Prediction_Accuracy / m.count).toFixed(2)),
            ESG_Score: Number((m.ESG_Score / m.count).toFixed(1)),
            Total_Orders: m.Total_Orders,
            Marketplace_Revenue_VND: Number(m.Marketplace_Revenue_VND.toFixed(1))
        }));
    }

    // Nghiệp vụ tính toán KPI dựa trên phân quyền người dùng
    getKPIs() {
        let totalRevenue = 0;
        let totalProfit = 0;
        let totalEsg = 0;
        let totalAccuracy = 0;
        
        // Phân quyền: Nông hộ chỉ nhìn thấy dữ liệu vùng Lâm Đồng (ví dụ)
        const isFarmerRole = this.currentUser && this.currentUser.role === 'farmer';
        const targetProvince = isFarmerRole ? 'Lâm Đồng' : null;
        
        let filteredFarmers = this.data.farmers;
        let filteredProduction = this.data.production;
        
        if (targetProvince) {
            filteredFarmers = this.data.farmers.filter(f => f.Province === targetProvince);
            const farmerIds = new Set(filteredFarmers.map(f => f.Farmer_ID));
            filteredProduction = this.data.production.filter(p => farmerIds.has(p.Farmer_ID));
        }
        
        filteredProduction.forEach(p => {
            totalRevenue += (p.Revenue_VND || (p.Revenue_Million_VND * 1000000) || 0);
            totalProfit += (p.Profit_VND || (p.Profit_Million_VND * 1000000) || 0);
            totalEsg += (p.ESG_Score || 80);
            totalAccuracy += (p.AI_Prediction_Accuracy || 90);
        });
        
        const avgEsg = filteredProduction.length ? Math.round(totalEsg / filteredProduction.length) : 80;
        const avgAccuracy = filteredProduction.length ? Math.round(totalAccuracy / filteredProduction.length) : 90;
        
        return {
            revenue: totalRevenue,
            profit: totalProfit,
            farmersCount: filteredFarmers.length,
            esg: avgEsg,
            aiAccuracy: avgAccuracy
        };
    }
}

// ==========================================
// 2. VIEW (Giao diện người dùng & Đồ họa)
// ==========================================
class AgriSmartView {
    constructor() {
        this.activeCharts = {};
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-circle-check';
        if (type === 'danger') icon = 'fa-circle-exclamation';
        if (type === 'warning') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('active'), 50);
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    switchView(viewName) {
        if (viewName === 'dashboard') {
            document.getElementById('auth-view').classList.add('hidden');
            document.getElementById('dashboard-view').classList.remove('hidden');
        } else {
            document.getElementById('dashboard-view').classList.add('hidden');
            document.getElementById('auth-view').classList.remove('hidden');
        }
    }

    updateUserProfile(user) {
        document.getElementById('user-display-name').textContent = user.username;
        const pwaUserDisplay = document.getElementById('pwa-user-display');
        if (pwaUserDisplay) pwaUserDisplay.textContent = user.username;

        let roleText = 'Nông hộ';
        if (user.role === 'enterprise') roleText = 'Doanh nghiệp';
        if (user.role === 'admin') roleText = 'Quản trị viên';
        
        const roleBadge = document.getElementById('user-display-role');
        roleBadge.textContent = roleText;
        roleBadge.className = `badge ${user.role}`;
    }

    updateDataStatusBadge(isReal) {
        const badge = document.getElementById('data-status-badge');
        const pwaStatus = document.getElementById('pwa-data-status');
        if (isReal) {
            badge.className = 'data-status-indicator fetched';
            badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span id="data-status-text">Kết nối dữ liệu thực (.csv)</span>';
            if (pwaStatus) pwaStatus.innerHTML = '<i class="fa-solid fa-circle-check text-success"></i> Dữ liệu thực tế được xác thực';
        } else {
            badge.className = 'data-status-indicator mocked';
            badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span id="data-status-text">CORS Hạn chế / Chế độ Demo</span>';
            if (pwaStatus) pwaStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-warning"></i> Chạy chế độ Demo (CORS/Offline)';
        }
    }

    updateKPIs(kpis) {
        document.getElementById('kpi-revenue').textContent = this.formatVND(kpis.revenue);
        document.getElementById('kpi-profit').textContent = 'Lợi nhuận: ' + this.formatVND(kpis.profit);
        document.getElementById('kpi-farmers').textContent = kpis.farmersCount.toLocaleString('vi-VN') + ' nông hộ';
        document.getElementById('kpi-tech').innerHTML = `AI ${kpis.aiAccuracy}% <span style="opacity:0.6">|</span> ESG ${kpis.esg}`;
    }

    formatVND(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + ' tỷ ₫';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + ' triệu ₫';
        return num.toLocaleString('vi-VN') + ' ₫';
    }

    getChartThemeColors() {
        return {
            text: '#1f2937',      /* Deep slate color for text labels */
            muted: '#6b7280',     /* Muted gray for axis ticks */
            grid: 'rgba(0, 0, 0, 0.08)' /* Soft gray line for grid lines */
        };
    }

    createOrUpdateChart(canvasId, config) {
        if (this.activeCharts[canvasId]) {
            this.activeCharts[canvasId].destroy();
        }

        // Cấu hình theme động cho Chart.js dựa trên Chế độ Sáng/Tối
        const colors = this.getChartThemeColors();
        
        if (!config.options) config.options = {};
        
        // 1. Cấu hình màu sắc Legend
        if (!config.options.plugins) config.options.plugins = {};
        if (!config.options.plugins.legend) config.options.plugins.legend = {};
        if (!config.options.plugins.legend.labels) config.options.plugins.legend.labels = {};
        config.options.plugins.legend.labels.color = colors.text;
        
        // 2. Cấu hình màu sắc các trục
        if (config.options.scales) {
            Object.keys(config.options.scales).forEach(key => {
                const scale = config.options.scales[key];
                if (key !== 'r') {
                    if (!scale.ticks) scale.ticks = {};
                    if (!scale.ticks.color || scale.ticks.color === '#a0aec0') {
                        scale.ticks.color = colors.muted;
                    }
                    
                    if (!scale.grid) scale.grid = {};
                    if (scale.grid.display !== false) {
                        if (!scale.grid.color || scale.grid.color === 'rgba(255,255,255,0.05)') {
                            scale.grid.color = colors.grid;
                        }
                    }
                } else {
                    if (!scale.angleLines) scale.angleLines = {};
                    if (!scale.angleLines.color || scale.angleLines.color === 'rgba(255,255,255,0.1)') {
                        scale.angleLines.color = colors.grid;
                    }
                    
                    if (!scale.grid) scale.grid = {};
                    if (!scale.grid.color || scale.grid.color === 'rgba(255,255,255,0.1)') {
                        scale.grid.color = colors.grid;
                    }
                    
                    if (!scale.pointLabels) scale.pointLabels = {};
                    if (!scale.pointLabels.color || scale.pointLabels.color === '#a0aec0') {
                        scale.pointLabels.color = colors.muted;
                    }
                    
                    if (!scale.ticks) scale.ticks = {};
                    if (!scale.ticks.color || scale.ticks.color === '#a0aec0') {
                        scale.ticks.color = colors.muted;
                    }
                }
            });
        }

        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.activeCharts[canvasId] = new Chart(ctx, config);
        }
    }

    renderFinanceCharts(monthlyRevenue, monthlyCost, provinceProfits) {
        // Biểu đồ miền doanh thu & chi phí
        this.createOrUpdateChart('chart-finance-area', {
            type: 'line',
            data: {
                labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
                datasets: [
                    {
                        label: 'Doanh thu (Triệu VND)',
                        data: monthlyRevenue.map(v => v / 1e6),
                        borderColor: '#52b788',
                        backgroundColor: 'rgba(82, 183, 136, 0.15)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Chi phí (Triệu VND)',
                        data: monthlyCost.map(v => v / 1e6),
                        borderColor: '#e63946',
                        backgroundColor: 'rgba(230, 57, 70, 0.05)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#f8f9fa' } } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0' } }
                }
            }
        });

        // Biểu đồ cột lợi nhuận theo Tỉnh
        this.createOrUpdateChart('chart-finance-bar', {
            type: 'bar',
            data: {
                labels: Object.keys(provinceProfits),
                datasets: [{
                    label: 'Lợi nhuận tích lũy (Triệu VND)',
                    data: Object.values(provinceProfits),
                    backgroundColor: ['rgba(82, 183, 136, 0.75)', 'rgba(212, 175, 55, 0.75)', 'rgba(0, 180, 216, 0.75)', 'rgba(255, 183, 3, 0.75)', 'rgba(46, 196, 182, 0.75)'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#a0aec0' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0' } }
                }
            }
        });
    }

    renderYieldCharts(cropQty, cropYieldLabels, cropYieldAvgs) {
        // Biểu đồ tròn cơ cấu nông sản
        this.createOrUpdateChart('chart-yield-pie', {
            type: 'doughnut',
            data: {
                labels: Object.keys(cropQty),
                datasets: [{
                    data: Object.values(cropQty),
                    backgroundColor: ['#2d6a4f', '#d4af37', '#e63946', '#00b4d8', '#ffb703'],
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#f8f9fa', padding: 12 } } }
            }
        });

        // Biểu đồ cột năng suất bình quân
        this.createOrUpdateChart('chart-yield-bar', {
            type: 'bar',
            data: {
                labels: cropYieldLabels,
                datasets: [{
                    label: 'Năng suất bình quân (Tấn/Ha)',
                    data: cropYieldAvgs,
                    backgroundColor: 'rgba(212, 175, 55, 0.8)',
                    borderColor: '#d4af37',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#a0aec0' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0' } }
                }
            }
        });
    }

    renderWeatherCharts(weatherLabels, humidityData, tempData, highRisk, medRisk, lowRisk, errorTimeline) {
        // Biểu đồ đường đa trục
        this.createOrUpdateChart('chart-weather-line', {
            type: 'line',
            data: {
                labels: weatherLabels,
                datasets: [
                    {
                        label: 'Độ ẩm đất (%)',
                        data: humidityData,
                        borderColor: '#00b4d8',
                        yAxisID: 'y1',
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Nhiệt độ (°C)',
                        data: tempData,
                        borderColor: '#ffb703',
                        yAxisID: 'y2',
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#f8f9fa' } } },
                scales: {
                    x: { ticks: { color: '#a0aec0' } },
                    y1: {
                        type: 'linear', position: 'left',
                        ticks: { color: '#00b4d8' }, grid: { color: 'rgba(0,180,216,0.05)' }
                    },
                    y2: {
                        type: 'linear', position: 'right',
                        ticks: { color: '#ffb703' }, grid: { drawOnChartArea: false }
                    }
                }
            }
        });

        // Biểu đồ cột rủi ro dịch bệnh
        this.createOrUpdateChart('chart-ai-risk-bar', {
            type: 'bar',
            data: {
                labels: ['Nguy cơ cao', 'Trung bình', 'An toàn'],
                datasets: [{
                    data: [highRisk, medRisk, lowRisk],
                    backgroundColor: ['#e63946', '#ffb703', '#2ec4b6'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#a0aec0' } },
                    y: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });

        // Biểu đồ đường biên độ sai số AI
        this.createOrUpdateChart('chart-ai-error-line', {
            type: 'line',
            data: {
                labels: ['Đợt 1', 'Đợt 2', 'Đợt 3', 'Đợt 4', 'Đợt 5', 'Đợt 6', 'Đợt 7', 'Đợt 8', 'Đợt 9', 'Đợt 10 (Hiện tại)'],
                datasets: [{
                    label: 'Biên độ sai số AI (%)',
                    data: errorTimeline,
                    borderColor: '#52b788',
                    backgroundColor: 'rgba(82, 183, 136, 0.05)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#f8f9fa' } } },
                scales: {
                    x: { ticks: { color: '#a0aec0' } },
                    y: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    renderSupplyCharts(marketLabels, marketValues, carrierLabels, carrierValues) {
        // Biểu đồ cột thị phần xuất khẩu
        this.createOrUpdateChart('chart-export-bar', {
            type: 'bar',
            data: {
                labels: marketLabels,
                datasets: [{
                    label: 'Sản lượng xuất khẩu (Tấn)',
                    data: marketValues,
                    backgroundColor: '#00b4d8',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#a0aec0' } },
                    y: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });

        // Biểu đồ quạt hiệu năng nhà vận chuyển
        this.createOrUpdateChart('chart-logistics-pie', {
            type: 'pie',
            data: {
                labels: carrierLabels,
                datasets: [{
                    data: carrierValues,
                    backgroundColor: ['#d4af37', '#e63946', '#2d6a4f', '#ffb703'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#f8f9fa' } } }
            }
        });
    }

    renderEsgCharts(provLabels, carbonVals, waterVals, radarLabels, radarValues) {
        // Biểu đồ cột kép tiết kiệm carbon & nước
        this.createOrUpdateChart('chart-esg-double-bar', {
            type: 'bar',
            data: {
                labels: provLabels,
                datasets: [
                    { label: 'Carbon giảm tải (Tấn CO2)', data: carbonVals, backgroundColor: '#52b788', borderRadius: 4 },
                    { label: 'Nước tiết kiệm (m³ x10)', data: waterVals.map(w => w / 10), backgroundColor: '#00b4d8', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#f8f9fa' } } },
                scales: {
                    x: { ticks: { color: '#a0aec0' } },
                    y: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });

        // Biểu đồ Radar điểm số ESG
        this.createOrUpdateChart('chart-esg-radar', {
            type: 'radar',
            data: {
                labels: radarLabels,
                datasets: [{
                    label: 'Điểm số ESG trung bình',
                    data: radarValues,
                    backgroundColor: 'rgba(82, 183, 136, 0.2)',
                    borderColor: '#52b788',
                    pointBackgroundColor: '#52b788',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#a0aec0', font: { family: 'Plus Jakarta Sans', size: 11 } },
                        ticks: { color: '#a0aec0', backdropColor: 'transparent', stepSize: 20 },
                        suggestedMin: 50, suggestedMax: 100
                    }
                }
            }
        });
    }

    renderBlockchainTxList(txList) {
        const container = document.getElementById('blockchain-tx-list');
        if (!container) return;
        container.innerHTML = '';
        
        if (!txList || txList.length === 0) {
            container.innerHTML = '<p class="text-muted text-center" style="grid-column: span 3; padding: 20px;">Không có dữ liệu xác thực</p>';
            return;
        }
        
        txList.slice(0, 8).forEach(tx => {
            const item = document.createElement('div');
            item.className = 'blockchain-tx-item';
            
            const shortHash = tx.Blockchain_Hash ? (tx.Blockchain_Hash.substring(0, 8) + '...' + tx.Blockchain_Hash.substring(tx.Blockchain_Hash.length - 6)) : '0x...';
            const timeStr = tx.Verification_Time ? (tx.Verification_Time.split(' ')[1] || tx.Verification_Time) : '';
            const dateStr = tx.Verification_Time ? tx.Verification_Time.split(' ')[0] : '';
            
            item.innerHTML = `
                <div class="tx-header">
                    <span class="tx-hash" title="${tx.Blockchain_Hash || ''}"><i class="fa-solid fa-link"></i> ${shortHash}</span>
                    <span class="badge ${tx.Traceability_Level.includes('Full') ? 'admin' : ''}" style="font-size: 0.65rem; padding: 3px 8px;">${tx.Traceability_Level}</span>
                </div>
                <div class="tx-details">
                    <span>Mã lô: <strong>${tx.Production_ID}</strong></span>
                    <span class="tx-time" title="Mốc xác nhận"><i class="fa-solid fa-clock"></i> ${timeStr} (${dateStr})</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderFinanceTable(productionList) {
        const tbody = document.getElementById('table-finance-log-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!productionList || productionList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có dữ liệu</td></tr>';
            return;
        }

        productionList.slice(0, 15).forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.Production_ID}</strong></td>
                <td>${p.Farm_ID || 'FM001'}</td>
                <td>${p.Date || '2025-12-15'}</td>
                <td>${p.Crop || 'Sầu riêng'}</td>
                <td>${p.Quantity_Ton ? p.Quantity_Ton.toLocaleString('vi-VN') : 0}</td>
                <td>${p.Revenue_VND ? this.formatVND(p.Revenue_VND) : '0 ₫'}</td>
                <td>${p.Cost_VND ? this.formatVND(p.Cost_VND) : '0 ₫'}</td>
                <td class="text-success" style="font-weight:700;">${p.Profit_VND ? this.formatVND(p.Profit_VND) : '0 ₫'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderYieldTable(farmersList, farmsList) {
        const tbody = document.getElementById('table-yield-farmers-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!farmersList || farmersList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có dữ liệu</td></tr>';
            return;
        }

        farmersList.slice(0, 15).forEach(f => {
            const farm = farmsList.find(farmEl => farmEl.Farmer_ID === f.Farmer_ID) || {};
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${f.Farmer_ID}</strong></td>
                <td>${f.Farmer_Name || 'Nông hộ'}</td>
                <td>${f.Province || 'Đắk Lắk'}</td>
                <td>${f.Crop || 'Sầu riêng'}</td>
                <td>${f.Area_Ha || 0} Ha</td>
                <td>${f.Revenue_Million_VND ? f.Revenue_Million_VND.toLocaleString('vi-VN') : 0} Tr ₫</td>
                <td><span class="table-badge ${f.IoT_Device === 'Yes' ? 'yes' : 'no'}">${f.IoT_Device === 'Yes' ? 'Đã lắp' : 'Không'}</span></td>
                <td><span class="table-badge ${f.Blockchain === 'Yes' ? 'yes' : 'no'}">${f.Blockchain === 'Yes' ? 'Xác thực' : 'Không'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderWeatherTable(weatherList) {
        const tbody = document.getElementById('table-weather-log-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!weatherList || weatherList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có dữ liệu</td></tr>';
            return;
        }

        weatherList.slice(0, 15).forEach(w => {
            const tr = document.createElement('tr');
            const alertClass = w.Weather_Alert && w.Weather_Alert !== 'None' ? 'table-badge cancelled' : 'text-muted';
            const riskClass = w.Disease_Risk === 'High' ? 'completed' : (w.Disease_Risk === 'Medium' ? 'medium' : 'low');
            tr.innerHTML = `
                <td><strong>${w.Weather_ID}</strong></td>
                <td>${w.Farm_ID}</td>
                <td>${w.Date}</td>
                <td>${w.Temperature_C}°C</td>
                <td>${w.Humidity_Percent || w['Humidity_%'] || 60}%</td>
                <td>${w.Rainfall_mm || 0} mm</td>
                <td><span class="table-badge ${riskClass}">${w.Disease_Risk || 'Low'}</span></td>
                <td><span class="${alertClass}">${w.Weather_Alert || 'None'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderMarketplaceTable(ordersList) {
        const tbody = document.getElementById('table-marketplace-orders-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!ordersList || ordersList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Không có dữ liệu</td></tr>';
            return;
        }

        ordersList.slice(0, 15).forEach(o => {
            const tr = document.createElement('tr');
            const statusClass = o.Order_Status === 'Completed' ? 'completed' : (o.Order_Status === 'Processing' ? 'processing' : 'cancelled');
            tr.innerHTML = `
                <td><strong>${o.Order_ID}</strong></td>
                <td>${o.Production_ID}</td>
                <td>${o.Buyer_Name || 'Doanh nghiệp'}</td>
                <td>${o.Crop}</td>
                <td>${o.Quantity_Ton} Tấn</td>
                <td>${o.Revenue_VND ? this.formatVND(o.Revenue_VND) : '0 ₫'}</td>
                <td>${o.Destination_Country || 'Việt Nam'}</td>
                <td>${o.Logistics_Provider || 'Nội bộ'}</td>
                <td><span class="table-badge ${statusClass}">${o.Order_Status}</span></td>
                <td class="text-gold" style="font-weight:700;"><i class="fa-solid fa-star"></i> ${o.Customer_Rating || ''}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderEsgTable(esgList) {
        const tbody = document.getElementById('table-esg-log-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!esgList || esgList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Không có dữ liệu</td></tr>';
            return;
        }

        esgList.slice(0, 15).forEach(e => {
            const tr = document.createElement('tr');
            const scoreClass = e.ESG_Score >= 85 ? 'text-success' : (e.ESG_Score >= 75 ? 'text-gold' : 'text-danger');
            tr.innerHTML = `
                <td><strong>${e.ESG_ID}</strong></td>
                <td>${e.Farm_ID}</td>
                <td>${e.Production_ID}</td>
                <td class="text-success">${e.Carbon_Reduction_kgCO2 ? e.Carbon_Reduction_kgCO2.toLocaleString('vi-VN') : 0} kg</td>
                <td class="text-info">${e.Water_Saving_m3 ? e.Water_Saving_m3.toLocaleString('vi-VN') : 0} m³</td>
                <td class="${scoreClass}" style="font-weight:700;">${e.ESG_Score}</td>
                <td style="font-weight:700; color:var(--primary);">${e.Sustainability_Index || ''}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// ==========================================
// 3. CONTROLLER (Điều hướng & Xử lý sự kiện)
// ==========================================
class AgriSmartController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.currentTab = 'tab-finance';
    }

    init() {
        // Kiểm tra phiên đăng nhập hiện tại
        const user = this.model.checkActiveSession();
        if (user) {
            this.handleSuccessfulLogin(user);
        }
    }

    // Các trình xử lý sự kiện giao diện
    async handleSuccessfulLogin(user) {
        this.view.switchView('dashboard');
        this.view.updateUserProfile(user);
        
        this.view.showToast(`Chào mừng ${user.username} đã quay trở lại.`);
        
        // Tải dữ liệu CSV từ model
        await this.model.loadCSVData();
        this.view.updateDataStatusBadge(!this.model.isUsingMockData);
        
        // Tính toán KPI và hiển thị lên giao diện
        const kpis = this.model.getKPIs();
        this.view.updateKPIs(kpis);
        
        // Điều hướng sang Tab mặc định
        this.switchTab('tab-finance');
    }

    login(username, password) {
        try {
            const user = this.model.authenticateUser(username, password);
            this.handleSuccessfulLogin(user);
        } catch (error) {
            this.view.showToast(error.message, 'danger');
        }
    }

    register(username, email, password, role) {
        try {
            this.model.registerUser(username, email, password, role);
            this.view.showToast('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');
            
            // Auto login after successful registration
            const user = this.model.authenticateUser(username, password);
            this.handleSuccessfulLogin(user);
            
            // Reset register form for next usage
            const regForm = document.getElementById('register-form');
            if (regForm) regForm.reset();
        } catch (error) {
            this.view.showToast(error.message, 'danger');
        }
    }

    logout() {
        this.model.clearSession();
        this.view.switchView('auth');
        this.view.showToast('Đã đăng xuất khỏi hệ thống.');
    }

    // Trình điều hướng Tabs trên Dashboard
    switchTab(tabId) {
        this.currentTab = tabId;
        const isFarmerRole = this.model.currentUser && this.model.currentUser.role === 'farmer';
        const targetProvince = isFarmerRole ? 'Lâm Đồng' : null;
        
        let filteredFarmers = this.model.data.farmers;
        let filteredProduction = this.model.data.production;
        let filteredFarms = this.model.data.farms;
        
        if (targetProvince) {
            filteredFarmers = this.model.data.farmers.filter(f => f.Province === targetProvince);
            filteredFarms = this.model.data.farms.filter(f => f.Province === targetProvince);
            const farmerIds = new Set(filteredFarmers.map(f => f.Farmer_ID));
            filteredProduction = this.model.data.production.filter(p => farmerIds.has(p.Farmer_ID));
        }

        const farmIds = new Set(filteredFarms.map(f => f.Farm_ID));
        const prodIds = new Set(filteredProduction.map(p => p.Production_ID));

        let filteredWeather = (this.model.data.weather || []).filter(w => farmIds.has(w.Farm_ID));
        let filteredOrders = (this.model.data.marketplace || []).filter(o => prodIds.has(o.Production_ID));
        let filteredEsg = (this.model.data.esg || []).filter(e => farmIds.has(e.Farm_ID));

        // 1. Chuyển đổi View Tab
        const panes = document.querySelectorAll('.tab-pane');
        panes.forEach(pane => pane.classList.remove('active'));
        const targetPane = document.getElementById(tabId);
        if (targetPane) targetPane.classList.add('active');
        
        // Update Sidebar navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        const targetNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        
        if (targetNavItem) {
            targetNavItem.classList.add('active');
            const spanEl = targetNavItem.querySelector('span');
            if (spanEl) {
                const tabTitle = spanEl.textContent;
                const titleEl = document.getElementById('current-tab-title');
                if (titleEl) titleEl.textContent = tabTitle;
            }
        }

        // Update PWA Horizontal Category buttons
        const categoryBtns = document.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => btn.classList.remove('active'));
        const targetCatBtn = document.querySelector(`.category-btn[data-tab-btn="${tabId}"]`);
        if (targetCatBtn) targetCatBtn.classList.add('active');

        // Update PWA Mobile Bottom Nav items
        const bottomNavItems = document.querySelectorAll('.pwa-nav-item');
        bottomNavItems.forEach(item => item.classList.remove('active'));
        const targetBottomItem = document.querySelector(`.pwa-nav-item[data-nav-btn="${tabId}"]`);
        if (targetBottomItem) targetBottomItem.classList.add('active');

        // 2. Chuẩn bị dữ liệu từ Model gửi sang View để vẽ Biểu đồ
        if (tabId === 'tab-finance') {
            const monthlyRevenue = Array(12).fill(0);
            const monthlyCost = Array(12).fill(0);
            const provinceProfits = {};

            if (this.model.data.monthlySummary && this.model.data.monthlySummary.length > 0 && !targetProvince) {
                this.model.data.monthlySummary.forEach(row => {
                    if (row.Month) {
                        const monthIdx = parseInt(row.Month.split('-')[1]) - 1;
                        if (monthIdx >= 0 && monthIdx < 12) {
                            monthlyRevenue[monthIdx] = row.Revenue_VND || 0;
                            monthlyCost[monthIdx] = row.Cost_VND || 0;
                        }
                    }
                });
            } else {
                filteredProduction.forEach(p => {
                    if (p.Date) {
                        const monthIdx = parseInt(p.Date.split('-')[1]) - 1;
                        if (monthIdx >= 0 && monthIdx < 12) {
                            monthlyRevenue[monthIdx] += (p.Revenue_VND || (p.Revenue_Million_VND * 1000000) || 0);
                            monthlyCost[monthIdx] += (p.Cost_VND || (p.Cost_Million_VND * 1000000) || 0);
                        }
                    }
                });
            }

            filteredFarmers.forEach(f => {
                const prov = f.Province || 'Khác';
                provinceProfits[prov] = (provinceProfits[prov] || 0) + (f.Profit_Million_VND || 0);
            });

            this.view.renderFinanceCharts(monthlyRevenue, monthlyCost, provinceProfits);
            this.view.renderFinanceTable(filteredProduction);
        } 
        
        else if (tabId === 'tab-yield') {
            const cropQty = {};
            filteredProduction.forEach(p => {
                const crop = p.Crop || 'Khác';
                cropQty[crop] = (cropQty[crop] || 0) + (p.Quantity_Ton || 0);
            });

            const cropYieldSum = {};
            const cropYieldCount = {};
            filteredFarms.forEach(f => {
                if (f.Area_Ha > 0 && f.Yield_Ton > 0) {
                    cropYieldSum[f.Crop] = (cropYieldSum[f.Crop] || 0) + (f.Yield_Ton / f.Area_Ha);
                    cropYieldCount[f.Crop] = (cropYieldCount[f.Crop] || 0) + 1;
                }
            });

            const cropYieldLabels = Object.keys(cropYieldSum).length ? Object.keys(cropYieldSum) : ['Lúa', 'Cà phê', 'Sầu riêng', 'Thanh long', 'Xoài'];
            const cropYieldAvgs = Object.keys(cropYieldSum).length 
                ? cropYieldLabels.map(c => Number((cropYieldSum[c] / cropYieldCount[c]).toFixed(2))) 
                : [7.2, 2.1, 12.5, 8.8, 6.4];

            this.view.renderYieldCharts(cropQty, cropYieldLabels, cropYieldAvgs);
            this.view.renderYieldTable(filteredFarmers, filteredFarms);
        }
 
        else if (tabId === 'tab-ai-weather') {
            let humidityData = [62, 60, 57, 54, 52, 55, 58, 61, 63];
            let tempData = [24, 26, 29, 31, 32, 30, 28, 26, 25];
            let weatherLabels = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
            
            if (filteredWeather && filteredWeather.length > 0) {
                // Sắp xếp theo ngày tăng dần
                filteredWeather.sort((a, b) => new Date(a.Date) - new Date(b.Date));
                const last9 = filteredWeather.slice(-9);
                weatherLabels = last9.map(w => {
                    if (!w.Date) return '';
                    const parts = w.Date.split('-');
                    return `${parts[2]}/${parts[1]}`;
                });
                humidityData = last9.map(w => w['Humidity_%'] || w.Humidity_Percent || w.Humidity || 60);
                tempData = last9.map(w => w.Temperature_C || w.Temperature || 25);
            }

            let highRisk = 0, medRisk = 0, lowRisk = 0;
            if (filteredWeather && filteredWeather.length > 0) {
                filteredWeather.forEach(w => {
                    if (w.Disease_Risk === 'High') highRisk++;
                    else if (w.Disease_Risk === 'Medium') medRisk++;
                    else lowRisk++;
                });
            } else {
                filteredProduction.forEach(p => {
                    if (p.Disease_Risk === 'High') highRisk++;
                    else if (p.Disease_Risk === 'Medium') medRisk++;
                    else lowRisk++;
                });
            }
            if (highRisk === 0 && medRisk === 0) {
                highRisk = 12; medRisk = 32; lowRisk = 56;
            }

            const errorTimeline = [7.2, 6.8, 8.1, 5.4, 5.2, 6.0, 4.5, 3.8, 3.5, 3.0];
            this.view.renderWeatherCharts(weatherLabels, humidityData, tempData, highRisk, medRisk, lowRisk, errorTimeline);
            this.view.renderWeatherTable(filteredWeather);
        }
 
        else if (tabId === 'tab-supply') {
            const marketVolume = {};
            const carrierShares = {};

            if (filteredOrders && filteredOrders.length > 0) {
                filteredOrders.forEach(o => {
                    const country = o.Destination_Country || 'Việt Nam';
                    marketVolume[country] = (marketVolume[country] || 0) + (o.Quantity_Ton || 0);
                    
                    const logistics = o.Logistics_Provider || 'Nội bộ';
                    carrierShares[logistics] = (carrierShares[logistics] || 0) + (o.Quantity_Ton || 0);
                });
            } else {
                filteredProduction.forEach(p => {
                    const country = p.Export_Market === 'USA' ? 'Hoa Kỳ' : (p.Export_Market === 'Japan' ? 'Nhật Bản' : (p.Export_Market === 'Korea' ? 'Hàn Quốc' : p.Export_Market || 'Việt Nam'));
                    marketVolume[country] = (marketVolume[country] || 0) + (p.Quantity_Ton || 1);
                    
                    const logistics = p.Logistics === 'DHL' ? 'DHL Express' : (p.Logistics === 'FedEx' ? 'FedEx' : p.Logistics || 'Nội bộ');
                    carrierShares[logistics] = (carrierShares[logistics] || 0) + (p.Quantity_Ton || 1);
                });
            }

            const markets = Object.keys(marketVolume).length ? Object.keys(marketVolume) : ['Hoa Kỳ', 'Nhật Bản', 'Hàn Quốc', 'Singapore', 'Đức', 'Úc'];
            const marketValues = markets.map(m => Math.round(marketVolume[m] || (Math.random() * 300 + 100)));

            const carrierLabels = Object.keys(carrierShares).length ? Object.keys(carrierShares) : ['DHL Express', 'FedEx', 'Viettel Post', 'VNPost'];
            const carrierValues = carrierLabels.map(c => Math.round(carrierShares[c] || (Math.random() * 500 + 100)));

            this.view.renderSupplyCharts(markets, marketValues, carrierLabels, carrierValues);

            // Render Blockchain Verified Transaction Log
            const filteredTx = (this.model.data.blockchain || []).filter(tx => prodIds.has(tx.Production_ID));
            this.view.renderBlockchainTxList(filteredTx.length ? filteredTx : this.model.data.blockchain);
            this.view.renderMarketplaceTable(filteredOrders);
        }
 
        else if (tabId === 'tab-esg') {
            const provCarbon = { 'Đắk Lắk': 0, 'Tiền Giang': 0, 'Đồng Tháp': 0, 'An Giang': 0, 'Lâm Đồng': 0 };
            const provWater = { 'Đắk Lắk': 0, 'Tiền Giang': 0, 'Đồng Tháp': 0, 'An Giang': 0, 'Lâm Đồng': 0 };
            const esgScores = { 'Đắk Lắk': [], 'Tiền Giang': [], 'Đồng Tháp': [], 'An Giang': [], 'Lâm Đồng': [] };

            if (filteredEsg && filteredEsg.length > 0) {
                filteredEsg.forEach(e => {
                    const farm = filteredFarms.find(f => f.Farm_ID === e.Farm_ID);
                    if (farm && provCarbon[farm.Province] !== undefined) {
                        provCarbon[farm.Province] += (e.Carbon_Reduction_kgCO2 || 0) / 1000;
                        provWater[farm.Province] += (e.Water_Saving_m3 || 0);
                        if (e.ESG_Score) {
                            esgScores[farm.Province].push(e.ESG_Score);
                        }
                    }
                });
            } else {
                filteredFarms.forEach(f => {
                    if (provCarbon[f.Province] !== undefined) {
                        provCarbon[f.Province] += Number((f.Area_Ha * 2.3).toFixed(1));
                        provWater[f.Province] += Number((f.Area_Ha * 22).toFixed(1));
                    }
                });
                filteredProduction.forEach(p => {
                    const prov = this.model.data.farms.find(f => f.Farm_ID === p.Farm_ID)?.Province;
                    if (prov && esgScores[prov]) {
                        esgScores[prov].push(p.ESG_Score || 80);
                    }
                });
            }

            const provLabels = Object.keys(provCarbon);
            const carbonVals = provLabels.map(p => Math.round(provCarbon[p] || (Math.random() * 100 + 50)));
            const waterVals = provLabels.map(p => Math.round(provWater[p] || (Math.random() * 1000 + 400)));

            const radarLabels = Object.keys(esgScores);
            const radarValues = radarLabels.map(p => {
                const scores = esgScores[p];
                if (!scores || !scores.length) return Math.floor(Math.random() * 10 + 75);
                return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            });

            this.view.renderEsgCharts(provLabels, carbonVals, waterVals, radarLabels, radarValues);
            this.view.renderEsgTable(filteredEsg);
        }

        this.updateDynamicBackgrounds(tabId, filteredFarmers, filteredProduction, filteredFarms, filteredWeather, filteredOrders, filteredEsg);
    }

    updateDynamicBackgrounds(tabId, filteredFarmers, filteredProduction, filteredFarms, filteredWeather, filteredOrders, filteredEsg) {
        const provinceImages = {
            'Đắk Lắk': 'dak_lak_farm.jpg',
            'Lâm Đồng': 'lam_dong_farm.jpg',
            'Tiền Giang': 'tien_giang_farm.jpg',
            'Đồng Tháp': 'dong_thap_farm.jpg',
            'An Giang': 'an_giang_farm.jpg'
        };
        const cropImages = {
            'Sầu riêng': 'crop_durian.jpg',
            'Lúa': 'crop_rice.jpg',
            'Cà phê': 'crop_coffee.jpg',
            'Thanh long': 'crop_dragonfruit.jpg',
            'Xoài': 'crop_mango.jpg'
        };

        const farmProvinceMap = {};
        if (this.model.data.farms) {
            this.model.data.farms.forEach(f => {
                if (f.Farm_ID && f.Province) {
                    farmProvinceMap[f.Farm_ID] = f.Province;
                }
            });
        }

        const provinceProfits = {};
        filteredFarmers.forEach(f => {
            const prov = f.Province;
            if (prov && prov !== 'Khác') {
                provinceProfits[prov] = (provinceProfits[prov] || 0) + (Number(f.Profit_Million_VND) || 0);
            }
        });
        let highestProfitProvince = 'Đắk Lắk';
        let maxProvinceProfit = -Infinity;
        for (const prov in provinceProfits) {
            if (provinceProfits[prov] > maxProvinceProfit) {
                maxProvinceProfit = provinceProfits[prov];
                highestProfitProvince = prov;
            }
        }
        const provinceImg = provinceImages[highestProfitProvince] || 'dak_lak_farm.jpg';

        const cropProfits = {};
        filteredProduction.forEach(p => {
            const crop = p.Crop;
            if (crop) {
                cropProfits[crop] = (cropProfits[crop] || 0) + (Number(p.Profit_VND) || 0);
            }
        });
        let highestProfitCrop = 'Sầu riêng';
        let maxCropProfit = -Infinity;
        for (const crop in cropProfits) {
            if (cropProfits[crop] > maxCropProfit) {
                maxCropProfit = cropProfits[crop];
                highestProfitCrop = crop;
            }
        }
        const cropImg = cropImages[highestProfitCrop] || 'crop_durian.jpg';

        const cropQuantities = {};
        filteredProduction.forEach(p => {
            const crop = p.Crop;
            if (crop) {
                cropQuantities[crop] = (cropQuantities[crop] || 0) + (Number(p.Quantity_Ton) || 0);
            }
        });
        let highestQtyCrop = 'Sầu riêng';
        let maxQty = -Infinity;
        for (const crop in cropQuantities) {
            if (cropQuantities[crop] > maxQty) {
                maxQty = cropQuantities[crop];
                highestQtyCrop = crop;
            }
        }
        const qtyCropImg = cropImages[highestQtyCrop] || 'crop_durian.jpg';

        const cropYieldSum = {};
        const cropYieldCount = {};
        filteredFarms.forEach(f => {
            if (f.Area_Ha > 0 && f.Yield_Ton > 0 && f.Crop) {
                cropYieldSum[f.Crop] = (cropYieldSum[f.Crop] || 0) + (f.Yield_Ton / f.Area_Ha);
                cropYieldCount[f.Crop] = (cropYieldCount[f.Crop] || 0) + 1;
            }
        });
        let highestYieldCrop = 'Sầu riêng';
        let maxAvgYield = -Infinity;
        for (const crop in cropYieldSum) {
            const avg = cropYieldSum[crop] / cropYieldCount[crop];
            if (avg > maxAvgYield) {
                maxAvgYield = avg;
                highestYieldCrop = crop;
            }
        }
        const yieldCropImg = cropImages[highestYieldCrop] || 'crop_rice.jpg';

        const provAreas = {};
        filteredFarms.forEach(f => {
            const prov = f.Province;
            if (prov) {
                provAreas[prov] = (provAreas[prov] || 0) + (Number(f.Area_Ha) || 0);
            }
        });
        let highestAreaProv = 'Lâm Đồng';
        let maxArea = -Infinity;
        for (const prov in provAreas) {
            if (provAreas[prov] > maxArea) {
                maxArea = provAreas[prov];
                highestAreaProv = prov;
            }
        }
        const areaProvImg = provinceImages[highestAreaProv] || 'smart_farm_banner.jpg';

        const weatherProvCount = {};
        filteredWeather.forEach(w => {
            const prov = farmProvinceMap[w.Farm_ID];
            if (prov) {
                weatherProvCount[prov] = (weatherProvCount[prov] || 0) + 1;
            }
        });
        let activeWeatherProv = 'Lâm Đồng';
        let maxWCount = -Infinity;
        for (const prov in weatherProvCount) {
            if (weatherProvCount[prov] > maxWCount) {
                maxWCount = weatherProvCount[prov];
                activeWeatherProv = prov;
            }
        }
        const weatherProvImg = provinceImages[activeWeatherProv] || 'ai_weather_station.jpg';

        const esgProvCarbon = {};
        filteredEsg.forEach(e => {
            const prov = farmProvinceMap[e.Farm_ID];
            if (prov) {
                esgProvCarbon[prov] = (esgProvCarbon[prov] || 0) + (Number(e.Carbon_Reduction_kgCO2) || 0);
            }
        });
        let bestCarbonProv = 'Đắk Lắk';
        let maxCarbon = -Infinity;
        for (const prov in esgProvCarbon) {
            if (esgProvCarbon[prov] > maxCarbon) {
                maxCarbon = esgProvCarbon[prov];
                bestCarbonProv = prov;
            }
        }
        const carbonProvImg = provinceImages[bestCarbonProv] || 'esg_eco_farming.jpg';

        const esgProvScore = {};
        const esgProvCount = {};
        filteredEsg.forEach(e => {
            const prov = farmProvinceMap[e.Farm_ID];
            if (prov && e.ESG_Score) {
                esgProvScore[prov] = (esgProvScore[prov] || 0) + Number(e.ESG_Score);
                esgProvCount[prov] = (esgProvCount[prov] || 0) + 1;
            }
        });
        let bestEsgProv = 'Lâm Đồng';
        let maxEsgScore = -Infinity;
        for (const prov in esgProvScore) {
            const avg = esgProvScore[prov] / esgProvCount[prov];
            if (avg > maxEsgScore) {
                maxEsgScore = avg;
                bestEsgProv = prov;
            }
        }
        const esgProvImg = provinceImages[bestEsgProv] || 'esg_eco_farming.jpg';

        let latestTxCrop = 'Sầu riêng';
        if (filteredProduction.length > 0) {
            latestTxCrop = filteredProduction[filteredProduction.length - 1].Crop || 'Sầu riêng';
        }
        const txCropImg = cropImages[latestTxCrop] || 'crop_durian.jpg';

        const updateImg = (id, src) => {
            const el = document.getElementById(id);
            if (el) el.src = src;
        };

        if (tabId === 'tab-finance') {
            updateImg('bg-card-revenue-progress', 'money_finance.jpg');
            updateImg('bg-card-profit-province', provinceImg);
            updateImg('bg-card-finance-log', cropImg);
        } else if (tabId === 'tab-yield') {
            updateImg('bg-card-crop-pie', qtyCropImg);
            updateImg('bg-card-yield-bar', yieldCropImg);
            updateImg('bg-card-yield-table', areaProvImg);
        } else if (tabId === 'tab-ai-weather') {
            updateImg('bg-card-weather-line', weatherProvImg);
            updateImg('bg-card-ai-risk', 'ai_weather_station.jpg');
            updateImg('bg-card-ai-error', qtyCropImg);
            updateImg('bg-card-weather-table', weatherProvImg);
        } else if (tabId === 'tab-supply') {
            updateImg('bg-card-export-bar', qtyCropImg);
            updateImg('bg-card-logistics-pie', 'logistics_export.jpg');
            updateImg('bg-card-blockchain-tx', txCropImg);
            updateImg('bg-card-marketplace-table', cropImg);
        } else if (tabId === 'tab-esg') {
            updateImg('bg-card-esg-bar', carbonProvImg);
            updateImg('bg-card-esg-radar', esgProvImg);
            updateImg('bg-card-esg-table', esgProvImg);
        }
    }
}

// ==========================================
// 4. KHỞI TẠO HỆ THỐNG (Application Bootstrap)
// ==========================================
const appModel = new AgriSmartModel();
const appView = new AgriSmartView();
const appController = new AgriSmartController(appModel, appView);

// Hàm đổi tab giữa Đăng ký và Đăng nhập
function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(btn => btn.classList.remove('active'));
    forms.forEach(form => form.classList.remove('active'));
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

// Đăng ký các hàm global để gọi trực tiếp từ HTML onclick
window.switchAuthTab = (tab) => switchAuthTab(tab); 
window.switchDashboardTab = (tabId) => appController.switchTab(tabId);
window.handleLogout = () => appController.logout();

window.handleLogin = (event) => {
    event.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    appController.login(u, p);
};

window.handleRegister = (event) => {
    event.preventDefault();
    const u = document.getElementById('reg-username').value.trim();
    const e = document.getElementById('reg-email').value.trim();
    const p = document.getElementById('reg-password').value;
    const r = document.getElementById('reg-role').value;
    appController.register(u, e, p, r);
};

// Bootstrap app safely checking document readyState
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        appController.init();
    });
} else {
    appController.init();
}

// =============================================================================
// DATA EXPLORER MODULE
// =============================================================================
const DataExplorer = (() => {
    const DATASETS = [
        { id: 'farmers',   name: '1. Nông hộ (Farmers)',        icon: 'fa-users',          desc: 'Cơ sở dữ liệu nông hộ liên kết hệ thống' },
        { id: 'farms',     name: '2. Trang trại (Farms)',        icon: 'fa-tractor',        desc: 'Giám sát thông số kỹ thuật trang trại' },
        { id: 'production',name: '3. Sản lượng (Production)',    icon: 'fa-wheat-awn',      desc: 'Dữ liệu thu hoạch và sản xuất' },
        { id: 'blockchain',name: '4. Blockchain',                icon: 'fa-cube',           desc: 'Giao dịch xác thực chuỗi khối' },
        { id: 'esg',       name: '5. ESG & Bền vững',            icon: 'fa-seedling',       desc: 'Chỉ số phát thải carbon và ESG' },
        { id: 'marketplace',name:'6. Thị trường (Marketplace)',  icon: 'fa-store',          desc: 'Đơn hàng và giao dịch xuất khẩu' },
        { id: 'weather',   name: '7. Thời tiết (Weather)',        icon: 'fa-cloud-sun-rain', desc: 'Dữ liệu cảm biến khí tượng IoT' },
        { id: 'monthlySummary', name: '8. Báo cáo Tháng',       icon: 'fa-chart-bar',      desc: 'Tổng hợp phân tích theo tháng' },
    ];

    let currentDatasetId = 'farmers';
    let currentPage = 1;
    const PAGE_SIZE = 10;
    let searchQuery = '';
    let sortKey = null;
    let sortDir = 'asc';

    function getModel() {
        return appModel;
    }

    function getDataset(id) {
        const m = getModel();
        if (!m) return [];
        const map = {
            farmers: m.data.farmers,
            farms: m.data.farms,
            production: m.data.production,
            blockchain: m.data.blockchain,
            esg: m.data.esg,
            marketplace: m.data.marketplace,
            weather: m.data.weather,
            monthlySummary: m.data.monthlySummary,
        };
        return map[id] || [];
    }

    function buildSidebar() {
        const list = document.getElementById('explorer-dataset-list');
        if (!list) return;
        list.innerHTML = DATASETS.map(ds => `
            <button class="explorer-cat-btn ${ds.id === currentDatasetId ? 'active' : ''}" 
                    onclick="DataExplorer.selectDataset('${ds.id}')">
                <i class="fa-solid ${ds.icon}"></i>
                <span>${ds.name}</span>
            </button>
        `).join('');
    }

    function getFilteredSorted(data) {
        let rows = [...data];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
        }
        if (sortKey) {
            rows.sort((a, b) => {
                const va = a[sortKey], vb = b[sortKey];
                if (va == null) return 1;
                if (vb == null) return -1;
                const na = typeof va === 'number', nb = typeof vb === 'number';
                if (na && nb) return sortDir === 'asc' ? va - vb : vb - va;
                return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
            });
        }
        return rows;
    }

    function renderTable(data) {
        if (!data.length) {
            document.getElementById('explorer-thead').innerHTML = '';
            document.getElementById('explorer-tbody').innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text-muted);">Không có dữ liệu</td></tr>';
            return;
        }
        const keys = Object.keys(data[0]);
        // Header
        document.getElementById('explorer-thead').innerHTML = `<tr>${keys.map(k => `
            <th style="cursor:pointer; user-select:none; white-space:nowrap;" onclick="DataExplorer.sortBy('${k}')">
                ${k} ${sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>`).join('')}</tr>`;

        const start = (currentPage - 1) * PAGE_SIZE;
        const pageData = data.slice(start, start + PAGE_SIZE);
        document.getElementById('explorer-tbody').innerHTML = pageData.map(row => `
            <tr>${keys.map(k => {
                const v = row[k];
                if (typeof v === 'boolean') return `<td><span style="padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${v ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)'};color:${v ? 'var(--success)' : 'var(--danger)'}">${v ? 'Có' : 'Không'}</span></td>`;
                if (typeof v === 'number' && (String(k).toLowerCase().includes('vnd') || String(k).toLowerCase().includes('revenue') || String(k).toLowerCase().includes('profit') || String(k).toLowerCase().includes('cost')))
                    return `<td style="font-family:'Courier New',monospace;font-weight:700;color:var(--info);font-size:0.8rem;">${Math.round(v).toLocaleString('vi-VN')}</td>`;
                return `<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v ?? '—'}</td>`;
            }).join('')}</tr>`).join('');
    }

    function renderPagination(total) {
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const el = document.getElementById('explorer-pagination');
        if (!el) return;
        if (totalPages <= 1) { el.innerHTML = `<span class="pagination-info">Tổng ${total} bản ghi</span>`; return; }
        
        let btns = '';
        for (let i = 1; i <= Math.min(totalPages, 7); i++) {
            btns += `<button class="page-btn ${i === currentPage ? 'active-page' : ''}" onclick="DataExplorer.goPage(${i})">${i}</button>`;
        }
        if (totalPages > 7) btns += `<span style="align-self:center;color:var(--text-muted)">...</span><button class="page-btn ${currentPage === totalPages ? 'active-page' : ''}" onclick="DataExplorer.goPage(${totalPages})">${totalPages}</button>`;
        
        el.innerHTML = `
            <span class="pagination-info">Trang ${currentPage}/${totalPages} · Tổng ${total} bản ghi</span>
            <div class="pagination-btns">
                <button class="page-btn" onclick="DataExplorer.goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>← Trước</button>
                ${btns}
                <button class="page-btn" onclick="DataExplorer.goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>Sau →</button>
            </div>`;
    }

    function computeStats(data) {
        if (!data.length) return {};
        const numericKeys = Object.keys(data[0]).filter(k => typeof data[0][k] === 'number');
        const stats = {};
        numericKeys.forEach(k => {
            const vals = data.map(r => r[k]).filter(v => v != null && !isNaN(v));
            if (!vals.length) return;
            const n = vals.length;
            const sum = vals.reduce((a, b) => a + b, 0);
            const mean = sum / n;
            const sorted = [...vals].sort((a, b) => a - b);
            const median = n % 2 === 0 ? (sorted[n/2-1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
            const variance = vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n;
            stats[k] = { count: n, mean, median, min: sorted[0], max: sorted[n-1], stdDev: Math.sqrt(variance) };
        });
        return stats;
    }

    function renderStats(stats) {
        const grid = document.getElementById('explorer-stats-grid');
        if (!grid) return;
        const entries = Object.entries(stats);
        if (!entries.length) { grid.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Không có biến số nào để thống kê.</p>'; return; }

        const isVND = k => k.toLowerCase().includes('vnd') || k.toLowerCase().includes('revenue') || k.toLowerCase().includes('profit') || k.toLowerCase().includes('cost');
        const fmt = (k, v) => {
            if (isVND(k)) return (v / 1e6).toFixed(2) + ' Tr';
            return Number(v.toFixed(3)).toLocaleString('vi-VN');
        };

        grid.innerHTML = entries.slice(0, 12).map(([k, s]) => `
            <div class="stat-card">
                <h4 title="${k}">${k}</h4>
                <div class="stat-row"><span>N (mẫu):</span><span>${s.count}</span></div>
                <div class="stat-row highlight"><span>Trung bình (μ):</span><span>${fmt(k, s.mean)}</span></div>
                <div class="stat-row"><span>Trung vị:</span><span>${fmt(k, s.median)}</span></div>
                <div class="stat-row"><span>Min:</span><span>${fmt(k, s.min)}</span></div>
                <div class="stat-row"><span>Max:</span><span>${fmt(k, s.max)}</span></div>
                <div class="stat-row"><span>Std (σ):</span><span>${fmt(k, s.stdDev)}</span></div>
            </div>`).join('');
    }

    function render() {
        buildSidebar();
        const raw = getDataset(currentDatasetId);
        const ds = DATASETS.find(d => d.id === currentDatasetId);

        document.getElementById('explorer-dataset-name').textContent = ds?.name || '';
        document.getElementById('explorer-dataset-desc').textContent = `${ds?.desc || ''} — Tổng ${raw.length} bản ghi`;

        // Update counter badge
        const badge = document.getElementById('explorer-record-count');
        if (badge) badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${raw.length.toLocaleString('vi-VN')} bản ghi</span>`;

        const filtered = getFilteredSorted(raw);
        renderTable(filtered);
        renderPagination(filtered.length);
        renderStats(computeStats(raw));
    }

    // Public API
    return {
        init() {
            render();
            const search = document.getElementById('explorer-search');
            if (search) {
                search.addEventListener('input', e => {
                    searchQuery = e.target.value;
                    currentPage = 1;
                    render();
                });
            }
        },
        selectDataset(id) {
            currentDatasetId = id;
            currentPage = 1;
            searchQuery = '';
            sortKey = null;
            const s = document.getElementById('explorer-search');
            if (s) s.value = '';
            render();
        },
        sortBy(key) {
            if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            else { sortKey = key; sortDir = 'asc'; }
            render();
        },
        goPage(p) {
            const data = getFilteredSorted(getDataset(currentDatasetId));
            const totalPages = Math.ceil(data.length / PAGE_SIZE);
            if (p < 1 || p > totalPages) return;
            currentPage = p;
            render();
        }
    };
})();
window.DataExplorer = DataExplorer;


// =============================================================================
// ML STUDIO MODULE
// =============================================================================
const MLStudio = (() => {
    let scalerType = 'minmax';
    let corrGroup = 'finance';
    let predictionChart = null;

    function getModel() { return appModel; }

    // --- Feature Scaling ---
    function applyMinMax(vals) {
        const mn = Math.min(...vals), mx = Math.max(...vals);
        return vals.map(v => mx === mn ? 0 : (v - mn) / (mx - mn));
    }
    function applyZScore(vals) {
        const n = vals.length;
        const mean = vals.reduce((a,b) => a+b, 0) / n;
        const std = Math.sqrt(vals.reduce((a,v) => a + Math.pow(v-mean,2), 0) / n) || 1;
        return vals.map(v => (v - mean) / std);
    }

    function renderScaling() {
        const m = getModel();
        if (!m) return;
        const prod = m.data.production.slice(0, 6);
        const raw = prod.map(p => ({ id: p.Production_ID, qty: p.Quantity_Ton, profit: p.Profit_VND }));

        const qtyVals = raw.map(r => r.qty);
        const profitVals = raw.map(r => r.profit);
        const scaleFn = scalerType === 'minmax' ? applyMinMax : applyZScore;
        const scaledQty = scaleFn(qtyVals);
        const scaledProfit = scaleFn(profitVals);

        const rawEl = document.getElementById('ml-raw-data');
        const scaledEl = document.getElementById('ml-scaled-data');
        if (!rawEl || !scaledEl) return;

        rawEl.innerHTML = raw.map(r => `
            <div class="scaling-row">
                <span>${r.id}</span>
                <span>${r.qty.toFixed(1)}T | ${(r.profit/1e6).toFixed(1)}Tr</span>
            </div>`).join('');

        scaledEl.innerHTML = raw.map((r, i) => `
            <div class="scaling-row">
                <span>${r.id}</span>
                <span>${scaledQty[i].toFixed(4)} | ${scaledProfit[i].toFixed(4)}</span>
            </div>`).join('');

        const desc = document.getElementById('ml-scaler-desc');
        if (desc) {
            desc.innerHTML = scalerType === 'minmax'
                ? '<i class="fa-solid fa-circle-info" style="color:var(--info)"></i> <span><strong>Min-Max Scaling:</strong> Công thức <code style="background:rgba(2,132,199,0.08);padding:1px 5px;border-radius:4px;">(x - min) / (max - min)</code> → đưa giá trị về khoảng [0, 1]. Phù hợp cho mạng nơ-ron, K-Means, KNN.</span>'
                : '<i class="fa-solid fa-circle-info" style="color:var(--info)"></i> <span><strong>Z-Score (Standard):</strong> Công thức <code style="background:rgba(2,132,199,0.08);padding:1px 5px;border-radius:4px;">(x - μ) / σ</code> → mean=0, std=1. Phù hợp cho Linear/Logistic Regression, PCA.</span>';
        }
    }

    // --- Label Encoding ---
    function renderEncoding() {
        const crops = ['Thanh long', 'Cà phê', 'Lúa', 'Xoài', 'Sầu riêng'];
        const el = document.getElementById('ml-encoding-list');
        if (!el) return;
        el.innerHTML = crops.map((c, i) => `
            <div class="encoding-row">
                <span class="enc-original">${c}</span>
                <span class="enc-arrow">➔</span>
                <span class="encoding-badge">${i}</span>
            </div>`).join('');
    }

    // --- Pearson Correlation ---
    function pearson(a, b) {
        const n = a.length;
        if (!n) return 0;
        const ma = a.reduce((x,y)=>x+y,0)/n, mb = b.reduce((x,y)=>x+y,0)/n;
        const num = a.reduce((s,v,i) => s + (v-ma)*(b[i]-mb), 0);
        const da = Math.sqrt(a.reduce((s,v)=>s+Math.pow(v-ma,2),0));
        const db = Math.sqrt(b.reduce((s,v)=>s+Math.pow(v-mb,2),0));
        return da*db === 0 ? 0 : num / (da*db);
    }

    function corrColor(v) {
        // positive: blue shades; negative: red shades; near 0: gray
        if (v >= 0.99) return { bg: '#1e40af', color: '#fff' };
        if (v >= 0.7)  return { bg: '#2563eb', color: '#fff' };
        if (v >= 0.4)  return { bg: '#93c5fd', color: '#1e40af' };
        if (v >= 0.1)  return { bg: '#dbeafe', color: '#1e40af' };
        if (v >= -0.1) return { bg: '#f3f4f6', color: '#6b7280' };
        if (v >= -0.4) return { bg: '#fecaca', color: '#991b1b' };
        if (v >= -0.7) return { bg: '#f87171', color: '#fff' };
        return { bg: '#dc2626', color: '#fff' };
    }

    function renderCorrMatrix() {
        const m = getModel();
        if (!m) return;
        const container = document.getElementById('ml-corr-matrix');
        if (!container) return;

        const FINANCE = ['Quantity_Ton', 'Unit_Price_VND', 'Revenue_VND', 'Cost_VND', 'Profit_VND', 'ESG_Score'];
        const ENV = ['Temperature_C', 'Humidity_Percent', 'Rainfall_mm', 'Disease_Risk_Num'];
        
        let keys, data;
        if (corrGroup === 'finance') {
            keys = FINANCE;
            data = m.data.production.filter(p => FINANCE.every(k => typeof p[k] === 'number'));
        } else {
            // Build weather numeric data
            const weatherData = m.data.weather.map(w => ({
                Temperature_C: w.Temperature_C,
                Humidity_Percent: w.Humidity_Percent || w['Humidity_%'] || 0,
                Rainfall_mm: w.Rainfall_mm || 0,
                Disease_Risk_Num: w.Disease_Risk === 'High' ? 2 : w.Disease_Risk === 'Medium' ? 1 : 0
            }));
            keys = ENV;
            data = weatherData;
        }

        if (!data.length) { container.innerHTML = '<p class="text-muted">Không đủ dữ liệu</p>'; return; }

        const cols = keys.length;
        // Compute matrix
        const matrix = keys.map(r => keys.map(c => {
            if (r === c) return 1;
            const va = data.map(row => Number(row[r])).filter(v => !isNaN(v));
            const vb = data.map(row => Number(row[c])).filter(v => !isNaN(v));
            const len = Math.min(va.length, vb.length);
            return Number(pearson(va.slice(0, len), vb.slice(0, len)).toFixed(3));
        }));

        const shortKey = k => k.split('_')[0];

        // Build grid HTML: (cols+1) columns
        container.innerHTML = `
        <div class="corr-matrix" style="grid-template-columns: 100px repeat(${cols}, 68px);">
            <div class="corr-header-cell"></div>
            ${keys.map(k => `<div class="corr-header-cell" title="${k}">${shortKey(k)}</div>`).join('')}
            ${keys.map((r, ri) => `
                <div class="corr-row-label" title="${r}">${shortKey(r)}</div>
                ${keys.map((c, ci) => {
                    const v = matrix[ri][ci];
                    const { bg, color } = corrColor(v);
                    return `<div class="corr-cell" style="background:${bg};color:${color};" title="${r} ↔ ${c}: ${v}">${v.toFixed(2)}</div>`;
                }).join('')}
            `).join('')}
        </div>`;
    }

    // --- ML Models ---
    class LinearRegression {
        constructor() { this.weights = []; this.bias = 0; }
        fit(X, y, epochs = 500, lr = 0.001) {
            const n = X.length, p = X[0].length;
            this.weights = new Array(p).fill(0).map(() => (Math.random() - 0.5) * 0.1);
            this.bias = 0;
            for (let e = 0; e < epochs; e++) {
                let dw = new Array(p).fill(0), db = 0;
                for (let i = 0; i < n; i++) {
                    const pred = this.predict(X[i]);
                    const err = pred - y[i];
                    for (let j = 0; j < p; j++) dw[j] += err * X[i][j];
                    db += err;
                }
                for (let j = 0; j < p; j++) this.weights[j] -= lr * dw[j] / n;
                this.bias -= lr * db / n;
            }
        }
        predict(x) { return this.bias + x.reduce((s, v, i) => s + v * (this.weights[i] || 0), 0); }
        importance() { const s = this.weights.reduce((a,w) => a+Math.abs(w), 0) || 1; return this.weights.map(w => Math.abs(w)/s); }
    }

    class SimpleTree {
        constructor(maxDepth = 5) { this.root = null; this.maxDepth = maxDepth; }
        fit(X, y) { this.root = this._build(X, y, 0); }
        _build(X, y, depth) {
            if (!X.length || depth >= this.maxDepth) return { leaf: true, val: y.reduce((a,b)=>a+b,0)/y.length||0 };
            let bestGain = -Infinity, bestFeat, bestThresh, leftX, leftY, rightX, rightY;
            const p = X[0].length;
            for (let f = 0; f < p; f++) {
                const vals = [...new Set(X.map(x=>x[f]))].slice(0, 10);
                for (const thresh of vals) {
                    const li = [], ri = [];
                    X.forEach((x,i) => (x[f] <= thresh ? li : ri).push(i));
                    if (!li.length || !ri.length) continue;
                    const lv = li.map(i=>y[i]), rv = ri.map(i=>y[i]);
                    const gain = this._var(y) - (li.length/X.length)*this._var(lv) - (ri.length/X.length)*this._var(rv);
                    if (gain > bestGain) { bestGain = gain; bestFeat = f; bestThresh = thresh; leftX = li.map(i=>X[i]); leftY = lv; rightX = ri.map(i=>X[i]); rightY = rv; }
                }
            }
            if (bestFeat === undefined) return { leaf: true, val: y.reduce((a,b)=>a+b,0)/y.length||0 };
            return { feat: bestFeat, thresh: bestThresh, left: this._build(leftX, leftY, depth+1), right: this._build(rightX, rightY, depth+1) };
        }
        _var(arr) { const m = arr.reduce((a,b)=>a+b,0)/arr.length; return arr.reduce((s,v)=>s+Math.pow(v-m,2),0)/arr.length; }
        predict(x) { let n = this.root; while (!n.leaf) n = x[n.feat] <= n.thresh ? n.left : n.right; return n.val; }
    }

    class RandomForest {
        constructor(n = 12) { this.trees = []; this.n = n; this.featImportance = {}; }
        fit(X, y, featNames) {
            this.trees = [];
            this.featImportance = {};
            featNames.forEach(f => this.featImportance[f] = 0);
            for (let t = 0; t < this.n; t++) {
                // Bootstrap sample
                const idx = Array.from({length: X.length}, () => Math.floor(Math.random()*X.length));
                const bX = idx.map(i => X[i]), bY = idx.map(i => y[i]);
                // Random feature subset
                const fCount = Math.max(1, Math.floor(Math.sqrt(X[0].length)));
                const fIdx = [...Array(X[0].length).keys()].sort(()=>Math.random()-0.5).slice(0, fCount);
                const subX = bX.map(x => fIdx.map(f => x[f]));
                const tree = new SimpleTree(6);
                tree.fit(subX, bY);
                this.trees.push({ tree, fIdx });
                fIdx.forEach(f => { this.featImportance[featNames[f]] = (this.featImportance[featNames[f]] || 0) + 1/this.n; });
            }
            const tot = Object.values(this.featImportance).reduce((a,b)=>a+b, 0) || 1;
            Object.keys(this.featImportance).forEach(k => this.featImportance[k] /= tot);
        }
        predict(x) {
            const preds = this.trees.map(({tree, fIdx}) => tree.predict(fIdx.map(f => x[f])));
            return preds.reduce((a,b)=>a+b,0)/preds.length;
        }
        importance() { return this.featImportance; }
    }

    function trainTestSplit(X, y, testRatio) {
        const idx = Array.from({length: X.length}, (_,i)=>i).sort(()=>Math.random()-0.5);
        const testCount = Math.floor(X.length * testRatio);
        const testIdx = idx.slice(0, testCount);
        const trainIdx = idx.slice(testCount);
        return {
            trainX: trainIdx.map(i=>X[i]), trainY: trainIdx.map(i=>y[i]),
            testX: testIdx.map(i=>X[i]), testY: testIdx.map(i=>y[i]),
            testOrigIdx: testIdx
        };
    }

    function normalize(vals) {
        const mn = Math.min(...vals), mx = Math.max(...vals);
        return mx === mn ? vals.map(()=>0) : vals.map(v=>(v-mn)/(mx-mn));
    }

    function metrics(actual, predicted) {
        const n = actual.length;
        const mae = actual.reduce((s,v,i)=>s+Math.abs(v-predicted[i]),0)/n;
        const mse = actual.reduce((s,v,i)=>s+Math.pow(v-predicted[i],2),0)/n;
        const rmse = Math.sqrt(mse);
        const mean = actual.reduce((a,b)=>a+b,0)/n;
        const ss_tot = actual.reduce((s,v)=>s+Math.pow(v-mean,2),0);
        const ss_res = actual.reduce((s,v,i)=>s+Math.pow(v-predicted[i],2),0);
        const r2 = ss_tot === 0 ? 1 : 1 - ss_res/ss_tot;
        return { mae, mse, rmse, r2 };
    }

    function renderResults(m, preds, testY, featNames, featImportance, targetKey) {
        document.getElementById('ml-training-progress').style.display = 'none';
        document.getElementById('ml-results').style.display = 'block';

        const isVND = targetKey.includes('VND') || targetKey.includes('revenue') || targetKey.includes('profit');
        const fmt = v => isVND ? (v/1e6).toFixed(2) + ' Tr' : Number(v.toFixed(3)).toLocaleString('vi-VN');

        // Metrics
        document.getElementById('ml-metrics-grid').innerHTML = `
            <div class="ml-metric-card"><div class="metric-label">R² Score</div><div class="metric-value">${m.r2.toFixed(4)}</div><div class="metric-sub">Độ khớp mô hình</div></div>
            <div class="ml-metric-card rmse"><div class="metric-label">RMSE</div><div class="metric-value">${isVND?(m.rmse/1e6).toFixed(1)+'M':m.rmse.toFixed(3)}</div><div class="metric-sub">Căn bình phương sai số</div></div>
            <div class="ml-metric-card mae"><div class="metric-label">MAE</div><div class="metric-value">${isVND?(m.mae/1e6).toFixed(1)+'M':m.mae.toFixed(3)}</div><div class="metric-sub">Sai số tuyệt đối trung bình</div></div>
            <div class="ml-metric-card mse"><div class="metric-label">MSE</div><div class="metric-value">${isVND?(m.mse/1e12).toFixed(2)+'T²':m.mse.toFixed(4)}</div><div class="metric-sub">Bình phương sai số TB</div></div>`;

        // Feature importance
        const fiEl = document.getElementById('ml-feature-importance');
        if (featImportance && fiEl) {
            const sorted = Object.entries(featImportance).sort((a,b)=>b[1]-a[1]).slice(0,8);
            const maxImp = sorted[0]?.[1] || 1;
            fiEl.innerHTML = sorted.map(([name, imp]) => `
                <div class="fi-row">
                    <span class="fi-label" title="${name}">${name}</span>
                    <div class="fi-bar-wrapper"><div class="fi-bar" style="width:${(imp/maxImp*100).toFixed(1)}%"></div></div>
                    <span class="fi-pct">${(imp*100).toFixed(1)}%</span>
                </div>`).join('');
        }

        // Draw Chart.js comparison chart
        const chartCanvas = document.getElementById('chart-ml-predictions');
        if (chartCanvas) {
            const ctx = chartCanvas.getContext('2d');
            if (predictionChart) {
                predictionChart.destroy();
            }

            const sampleCount = 15;
            const chartLabels = Array.from({length: Math.min(testY.length, sampleCount)}, (_, i) => `#${i+1}`);
            const actualData = testY.slice(0, sampleCount);
            const predictedData = preds.slice(0, sampleCount);

            predictionChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: 'Thực tế',
                            data: actualData,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4
                        },
                        {
                            label: 'Dự đoán',
                            data: predictedData,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            tension: 0.3,
                            fill: false,
                            pointRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: { family: 'Plus Jakarta Sans', size: 10, weight: 'bold' },
                                boxWidth: 12
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false }
                        },
                        y: {
                            ticks: {
                                callback: function(value) {
                                    return isVND ? (value/1e6).toFixed(0) + 'M' : value;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Predictions table
        document.getElementById('ml-predictions-tbody').innerHTML = testY.slice(0,10).map((actual, i) => {
            const pred = preds[i];
            const diff = actual - pred;
            const pct = actual !== 0 ? Math.abs(diff/actual*100).toFixed(1) : '—';
            const good = Math.abs(diff/Math.max(Math.abs(actual),1)) < 0.2;
            return `<tr>
                <td>${i+1}</td>
                <td style="font-weight:700;">${fmt(actual)}</td>
                <td style="color:var(--primary);font-weight:700;">${fmt(pred)}</td>
                <td><span style="padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${good?'rgba(22,163,74,0.08)':'rgba(239,68,68,0.08)'};color:${good?'var(--success)':'var(--danger)'}">
                    ${diff>=0?'+':''}${fmt(diff)} (${pct}%)
                </span></td>
            </tr>`;
        }).join('');
    }

    async function runModel() {
        const m = getModel();
        if (!m) return;

        const modelType = document.getElementById('ml-model-select').value;
        const targetKey = document.getElementById('ml-target-select').value;
        const testRatio = parseFloat(document.getElementById('ml-split-select').value);

        const FEAT_KEYS = ['Quantity_Ton', 'Unit_Price_VND', 'ESG_Score', 'AI_Prediction_Accuracy'];
        const available = FEAT_KEYS.filter(k => k !== targetKey);

        const rawData = m.data.production.filter(p =>
            available.every(k => typeof p[k] === 'number') && typeof p[targetKey] === 'number'
        );
        if (rawData.length < 20) { alert('Không đủ dữ liệu để huấn luyện!'); return; }

        // Show progress
        document.getElementById('ml-training-progress').style.display = 'block';
        document.getElementById('ml-results').style.display = 'none';
        document.getElementById('btn-run-ml').disabled = true;

        // Normalize features
        const normedCols = available.map(k => {
            const vals = rawData.map(r => r[k]);
            return normalize(vals);
        });
        const X = rawData.map((_, i) => available.map((_, fi) => normedCols[fi][i]));
        const y = rawData.map(r => r[targetKey]);

        // Animate progress
        let progress = 0;
        const progressBar = document.getElementById('ml-progress-bar');
        const progressPct = document.getElementById('ml-progress-pct');
        const animProgress = (target) => new Promise(res => {
            const step = () => {
                progress = Math.min(progress + 2, target);
                progressBar.style.width = progress + '%';
                progressPct.textContent = progress + '%';
                if (progress < target) requestAnimationFrame(step);
                else res();
            };
            requestAnimationFrame(step);
        });

        await animProgress(30);
        const { trainX, trainY, testX, testY } = trainTestSplit(X, y, testRatio);
        await animProgress(60);

        let model, predictions, featImportance;
        if (modelType === 'linear') {
            model = new LinearRegression();
            model.fit(trainX, trainY, 800, 0.005);
            predictions = testX.map(x => model.predict(x));
            const imp = model.importance();
            featImportance = Object.fromEntries(available.map((k, i) => [k, imp[i] || 0]));
        } else if (modelType === 'tree') {
            model = new SimpleTree(6);
            model.fit(trainX, trainY);
            predictions = testX.map(x => model.predict(x));
            featImportance = Object.fromEntries(available.map((k, i) => [k, 1/available.length]));
        } else {
            model = new RandomForest(15);
            model.fit(trainX, trainY, available);
            predictions = testX.map(x => model.predict(x));
            featImportance = model.importance();
        }

        await animProgress(100);
        const m2 = metrics(testY, predictions);

        // Small delay for UX
        await new Promise(res => setTimeout(res, 300));
        document.getElementById('btn-run-ml').disabled = false;
        renderResults(m2, predictions, testY, available, featImportance, targetKey);
    }

    return {
        init() {
            renderScaling();
            renderEncoding();
            renderCorrMatrix();
        },
        setScaler(type) {
            scalerType = type;
            document.querySelectorAll('#btn-scaler-minmax, #btn-scaler-standard').forEach(b => b.classList.remove('active'));
            document.getElementById(`btn-scaler-${type === 'minmax' ? 'minmax' : 'standard'}`).classList.add('active');
            renderScaling();
        },
        setCorrGroup(group) {
            corrGroup = group;
            document.querySelectorAll('#btn-corr-finance, #btn-corr-env').forEach(b => b.classList.remove('active'));
            document.getElementById(`btn-corr-${group === 'finance' ? 'finance' : 'env'}`).classList.add('active');
            renderCorrMatrix();
        },
        runModel
    };
})();
window.MLStudio = MLStudio;

// Global bridge functions
window.mlSetScaler = (t) => MLStudio.setScaler(t);
window.mlSetCorrGroup = (g) => MLStudio.setCorrGroup(g);
window.mlRunModel = () => MLStudio.runModel();

// ==========================================================================
// 8. AI COPILOT & DRONE COORDINATION MODULE
// ==========================================================================
const AICopilot = (() => {
    let initialized = false;
    let isDroneFlying = false;
    let droneInterval = null;
    let droneX = 80;
    let droneY = 60;
    let droneTargetX = 120;
    let droneTargetY = 80;
    let droneBattery = 100;
    let droneCoverage = 0;
    let canvas = null;
    let ctx = null;
    
    // Disease data from Chapter 3.3.2
    const diseaseData = {
        rice: {
            name: "Bệnh Đốm Lá Lúa (Cercospora oryzae)",
            confidence: "92.8%",
            cause: "Do nấm Cercospora oryzae gây ra, thường phát sinh mạnh ở điều kiện độ ẩm cao (>85%), bón thừa đạm (Nitrogen), ruộng quá dày che bóng hoặc hệ thống thoát nước kém.",
            treatment: "Cắt giảm ngay lượng phân đạm bón vào, tăng cường kali. Phun các chế phẩm sinh học trị nấm gốc đồng (Copper hydroxide) hoặc Trichoderma để khống chế vết bệnh loang rộng. Vụ sau chú ý sạ thưa."
        },
        coffee: {
            name: "Bệnh Rỉ Sắt Cà Phê (Hemileia vastatrix)",
            confidence: "95.6%",
            cause: "Do bào tử nấm Hemileia vastatrix ký sinh, phát tán mạnh qua gió và sương ẩm nhiệt đới. Biến đổi khí hậu khiến nhiệt độ ban đêm ấm hơn làm bào tử nấm nảy mầm nhanh kỷ lục.",
            treatment: "Thu gom và tiêu hủy toàn bộ các cành lá nhiễm bệnh. Phun thuốc trừ nấm sinh học chứa hoạt chất Bacillus subtilis hoặc đồng sulfat định kỳ. Ghép cải tạo bằng dòng cà phê TRS1 kháng rỉ sắt tốt hơn."
        },
        durian: {
            name: "Bệnh Cháy Lá Sầu Riêng (Phytophthora palmivora)",
            confidence: "94.1%",
            cause: "Nấm Phytophthora palmivora tấn công trong mùa mưa dầm hoặc ẩm độ đất quá bão hòa kéo dài (>90%). Nước đọng xung quanh gốc tạo điều kiện cho bào tử bơi bám vào rễ và cổ rễ.",
            treatment: "Xới phá váng, khơi rãnh thoát nước sâu quanh vườn, không để đọng nước. Bôi vôi quét quanh gốc cây từ 1m trở xuống. Sử dụng phân bón lá chứa lân phosphonate để tăng cường kháng thể chủ động cho cây."
        }
    };

    function init() {
        setupChatbot();
        setupDroneCanvas();
        setupFileEvents();
        
        // Loop map drawing
        if (!initialized) {
            initialized = true;
            setInterval(() => {
                if (canvas && ctx) {
                    drawDroneMap();
                }
            }, 100);
        }
    }

    function setupChatbot() {
        const chatBox = document.getElementById('ai-chat-messages');
        if (!chatBox) return;
        
        chatBox.innerHTML = '';
        addMessage("assistant", "Xin chào! Tôi là Trợ lý AI nông nghiệp AgriSmart. 🌾 Tôi được xây dựng theo định hướng công nghệ tại Chương 3 của luận văn kinh doanh số. Tôi có thể giải thích dữ liệu cảm biến IoT, lập lịch gieo trồng hoặc hướng dẫn trị sâu bệnh cho bạn. Bạn cần tôi giúp gì?");
    }

    function addMessage(sender, text) {
        const chatBox = document.getElementById('ai-chat-messages');
        if (!chatBox) return;

        const meta = document.createElement('div');
        meta.className = `chat-meta ${sender === 'user' ? 'user-meta' : 'assistant-meta'}`;
        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        meta.innerHTML = `<span style="font-weight:700;">${sender === 'user' ? 'Bạn' : 'AgriSmart AI'}</span> • <span>${timeStr}</span>`;
        chatBox.appendChild(meta);

        const bubble = document.createElement('div');
        bubble.className = `chat-message ${sender}`;
        bubble.innerHTML = `<p>${text}</p>`;
        chatBox.appendChild(bubble);

        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addTypingIndicator() {
        const chatBox = document.getElementById('ai-chat-messages');
        if (!chatBox) return null;

        const id = 'typing-' + Date.now();
        
        const meta = document.createElement('div');
        meta.id = id + '-meta';
        meta.className = 'chat-meta assistant-meta';
        meta.innerHTML = `<span style="font-weight:700;">AgriSmart AI</span> • <span>Đang gõ...</span>`;
        chatBox.appendChild(meta);

        const bubble = document.createElement('div');
        bubble.id = id;
        bubble.className = 'chat-message assistant';
        bubble.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
        chatBox.appendChild(bubble);

        chatBox.scrollTop = chatBox.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        const meta = document.getElementById(id + '-meta');
        if (el) el.remove();
        if (meta) meta.remove();
    }

    function handleSend(text) {
        if (!text || !text.trim()) return;
        const msg = text.trim();
        addMessage("user", msg);

        const typingId = addTypingIndicator();

        setTimeout(() => {
            removeTypingIndicator(typingId);
            const reply = getAIResponse(msg);
            addMessage("assistant", reply);
        }, 1100);
    }

    function getAIResponse(msg) {
        const lower = msg.toLowerCase();
        
        if (lower.includes('cảm biến') || lower.includes('độ ẩm') || lower.includes('nhiệt độ')) {
            const tempEl = document.getElementById('telemetry-temp');
            const humEl = document.getElementById('telemetry-humidity');
            const temp = tempEl ? tempEl.textContent : '28.5°C';
            const hum = humEl ? humEl.textContent : '70%';
            return `Dữ liệu cảm biến trạm IoT đo được hiện tại: <strong>Nhiệt độ không khí là ${temp}</strong> và <strong>Độ ẩm đạt ${hum}</strong>. Chỉ số này nằm ở ngưỡng lý tưởng. Bạn không cần tưới thêm nước lúc này.`;
        }

        if (lower.includes('sầu riêng') && (lower.includes('lịch') || lower.includes('canh tác') || lower.includes('gieo'))) {
            return `Theo phân tích trong Chương 3.3.9 của đề tài, sầu riêng cần:<br>
            - <strong>Xuống giống:</strong> Đầu mùa mưa (Tháng 4-5) để tận dụng nước trời.<br>
            - <strong>Tạo bông:</strong> Cuối mùa mưa (Tháng 11-12) qua việc xiết nước.<br>
            - <strong>Ngưỡng tưới:</strong> Duy trì độ ẩm đất từ 50-65% bằng vòi tưới nhỏ giọt tự động.`;
        }

        if (lower.includes('rỉ sắt') || lower.includes('cà phê')) {
            return `<strong>Bệnh Rỉ Sắt Cà Phê:</strong> do nấm <i>Hemileia vastatrix</i> gây hại mặt dưới lá. Phương pháp chẩn đoán & điều trị:<br>
            - Phun dung dịch Boocđô 1% (Copper sulfate) hoặc chế phẩm Trichoderma để cô lập ổ nấm.<br>
            - Cắt tỉa cành tăm để vườn nhận đủ ánh sáng trực tiếp, ngăn sương đọng lâu.`;
        }

        if (lower.includes('lúa') || lower.includes('đốm lá')) {
            return `<strong>Bệnh Đốm Lá Lúa:</strong> do nấm <i>Cercospora oryzae</i>. Điều trị bằng cách giảm bón phân đạm, bón thêm phân Kali. Phun ngừa bằng sản phẩm chứa gốc Đồng sinh học vào sáng sớm.`;
        }

        return `Tôi đã ghi nhận câu hỏi về "<i>${msg}</i>". Theo mô hình kinh doanh số AgriSmart (Chương 3.3), bạn nên kết hợp giám sát camera hồng ngoại từ Drone và theo dõi chỉ số độ ẩm cảm biến IoT đất hàng ngày để tối ưu quy trình IPM.`;
    }

    function runDiagnosis(type) {
        const data = diseaseData[type];
        if (!data) return;

        const resultCard = document.getElementById('disease-result-card');
        const uploadBox = document.getElementById('disease-upload-box');
        const progressBox = document.getElementById('disease-scan-progress');
        const progressBar = document.getElementById('scan-progress-bar');
        const progressPct = document.getElementById('scan-progress-pct');

        resultCard.style.display = 'none';
        progressBox.style.display = 'block';
        uploadBox.style.opacity = '0.5';

        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            progressBar.style.width = progress + '%';
            progressPct.textContent = progress + '%';

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    document.getElementById('disease-name').innerHTML = `${data.name}`;
                    document.getElementById('disease-confidence').textContent = `Độ tin cậy: ${data.confidence}`;
                    document.getElementById('disease-cause').innerHTML = data.cause;
                    document.getElementById('disease-treatment').innerHTML = data.treatment;

                    progressBox.style.display = 'none';
                    resultCard.style.display = 'flex';
                    uploadBox.style.opacity = '1';
                }, 300);
            }
        }, 120);
    }

    function setupFileEvents() {
        const fileInput = document.getElementById('disease-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const types = ['rice', 'coffee', 'durian'];
                    const randType = types[Math.floor(Math.random() * types.length)];
                    runDiagnosis(randType);
                }
            });
        }
    }

    function setupDroneCanvas() {
        canvas = document.getElementById('drone-flight-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    function drawDroneMap() {
        if (!ctx || !canvas) return;
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#061311';
        ctx.fillRect(0, 0, w, h);

        // Radar grid
        ctx.strokeStyle = 'rgba(22, 163, 74, 0.15)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < w; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Green zones (Farms)
        ctx.fillStyle = 'rgba(22, 163, 74, 0.08)';
        ctx.fillRect(30, 20, 90, 50); // A
        ctx.fillStyle = 'rgba(217, 119, 6, 0.06)';
        ctx.fillRect(150, 30, 110, 60); // B
        ctx.fillStyle = 'rgba(2, 132, 199, 0.06)';
        ctx.fillRect(50, 90, 80, 50); // C

        ctx.font = '800 8px "Plus Jakarta Sans"';
        ctx.fillStyle = 'rgba(22, 163, 74, 0.6)';
        ctx.fillText("PHÂN KHU A (LÚA)", 35, 32);
        ctx.fillStyle = 'rgba(217, 119, 6, 0.6)';
        ctx.fillText("PHÂN KHU B (CÀ PHÊ)", 155, 42);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.6)';
        ctx.fillText("PHÂN KHU C (SẦU RIÊNG)", 55, 102);

        // Target point
        if (isDroneFlying) {
            ctx.beginPath();
            ctx.arc(droneTargetX, droneTargetY, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.stroke();
        }

        // Drone
        ctx.save();
        ctx.translate(droneX, droneY);
        
        ctx.beginPath();
        ctx.arc(0, 0, 12 + Math.sin(Date.now() / 150) * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(22, 163, 74, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 6);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    function updateFlight() {
        if (!isDroneFlying) return;

        const dx = droneTargetX - droneX;
        const dy = droneTargetY - droneY;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > 3) {
            droneX += (dx / dist) * 1.5;
            droneY += (dy / dist) * 1.5;
        } else {
            droneTargetX = 30 + Math.random() * (canvas.width - 60);
            droneTargetY = 20 + Math.random() * (canvas.height - 40);
        }

        droneBattery -= 0.04;
        if (droneBattery <= 0) {
            droneBattery = 0;
            landDrone();
        }

        droneCoverage += 0.012;

        document.getElementById('drone-battery').textContent = `${Math.floor(droneBattery)}%`;
        document.getElementById('drone-coverage').textContent = `Phân khu A-C (${droneCoverage.toFixed(2)} ha)`;
        
        const lat = (10.7629 + (droneY - 80) * 0.0001).toFixed(5);
        const lng = (106.6821 + (droneX - 120) * 0.0001).toFixed(5);
        document.getElementById('drone-coords').textContent = `[${lat}, ${lng}]`;
    }

    function takeoffDrone() {
        if (isDroneFlying) return;
        isDroneFlying = true;
        
        document.getElementById('drone-status-txt').textContent = "Đang khảo sát vùng trồng...";
        document.getElementById('drone-status-txt').style.color = "var(--primary)";
        
        document.getElementById('btn-drone-takeoff').disabled = true;
        document.getElementById('btn-drone-land').disabled = false;

        droneInterval = setInterval(updateFlight, 40);
    }

    function landDrone() {
        if (!isDroneFlying) return;
        isDroneFlying = false;
        clearInterval(droneInterval);
        
        document.getElementById('drone-status-txt').textContent = droneBattery <= 0 ? "Hết pin - Đang sạc" : "Đã đáp về trạm sạc";
        document.getElementById('drone-status-txt').style.color = "var(--text-muted)";
        
        document.getElementById('btn-drone-takeoff').disabled = false;
        document.getElementById('btn-drone-land').disabled = true;

        if (droneBattery <= 0) {
            setTimeout(() => {
                droneBattery = 100;
                document.getElementById('drone-battery').textContent = "100%";
            }, 6000);
        }
    }

    return {
        init,
        sendMessage: handleSend,
        runDiagnosis,
        takeoff: takeoffDrone,
        land: landDrone
    };
})();
window.AICopilot = AICopilot;

// Global triggers
window.sendSuggestedMessage = (msg) => {
    document.getElementById('ai-chat-input').value = msg;
    AICopilot.sendMessage(msg);
    document.getElementById('ai-chat-input').value = '';
};
window.handleChatSend = () => {
    const input = document.getElementById('ai-chat-input');
    AICopilot.sendMessage(input.value);
    input.value = '';
};
window.selectSampleLeaf = (type) => {
    document.querySelectorAll('.sample-leaf-card').forEach(c => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    AICopilot.runDiagnosis(type);
};
window.mlDroneTakeoff = () => AICopilot.takeoff();
window.mlDroneLand = () => AICopilot.land();

// Hook into switchDashboardTab to init modules when needed
const _origSwitchTab = window.switchDashboardTab;
window.switchDashboardTab = (tabId) => {
    _origSwitchTab(tabId);
    if (tabId === 'tab-data-explorer') {
        setTimeout(() => DataExplorer.init(), 50);
    }
    if (tabId === 'tab-ml-studio') {
        setTimeout(() => MLStudio.init(), 50);
    }
    if (tabId === 'tab-ai-copilot') {
        setTimeout(() => AICopilot.init(), 50);
    }
};

// Expose model globally so modules can access it
const _origInit = appController.init.bind(appController);
appController.init = async function() {
    await _origInit();
    window._agriSmartModel = appController.model;
};

