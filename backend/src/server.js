const express = require('express');
const cors = require('cors');
require('dotenv').config();

const statsRoutes = require('./routes/stats');
const ordersRoutes = require('./routes/orders');
const productsRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sales Dashboard API is running' });
});

// 统计接口
app.use('/api/stats', statsRoutes);

// 订单管理接口
app.use('/api/orders', ordersRoutes);

// 商品排行接口
app.use('/api/products', productsRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
