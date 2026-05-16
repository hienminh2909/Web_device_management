window.initDashboardCharts = function () {
    const isDark = document.body.classList.contains('dark-mode');
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const titleColor = isDark ? '#f8fafc' : '#1e293b';
    // ==========================================
    // 1. COUNTUP ANIMATION
    // ==========================================
    function countUp(element, targetVal, duration) {
        duration = duration || 1000;
        let start = 0;
        const increment = targetVal / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= targetVal) {
                start = targetVal;
                clearInterval(timer);
            }
            element.textContent = Math.floor(start).toLocaleString('vi-VN');
        }, 16);
    }

    document.querySelectorAll('.count-up').forEach(el => {
        const target = parseInt(el.dataset.target) || 0;
        countUp(el, target, 1000);
    });

    // ==========================================
    // 2. DONUT CHART
    // ==========================================
    const ctxDonut = document.getElementById('statusDonutChart');
    if (ctxDonut) {
        // Destroy existing chart if it exists
        const existingChart = Chart.getChart(ctxDonut);
        if (existingChart) existingChart.destroy();

        const data = (typeof window.chartDataFromServer !== 'undefined') ? window.chartDataFromServer : [0, 0, 0, 0, 0];
        const colors = ['#10b981', '#f43f5e', '#f59e0b', '#0891b2', '#f1f5f9'];
        
        new Chart(ctxDonut.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Tốt', 'Hỏng', 'Cần bảo trì', 'Đang bảo trì', 'Khác'],
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    cutout: '70%',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { animateRotate: true, duration: 1200 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: isDark ? '#f8fafc' : '#1e293b',
                        bodyColor: isDark ? '#cbd5e1' : '#475569',
                        borderColor: isDark ? '#475569' : '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.raw}`
                        }
                    }
                }
            }
        });
    }

    // ==========================================
    // 3. BAR CHART
    // ==========================================
    const ctxBar = document.getElementById('roomBarChart');
    if (ctxBar) {
        // Destroy existing chart if it exists
        const existingChart = Chart.getChart(ctxBar);
        if (existingChart) existingChart.destroy();

        const labels = (typeof window.roomLabelsFromServer !== 'undefined') ? window.roomLabelsFromServer : [];
        const vals   = (typeof window.roomDataFromServer !== 'undefined')   ? window.roomDataFromServer  : [];

        // Dynamic colors for bars
        const barColors = [
            '#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#0891b2', 
            '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'
        ];

        new Chart(ctxBar.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số thiết bị',
                    data: vals,
                    backgroundColor: barColors.slice(0, vals.length),
                    borderRadius: 8,
                    barThickness: 18,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: isDark ? '#f8fafc' : '#1e293b',
                        bodyColor: isDark ? '#cbd5e1' : '#475569',
                        borderColor: isDark ? '#475569' : '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: labelColor, font: { size: 10 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: titleColor, font: { size: 11, weight: '600' } }
                    }
                }
            }
        });
    }

    // 3. INVENTORY PROGRESS CHART (Grouped Bar Chart)
    const ctxLine = document.getElementById('inventoryProgressChart');
    if (ctxLine) {
        const existingChart = Chart.getChart(ctxLine);
        if (existingChart) existingChart.destroy();

        const labels = window.inventoryLabels || [];
        const totalData = window.inventoryTotal || [];
        const checkedData = window.inventoryChecked || [];

        // Nếu chưa có dữ liệu, hiển thị trạng thái trống hoặc thoát
        if (labels.length === 0) return;

        new Chart(ctxLine.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tổng thiết bị',
                        data: totalData,
                        backgroundColor: '#cbd5e1', 
                        borderRadius: 6,
                        barThickness: 18
                    },
                    {
                        label: 'Đã kiểm kê',
                        data: checkedData,
                        backgroundColor: '#4f46e5', 
                        borderRadius: 6,
                        barThickness: 18
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '600' } }
                    },
                    tooltip: {
                        backgroundColor: '#ffffff',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: labelColor, font: { size: 10 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: labelColor, font: { size: 10 } }
                    }
                }
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', window.initDashboardCharts);