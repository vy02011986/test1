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
        const fetchFile = async (filename) => {
            const response = await fetch(`./data/${filename}`);
            if (!response.ok) throw new Error(`Không thể đọc file ${filename}`);
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
                fetchFile('farmers.csv'),
                fetchFile('farms.csv'),
                fetchFile('production.csv'),
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
            
            const farmIds = new Set(filteredFarms.map(f => f.Farm_ID));
            const filteredWeather = (this.model.data.weather || []).filter(w => farmIds.has(w.Farm_ID));
            
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
            const prodIds = new Set(filteredProduction.map(p => p.Production_ID));
            const filteredOrders = (this.model.data.marketplace || []).filter(o => prodIds.has(o.Production_ID));
            
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
            const farmIds = new Set(filteredFarms.map(f => f.Farm_ID));
            const filteredEsg = (this.model.data.esg || []).filter(e => farmIds.has(e.Farm_ID));

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
