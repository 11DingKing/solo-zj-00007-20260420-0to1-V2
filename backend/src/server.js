const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/database");
const statsModule = require("./routes/stats");
const ordersRoutes = require("./routes/orders");
const productsRoutes = require("./routes/products");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Sales Dashboard API is running" });
});

app.use("/api/stats", statsModule.router);

app.post("/api/orders", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { customerId, items } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    const orderNo =
      "ORD" +
      Date.now().toString() +
      Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");

    let totalAmount = 0;
    for (const item of items) {
      const productResult = await client.query(
        "SELECT price FROM products WHERE id = $1",
        [item.productId],
      );
      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: `Product not found: ${item.productId}` });
      }
      totalAmount += productResult.rows[0].price * item.quantity;
    }

    const orderResult = await client.query(
      `INSERT INTO orders (order_no, customer_id, status, total_amount, created_at)
       VALUES ($1, $2, 'pending_payment', $3, CURRENT_TIMESTAMP)
       RETURNING id, order_no, total_amount, created_at`,
      [orderNo, customerId, totalAmount],
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      const productResult = await client.query(
        "SELECT price FROM products WHERE id = $1",
        [item.productId],
      );
      const unitPrice = productResult.rows[0].price;
      const subtotal = unitPrice * item.quantity;

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.productId, item.quantity, unitPrice, subtotal],
      );
    }

    await client.query("COMMIT");

    statsModule.clearStatsCache();

    res.status(201).json({
      id: orderId,
      orderNo: orderResult.rows[0].order_no,
      totalAmount: parseFloat(orderResult.rows[0].total_amount),
      createdAt: orderResult.rows[0].created_at,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

app.use("/api/orders", ordersRoutes);
app.use("/api/products", productsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
