import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ApiService, DashboardData } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  loading = true;
  dashboardData: DashboardData | null = null;

  // 折线图配置
  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: '销售额',
        fill: true,
        tension: 0.4,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#667eea'
      }
    ]
  };

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => '¥' + value
        }
      }
    }
  };

  // 饼图配置
  pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#667eea',
          '#48bb78',
          '#ed8936',
          '#e53e3e',
          '#38b2ac',
          '#9f7aea',
          '#f6e05e',
          '#fc8181'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }
    ]
  };

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw as number;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ¥${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.apiService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.updateCharts(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('加载仪表盘数据失败:', err);
        this.loading = false;
      }
    });
  }

  updateCharts(data: DashboardData): void {
    // 更新折线图
    this.lineChartData.labels = data.salesTrend.map(item => {
      const date = new Date(item.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    this.lineChartData.datasets[0].data = data.salesTrend.map(item => item.sales);

    // 更新饼图
    const validCategories = data.categoryShare.filter(c => c.sales > 0);
    this.pieChartData.labels = validCategories.map(c => c.category);
    this.pieChartData.datasets[0].data = validCategories.map(c => c.sales);
  }

  formatCurrency(value: number): string {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(1)}万`;
    }
    return `¥${value.toLocaleString()}`;
  }
}
