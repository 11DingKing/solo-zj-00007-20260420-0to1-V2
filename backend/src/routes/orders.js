const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const STATUS_MAP = {
  'pending_payment': '待付款',
  'paid': '已付款',
  'shipped': '已发货',
  'completed': '已完成',
  'cancelled': '已取消'
};

// 获取订单列表（支持筛选和分页）
router.get('/', async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      status, 
      minAmount, 
      maxAmount, 
      page = 1, 
      pageSize = 20 
    } = req.query;

    const conditions = [];
    const params = [];

    // 日期范围筛选
    if (startDate) {
      params.push(startDate);
      conditions.push(`DATE(o.created_at) >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push(`DATE(o.created_at) <= $${params.length}`);
    }

    // 状态筛选
    if (status) {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    // 金额范围筛选
    if (minAmount) {
      params.push(parseFloat(minAmount));
      conditions.push(`o.total_amount >= $${params.length}`);
    }
    if (maxAmount) {
      params.push(parseFloat(maxAmount));
      conditions.push(`o.total_amount <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // 分页参数
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 20;
    const offset = (pageNum - 1) * size;

    // 查询订单数据 - 添加 LIMIT 和 OFFSET 参数
    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;

    const dataQuery = `
      SELECT 
        o.id,
        o.order_no,
        c.name as customer_name,
        o.total_amount,
        o.status,
        o.created_at
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const dataParams = [...params, size, offset];
    const dataResult = await pool.query(dataQuery, dataParams);

    const orders = dataResult.rows.map(row => ({
      id: row.id,
      orderNo: row.order_no,
      customerName: row.customer_name,
      totalAmount: parseFloat(row.total_amount),
      status: row.status,
      statusName: STATUS_MAP[row.status] || row.status,
      createdAt: row.created_at
    }));

    res.json({
      data: orders,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (err) {
    next(err);
  }
});

// 获取订单状态列表
router.get('/statuses', (req, res) => {
  const statuses = [
    { value: 'pending_payment', label: '待付款' },
    { value: 'paid', label: '已付款' },
    { value: 'shipped', label: '已发货' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' }
  ];
  res.json(statuses);
});

module.exports = router;
