const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 获取今日统计数据
router.get('/today', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as order_count
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
        AND status IN ('paid', 'shipped', 'completed')
    `);
    res.json({
      todaySales: parseFloat(result.rows[0].total_sales) || 0,
      todayOrders: parseInt(result.rows[0].order_count) || 0
    });
  } catch (err) {
    next(err);
  }
});

// 获取本月统计数据
router.get('/month', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as order_count
      FROM orders
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND status IN ('paid', 'shipped', 'completed')
    `);
    res.json({
      monthSales: parseFloat(result.rows[0].total_sales) || 0,
      monthOrders: parseInt(result.rows[0].order_count) || 0
    });
  } catch (err) {
    next(err);
  }
});

// 获取最近 30 天销售额趋势
router.get('/sales-trend', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_amount), 0) as sales_amount
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND status IN ('paid', 'shipped', 'completed')
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    // 生成完整的 30 天日期列表
    const generateDateList = () => {
      const dates = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return dates;
    };

    const dateList = generateDateList();
    const salesMap = {};
    result.rows.forEach(row => {
      salesMap[row.date] = parseFloat(row.sales_amount);
    });

    const trendData = dateList.map(date => ({
      date,
      sales: salesMap[date] || 0
    }));

    res.json(trendData);
  } catch (err) {
    next(err);
  }
});

// 获取各商品分类销售占比
router.get('/category-share', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.name as category_name,
        COALESCE(SUM(oi.subtotal), 0) as sales_amount
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
        AND o.status IN ('paid', 'shipped', 'completed')
      GROUP BY c.id, c.name
      ORDER BY sales_amount DESC
    `);
    
    const totalSales = result.rows.reduce((sum, row) => sum + parseFloat(row.sales_amount), 0);
    
    const categoryData = result.rows.map(row => ({
      category: row.category_name,
      sales: parseFloat(row.sales_amount),
      percentage: totalSales > 0 ? (parseFloat(row.sales_amount) / totalSales * 100) : 0
    }));

    res.json(categoryData);
  } catch (err) {
    next(err);
  }
});

// 获取仪表盘所有统计数据
router.get('/dashboard', async (req, res, next) => {
  try {
    const [todayResult, monthResult, trendResult, categoryResult] = await Promise.all([
      // 今日统计
      pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_sales,
          COUNT(*) as order_count
        FROM orders
        WHERE DATE(created_at) = CURRENT_DATE
          AND status IN ('paid', 'shipped', 'completed')
      `),
      // 本月统计
      pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_sales,
          COUNT(*) as order_count
        FROM orders
        WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND status IN ('paid', 'shipped', 'completed')
      `),
      // 30天趋势
      pool.query(`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(total_amount), 0) as sales_amount
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND status IN ('paid', 'shipped', 'completed')
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      // 分类占比
      pool.query(`
        SELECT 
          c.name as category_name,
          COALESCE(SUM(oi.subtotal), 0) as sales_amount
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id
          AND o.status IN ('paid', 'shipped', 'completed')
        GROUP BY c.id, c.name
        ORDER BY sales_amount DESC
      `)
    ]);

    // 处理 30 天趋势数据
    const generateDateList = () => {
      const dates = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return dates;
    };

    const dateList = generateDateList();
    const salesMap = {};
    trendResult.rows.forEach(row => {
      salesMap[row.date] = parseFloat(row.sales_amount);
    });

    const salesTrend = dateList.map(date => ({
      date,
      sales: salesMap[date] || 0
    }));

    // 处理分类占比数据
    const totalSales = categoryResult.rows.reduce((sum, row) => sum + parseFloat(row.sales_amount), 0);
    const categoryShare = categoryResult.rows.map(row => ({
      category: row.category_name,
      sales: parseFloat(row.sales_amount),
      percentage: totalSales > 0 ? (parseFloat(row.sales_amount) / totalSales * 100) : 0
    }));

    res.json({
      todaySales: parseFloat(todayResult.rows[0].total_sales) || 0,
      todayOrders: parseInt(todayResult.rows[0].order_count) || 0,
      monthSales: parseFloat(monthResult.rows[0].total_sales) || 0,
      monthOrders: parseInt(monthResult.rows[0].order_count) || 0,
      salesTrend,
      categoryShare
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
