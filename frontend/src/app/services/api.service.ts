import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

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

export interface OrderTrendItem {
  period: string;
  orderCount: number;
  totalSales: number;
}

export interface OrderTrendResponse {
  days: number;
  unit: string;
  data: OrderTrendItem[];
}

export interface ProductTop10Item {
  id: number;
  productName: string;
  categoryName: string;
  totalQuantity: number;
  totalSales: number;
}

export interface OrderStatusItem {
  status: string;
  statusName: string;
  count: number;
  percentage: number;
}

export interface ChartDataBundle {
  orderTrend: OrderTrendResponse;
  productTop10: ProductTop10Item[];
  orderStatus: OrderStatusItem[];
}

export interface ProductOrderItem {
  orderNo: string;
  quantity: number;
  subtotal: number;
  status: string;
  statusName: string;
  createdAt: string;
}

export interface ProductDetail {
  id: number;
  productName: string;
  categoryName: string;
  price: number;
}

export interface ProductDetailResponse {
  product: ProductDetail;
  orders: ProductOrderItem[];
}

@Injectable({
  providedIn: "root",
})
export class ApiService {
  private baseUrl = "/api";

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.baseUrl}/stats/dashboard`);
  }

  getOrderTrend(range: number = 30): Observable<OrderTrendResponse> {
    let params = new HttpParams().set("range", range.toString());
    return this.http.get<OrderTrendResponse>(
      `${this.baseUrl}/stats/order-trend`,
      { params },
    );
  }

  getProductTop10(): Observable<ProductTop10Item[]> {
    return this.http.get<ProductTop10Item[]>(
      `${this.baseUrl}/stats/product-top10`,
    );
  }

  getOrderStatus(): Observable<OrderStatusItem[]> {
    return this.http.get<OrderStatusItem[]>(
      `${this.baseUrl}/stats/order-status`,
    );
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
    },
  ): Observable<OrderListResponse> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("pageSize", pageSize.toString());

    if (filters) {
      if (filters.startDate)
        params = params.set("startDate", filters.startDate);
      if (filters.endDate) params = params.set("endDate", filters.endDate);
      if (filters.status) params = params.set("status", filters.status);
      if (filters.minAmount)
        params = params.set("minAmount", filters.minAmount.toString());
      if (filters.maxAmount)
        params = params.set("maxAmount", filters.maxAmount.toString());
    }

    return this.http.get<OrderListResponse>(`${this.baseUrl}/orders`, {
      params,
    });
  }

  getOrderStatuses(): Observable<OrderStatus[]> {
    return this.http.get<OrderStatus[]>(`${this.baseUrl}/orders/statuses`);
  }

  getProductRanking(
    timeRange: number = 30,
    sortBy: "sales" | "quantity" = "sales",
  ): Observable<ProductRanking[]> {
    let params = new HttpParams()
      .set("timeRange", timeRange.toString())
      .set("sortBy", sortBy);

    return this.http.get<ProductRanking[]>(`${this.baseUrl}/products/ranking`, {
      params,
    });
  }

  getProductDetail(id: number): Observable<ProductDetailResponse> {
    return this.http.get<ProductDetailResponse>(
      `${this.baseUrl}/products/${id}`,
    );
  }
}
