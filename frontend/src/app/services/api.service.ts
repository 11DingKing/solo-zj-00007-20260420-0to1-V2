import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardData {
  todaySales: number;
  todayOrders: number;
  monthSales: number;
  monthOrders: number;
  salesTrend: { date: string; sales: number }[];
  categoryShare: { category: string; sales: number; percentage: number }[];
}

export interface Order {
  id: number;
  orderNo: string;
  customerName: string;
  totalAmount: number;
  status: string;
  statusName: string;
  createdAt: string;
}

export interface OrderListResponse {
  data: Order[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderStatus {
  value: string;
  label: string;
}

export interface ProductRanking {
  id: number;
  productName: string;
  categoryName: string;
  totalQuantity: number;
  totalSales: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.baseUrl}/stats/dashboard`);
  }

  getOrders(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      startDate?: string;
      endDate?: string;
      status?: string;
      minAmount?: number;
      maxAmount?: number;
    }
  ): Observable<OrderListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filters) {
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.minAmount) params = params.set('minAmount', filters.minAmount.toString());
      if (filters.maxAmount) params = params.set('maxAmount', filters.maxAmount.toString());
    }

    return this.http.get<OrderListResponse>(`${this.baseUrl}/orders`, { params });
  }

  getOrderStatuses(): Observable<OrderStatus[]> {
    return this.http.get<OrderStatus[]>(`${this.baseUrl}/orders/statuses`);
  }

  getProductRanking(timeRange: number = 30, sortBy: 'sales' | 'quantity' = 'sales'): Observable<ProductRanking[]> {
    let params = new HttpParams()
      .set('timeRange', timeRange.toString())
      .set('sortBy', sortBy);

    return this.http.get<ProductRanking[]>(`${this.baseUrl}/products/ranking`, { params });
  }
}
