const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const CACHE_TTL = 5 * 60 * 1000;
const cache = {
  orderTrend: { data: null, timestamp: 0 },
  productTop10: { data: null, timestamp: 0 },
  orderStatus: { data: null, timestamp: 0 }
};

function isCacheValid(cacheKey) {
  const entry = cache[cacheKey];
  return entry.data && (Date.now() - entry.timestamp < CACHE_TTL);
}

function setCache(cacheKey, data) {
  cache[cacheKey] = { data, timestamp: Date.now() };
}

function clearStatsCache() {
  cache.orderTrend = { data: null, timestamp: 0 };
  cache.productTop10 = { data: null, timestamp: 0 };
  cache.orderStatus = { data: null, timestamp: 0 };
}

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

router.get('/order-trend', async (req, res, next) => {
  try {
    const { range = '30' } = req.query;
    const days = parseInt(range) || 30;
    const validDays = [7, 30, 90];
    const actualDays = validDays.includes(days) ? days : 30;
    
    let dateTruncUnit = 'day';
    if (actualDays === 90) {
      dateTruncUnit = 'week';
    }

    const query = `
      SELECT 
        DATE_TRUNC('${dateTruncUnit}', created_at)::date as period,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '${actualDays} days'
        AND status IN ('paid', 'shipped', 'completed')
      GROUP BY period
      ORDER BY period
    `;

    const result = await pool.query(query);
    
    let data;
    if (dateTruncUnit === 'week') {
      data = result.rows.map(row => ({
        period: row.period,
        orderCount: parseInt(row.order_count),
        totalSales: parseFloat(row.total_sales)
      }));
    } else {
      const generateDateList = () => {
        const dates = [];
        const today = new Date();
        for (let i = actualDays - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
      };

      const dateList = generateDateList();
      const dataMap = {};
      result.rows.forEach(row => {
        dataMap[row.period] = {
          orderCount: parseInt(row.order_count),
          totalSales: parseFloat(row.total_sales)
        };
      });

      data = dateList.map(date => ({
        period: date,
        orderCount: dataMap[date]?.orderCount || 0,
        totalSales: dataMap[date]?.totalSales || 0
      }));
    }

    res.json({ days: actualDays, unit: dateTruncUnit, data });
  } catch (err) {
    next(err);
  }
});

router.get('/product-top10', async (req, res, next) => {
  try {
    if (isCacheValid('productTop10')) {
      return res.json(cache.productTop10.data);
    }

    const query = `
      SELECT 
        p.id,
        p.name as product_name,
        c.name as category_name,
        COALESCE(SUM(oi.quantity), 0) as total_quantity,
        COALESCE(SUM(oi.subtotal), 0) as total_sales
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
        AND o.status IN ('paid', 'shipped', 'completed')
      GROUP BY p.id, p.name, c.id, c.name
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    const result = await pool.query(query);

    const data = result.rows.map(row => ({
      id: row.id,
      productName: row.product_name,
      categoryName: row.category_name,
      totalQuantity: parseInt(row.total_quantity),
      totalSales: parseFloat(row.total_sales)
    }));

    setCache('productTop10', data);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/order-status', async (req, res, next) => {
  try {
    if (isCacheValid('orderStatus')) {
      return res.json(cache.orderStatus.data);
    }

    const STATUS_MAP = {
      'pending_payment': '待付款',
      'paid': '已付款',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消'
    };

    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await pool.query(query);

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const data = result.rows.map(row => ({
      status: row.status,
      statusName: STATUS_MAP[row.status] || row.status,
      count: parseInt(row.count),
      percentage: total > 0 ? (parseInt(row.count) / total * 100) : 0
    }));

    setCache('orderStatus', data);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

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

router.get('/dashboard', async (req, res, next) => {
  try {
    const [todayResult, monthResult, trendResult, categoryResult] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_sales,
          COUNT(*) as order_count
        FROM orders
        WHERE DATE(created_at) = CURRENT_DATE
          AND status IN ('paid', 'shipped', 'completed')
      `),
      pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_sales,
          COUNT(*) as order_count
        FROM orders
        WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND status IN ('paid', 'shipped', 'completed')
      `),
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
      pool.query(`
        SELECT 
          c.name as category_name,
          COALESCE(SUM(oi.subtotal), 0) as sales_amount
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id
          AND o.status IN ('paid', 'shipped', 'completed')
        GROUP BY c.id, c.name
        ORDER BY sales_amount DESC
      `)
    ]);

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

router.post('/clear-cache', (req, res) => {
  clearStatsCache();
  res.json({ message: 'Cache cleared successfully' });
});

module.exports = { router, clearStatsCache };
