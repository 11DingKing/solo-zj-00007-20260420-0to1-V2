import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Order, OrderStatus } from '../services/api.service';

interface Filters {
  startDate: string;
  endDate: string;
  status: string;
  minAmount: number | null;
  maxAmount: number | null;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html'
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  orderStatuses: OrderStatus[] = [];
  loading = false;
  
  currentPage = 1;
  pageSize = 20;
  total = 0;
  totalPages = 0;

  filters: Filters = {
    startDate: '',
    endDate: '',
    status: '',
    minAmount: null,
    maxAmount: null
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadOrderStatuses();
    this.loadOrders();
  }

  loadOrderStatuses(): void {
    this.apiService.getOrderStatuses().subscribe({
      next: (statuses) => {
        this.orderStatuses = statuses;
      },
      error: (err) => {
        console.error('加载订单状态失败:', err);
      }
    });
  }

  loadOrders(): void {
    this.loading = true;
    
    const filterParams: {
      startDate?: string;
      endDate?: string;
      status?: string;
      minAmount?: number;
      maxAmount?: number;
    } = {};
    
    if (this.filters.startDate) filterParams.startDate = this.filters.startDate;
    if (this.filters.endDate) filterParams.endDate = this.filters.endDate;
    if (this.filters.status) filterParams.status = this.filters.status;
    if (this.filters.minAmount !== null) filterParams.minAmount = this.filters.minAmount;
    if (this.filters.maxAmount !== null) filterParams.maxAmount = this.filters.maxAmount;

    this.apiService.getOrders(this.currentPage, this.pageSize, filterParams).subscribe({
      next: (response) => {
        this.orders = response.data;
        this.total = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.loading = false;
      },
      error: (err) => {
        console.error('加载订单列表失败:', err);
        this.loading = false;
      }
    });
  }

  search(): void {
    this.currentPage = 1;
    this.loadOrders();
  }

  resetFilters(): void {
    this.filters = {
      startDate: '',
      endDate: '',
      status: '',
      minAmount: null,
      maxAmount: null
    };
    this.currentPage = 1;
    this.loadOrders();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadOrders();
    }
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(value: number): string {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}
