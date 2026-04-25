import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <ul>
        <li><a routerLink="/dashboard" routerLinkActive="active">仪表盘</a></li>
        <li><a routerLink="/orders" routerLinkActive="active">订单管理</a></li>
        <li><a routerLink="/products" routerLinkActive="active">商品排行</a></li>
      </ul>
    </nav>
    <div class="container">
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent {
  title = '销售数据分析看板';
}
