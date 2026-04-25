const express = require("express");
const router = express.Router();
const pool = require("../config/database");

const STATUS_MAP = {
  pending_payment: "待付款",
  paid: "已付款",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
};

// 获取商品详情及关联订单
router.get("/:id", async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const productQuery = `
      SELECT 
        p.id,
        p.name as product_name,
        c.name as category_name,
        p.price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;

    const productResult = await pool.query(productQuery, [productId]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = {
      id: productResult.rows[0].id,
      productName: productResult.rows[0].product_name,
      categoryName: productResult.rows[0].category_name,
      price: parseFloat(productResult.rows[0].price),
    };

    const ordersQuery = `
      SELECT 
        o.order_no,
        oi.quantity,
        oi.subtotal,
        o.status,
        o.created_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1
      ORDER BY o.created_at DESC
      LIMIT 20
    `;

    const ordersResult = await pool.query(ordersQuery, [productId]);

    const orders = ordersResult.rows.map((row) => ({
      orderNo: row.order_no,
      quantity: parseInt(row.quantity),
      subtotal: parseFloat(row.subtotal),
      status: row.status,
      statusName: STATUS_MAP[row.status] || row.status,
      createdAt: row.created_at,
    }));

    res.json({
      product,
      orders,
    });
  } catch (err) {
    next(err);
  }
});

// 获取商品销售排行
router.get("/ranking", async (req, res, next) => {
  try {
    const { timeRange = "30", sortBy = "sales" } = req.query;

    // 时间范围映射：7, 30, 90 天
    const days = parseInt(timeRange) || 30;
    const validDays = [7, 30, 90];
    const actualDays = validDays.includes(days) ? days : 30;

    // 排序方式：sales（销售额）或 quantity（销售量）
    const sortField = sortBy === "quantity" ? "total_quantity" : "total_sales";
    const sortOrder = "DESC";

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

    const ranking = result.rows.map((row) => ({
      id: row.id,
      productName: row.product_name,
      categoryName: row.category_name,
      totalQuantity: parseInt(row.total_quantity),
      totalSales: parseFloat(row.total_sales),
    }));

    res.json(ranking);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
