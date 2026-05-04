/**
 * Dashboard Charts & Animations — Light VIP Edition
 */
document.addEventListener('DOMContentLoaded', function () {

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
                maintainAspectRatio: true,
                animation: { animateRotate: true, duration: 1200 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#ffffff',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
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
        const labels = (typeof window.roomLabelsFromServer !== 'undefined') ? window.roomLabelsFromServer : [];
        const vals   = (typeof window.roomDataFromServer !== 'undefined')   ? window.roomDataFromServer  : [];

        new Chart(ctxBar.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số thiết bị',
                    data: vals,
                    backgroundColor: '#4f46e5',
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
                    x: {
                        grid: { color: '#f1f5f9' },
                        ticks: { color: '#64748b', font: { size: 10 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#1e293b', font: { size: 11, weight: '600' } }
                    }
                }
            }
        });
    }
});