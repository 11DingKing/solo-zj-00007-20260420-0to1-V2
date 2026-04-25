import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { forkJoin, Subscription } from "rxjs";
import * as echarts from "echarts";
import * as XLSX from "xlsx";
import {
  ApiService,
  DashboardData,
  OrderTrendResponse,
  ProductTop10Item,
  OrderStatusItem,
} from "../services/api.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./dashboard.component.html",
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading = true;
  dashboardData: DashboardData | null = null;
  orderTrendData: OrderTrendResponse | null = null;
  productTop10Data: ProductTop10Item[] = [];
  orderStatusData: OrderStatusItem[] = [];

  timeRange = 30;
  timeRangeOptions = [
    { value: 7, label: "近 7 天" },
    { value: 30, label: "近 30 天" },
    { value: 90, label: "近 90 天" },
  ];

  @ViewChild("orderTrendChart", { static: false })
  orderTrendChartEl!: ElementRef;
  @ViewChild("productTop10Chart", { static: false })
  productTop10ChartEl!: ElementRef;
  @ViewChild("orderStatusChart", { static: false })
  orderStatusChartEl!: ElementRef;

  private orderTrendChart!: echarts.ECharts | null;
  private productTop10Chart!: echarts.ECharts | null;
  private orderStatusChart!: echarts.ECharts | null;
  private resizeSubscription!: Subscription;

  constructor(
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.orderTrendChart?.dispose();
    this.productTop10Chart?.dispose();
    this.orderStatusChart?.dispose();
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    this.orderTrendChart?.resize();
    this.productTop10Chart?.resize();
    this.orderStatusChart?.resize();
  }

  loadAllData(): void {
    this.loading = true;

    forkJoin({
      dashboard: this.apiService.getDashboardData(),
      orderTrend: this.apiService.getOrderTrend(this.timeRange),
      productTop10: this.apiService.getProductTop10(),
      orderStatus: this.apiService.getOrderStatus(),
    }).subscribe({
      next: (results) => {
        this.dashboardData = results.dashboard;
        this.orderTrendData = results.orderTrend;
        this.productTop10Data = results.productTop10;
        this.orderStatusData = results.orderStatus;
        this.loading = false;

        setTimeout(() => {
          this.initCharts();
        }, 100);
      },
      error: (err) => {
        console.error("加载数据失败:", err);
        this.loading = false;
      },
    });
  }

  onTimeRangeChange(value: number): void {
    this.timeRange = value;
    this.loadOrderTrend();
  }

  loadOrderTrend(): void {
    this.apiService.getOrderTrend(this.timeRange).subscribe({
      next: (data) => {
        this.orderTrendData = data;
        this.updateOrderTrendChart();
      },
      error: (err) => {
        console.error("加载订单趋势失败:", err);
      },
    });
  }

  initCharts(): void {
    this.initOrderTrendChart();
    this.initProductTop10Chart();
    this.initOrderStatusChart();
  }

  initOrderTrendChart(): void {
    if (!this.orderTrendChartEl || !this.orderTrendData) return;

    this.orderTrendChart = echarts.init(this.orderTrendChartEl.nativeElement);
    this.updateOrderTrendChart();
  }

  updateOrderTrendChart(): void {
    if (!this.orderTrendChart || !this.orderTrendData) return;

    const data = this.orderTrendData.data;
    const labels = data.map((item) => {
      if (this.orderTrendData?.unit === "week") {
        const date = new Date(item.period);
        return `${date.getMonth() + 1}/${date.getDate()}周`;
      }
      const date = new Date(item.period);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
        },
      },
      legend: {
        data: ["订单数", "销售额"],
        top: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLabel: {
          rotate: this.timeRange === 90 ? 0 : 45,
          interval: this.timeRange === 7 ? 0 : this.timeRange === 30 ? 2 : 0,
        },
      },
      yAxis: [
        {
          type: "value",
          name: "订单数",
          position: "left",
          axisLabel: {
            formatter: "{value}",
          },
        },
        {
          type: "value",
          name: "销售额",
          position: "right",
          axisLabel: {
            formatter: "¥{value}",
          },
        },
      ],
      series: [
        {
          name: "订单数",
          type: "line",
          smooth: true,
          data: data.map((item) => item.orderCount),
          itemStyle: {
            color: "#667eea",
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(102, 126, 234, 0.3)" },
              { offset: 1, color: "rgba(102, 126, 234, 0.05)" },
            ]),
          },
        },
        {
          name: "销售额",
          type: "line",
          smooth: true,
          yAxisIndex: 1,
          data: data.map((item) => item.totalSales),
          itemStyle: {
            color: "#48bb78",
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(72, 187, 120, 0.3)" },
              { offset: 1, color: "rgba(72, 187, 120, 0.05)" },
            ]),
          },
        },
      ],
    };

    this.orderTrendChart.setOption(option, true);
  }

  initProductTop10Chart(): void {
    if (!this.productTop10ChartEl || !this.productTop10Data.length) return;

    this.productTop10Chart = echarts.init(
      this.productTop10ChartEl.nativeElement,
    );
    this.updateProductTop10Chart();

    this.productTop10Chart.on("click", (params: any) => {
      const index = params.dataIndex;
      const product = this.productTop10Data[index];
      if (product) {
        this.navigateToProduct(product.id);
      }
    });
  }

  updateProductTop10Chart(): void {
    if (!this.productTop10Chart || !this.productTop10Data.length) return;

    const data = [...this.productTop10Data].reverse();
    const colors = [
      "#667eea",
      "#764ba2",
      "#48bb78",
      "#ed8936",
      "#e53e3e",
      "#38b2ac",
      "#9f7aea",
      "#f6e05e",
      "#fc8181",
      "#4299e1",
    ].reverse();

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: any) => {
          const item = params[0];
          const product = data[item.dataIndex];
          return `
            <div style="font-weight: bold; margin-bottom: 5px;">${product.productName}</div>
            <div>分类: ${product.categoryName}</div>
            <div>销量: ${product.totalQuantity} 件</div>
            <div>销售额: ¥${product.totalSales.toLocaleString()}</div>
            <div style="color: #667eea; margin-top: 5px; font-size: 12px;">点击查看商品详情</div>
          `;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLabel: {
          formatter: "{value}",
        },
      },
      yAxis: {
        type: "category",
        data: data.map(
          (item, index) => `${data.length - index}. ${item.productName}`,
        ),
        axisLabel: {
          fontSize: 12,
          interval: 0,
        },
      },
      series: [
        {
          name: "销量",
          type: "bar",
          data: data.map((item, index) => ({
            value: item.totalQuantity,
            itemStyle: {
              color: colors[index % colors.length],
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: "60%",
          cursor: "pointer",
        },
      ],
    };

    this.productTop10Chart.setOption(option, true);
  }

  initOrderStatusChart(): void {
    if (!this.orderStatusChartEl || !this.orderStatusData.length) return;

    this.orderStatusChart = echarts.init(this.orderStatusChartEl.nativeElement);
    this.updateOrderStatusChart();
  }

  updateOrderStatusChart(): void {
    if (!this.orderStatusChart || !this.orderStatusData.length) return;

    const STATUS_COLORS: { [key: string]: string } = {
      pending_payment: "#fbbf24",
      paid: "#3b82f6",
      shipped: "#8b5cf6",
      completed: "#10b981",
      cancelled: "#ef4444",
    };

    const data = this.orderStatusData.filter((item) => item.count > 0);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
      },
      legend: {
        orient: "vertical",
        right: "5%",
        top: "center",
        itemWidth: 12,
        itemHeight: 12,
        textStyle: {
          fontSize: 12,
        },
      },
      series: [
        {
          name: "订单状态",
          type: "pie",
          radius: ["40%", "70%"],
          center: ["35%", "50%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: "bold",
            },
          },
          labelLine: {
            show: false,
          },
          data: data.map((item) => ({
            name: item.statusName,
            value: item.count,
            itemStyle: {
              color: STATUS_COLORS[item.status] || "#94a3b8",
            },
          })),
        },
      ],
    };

    this.orderStatusChart.setOption(option, true);
  }

  navigateToProduct(productId: number): void {
    this.router.navigate(['/products', productId]);
  }

  exportToExcel(): void {
    const wb = XLSX.utils.book_new();

    if (this.orderTrendData) {
      const orderTrendSheetData = [
        ["时间", "订单数", "销售额(元)"],
        ...this.orderTrendData.data.map((item) => [
          item.period,
          item.orderCount,
          item.totalSales,
        ]),
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(orderTrendSheetData);
      XLSX.utils.book_append_sheet(wb, ws1, "订单趋势");
    }

    if (this.productTop10Data.length > 0) {
      const productTop10SheetData = [
        ["排名", "商品名称", "分类", "销量(件)", "销售额(元)"],
        ...this.productTop10Data.map((item, index) => [
          index + 1,
          item.productName,
          item.categoryName,
          item.totalQuantity,
          item.totalSales,
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(productTop10SheetData);
      XLSX.utils.book_append_sheet(wb, ws2, "销量TOP10");
    }

    if (this.orderStatusData.length > 0) {
      const orderStatusSheetData = [
        ["状态", "状态名称", "订单数", "占比(%)"],
        ...this.orderStatusData.map((item) => [
          item.status,
          item.statusName,
          item.count,
          item.percentage.toFixed(2),
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(orderStatusSheetData);
      XLSX.utils.book_append_sheet(wb, ws3, "状态分布");
    }

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    XLSX.writeFile(wb, `数据报表_${dateStr}.xlsx`);
  }

  formatCurrency(value: number): string {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(1)}万`;
    }
    return `¥${value.toLocaleString()}`;
  }
}
