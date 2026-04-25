import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, ProductRanking } from '../services/api.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './products.component.html'
})
export class ProductsComponent implements OnInit {
  rankings: ProductRanking[] = [];
  loading = false;
  
  timeRange = 30;
  sortBy: 'sales' | 'quantity' = 'sales';
  
  timeRangeOptions = [
    { value: 7, label: '近 7 天' },
    { value: 30, label: '近 30 天' },
    { value: 90, label: '近 90 天' }
  ];
  
  sortByOptions = [
    { value: 'sales', label: '按销售额' },
    { value: 'quantity', label: '按销售量' }
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadRankings();
  }

  loadRankings(): void {
    this.loading = true;
    this.apiService.getProductRanking(this.timeRange, this.sortBy).subscribe({
      next: (data) => {
        this.rankings = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('加载商品排行失败:', err);
        this.loading = false;
      }
    });
  }

  onTimeRangeChange(value: number): void {
    this.timeRange = value;
    this.loadRankings();
  }

  onSortByChange(value: 'sales' | 'quantity'): void {
    this.sortBy = value;
    this.loadRankings();
  }

  getRankBadgeClass(rank: number): string {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'rank-other';
  }

  formatCurrency(value: number): string {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  }
}
