import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  ApiService, 
  ProductDetail, 
  ProductOrderItem 
} from '../services/api.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail.component.html'
})
export class ProductDetailComponent implements OnInit {
  loading = true;
  product: ProductDetail | null = null;
  orders: ProductOrderItem[] = [];
  productId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.productId = parseInt(idParam);
      if (!isNaN(this.productId)) {
        this.loadProductDetail(this.productId);
      } else {
        this.loading = false;
      }
    } else {
      this.loading = false;
    }
  }

  loadProductDetail(id: number): void {
    this.loading = true;
    this.apiService.getProductDetail(id).subscribe({
      next: (response) => {
        this.product = response.product;
        this.orders = response.orders;
        this.loading = false;
      },
      error: (err) => {
        console.error('加载商品详情失败:', err);
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatCurrency(value: number): string {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
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
}
