const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 获取商品销售排行
router.get('/ranking', async (req, res, next) => {
  try {
    const { timeRange = '30', sortBy = 'sales' } = req.query;

    // 时间范围映射：7, 30, 90 天
    const days = parseInt(timeRange) || 30;
    const validDays = [7, 30, 90];
    const actualDays = validDays.includes(days) ? days : 30;

    // 排序方式：sales（销售额）或 quantity（销售量）
    const sortField = sortBy === 'quantity' ? 'total_quantity' : 'total_sales';
    const sortOrder = 'DESC';

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
        AND o.created_at >= CURRENT_DATE - INTERVAL '${actualDays} days'
        AND o.status IN ('paid', 'shipped', 'completed')
      GROUP BY p.id, p.name, c.id, c.name
      ORDER BY ${sortField} ${sortOrder}
      LIMIT 20
    `;

    const result = await pool.query(query);

    const ranking = result.rows.map(row => ({
      id: row.id,
      productName: row.product_name,
      categoryName: row.category_name,
      totalQuantity: parseInt(row.total_quantity),
      totalSales: parseFloat(row.total_sales)
    }));

    res.json(ranking);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
