-- 商品分类表
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    price DECIMAL(10, 2) NOT NULL
);

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending_payment', 'paid', 'shipped', 'completed', 'cancelled')),
    total_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- 插入商品分类
INSERT INTO categories (name) VALUES 
('电子产品'),
('服装'),
('家居用品'),
('食品'),
('图书'),
('美妆护肤'),
('运动户外'),
('母婴用品')
ON CONFLICT (name) DO NOTHING;

-- 插入商品
INSERT INTO products (name, category_id, price) VALUES 
('智能手机', 1, 3999.00),
('笔记本电脑', 1, 5999.00),
('平板电脑', 1, 2999.00),
('无线耳机', 1, 599.00),
('智能手表', 1, 1299.00),
('男士T恤', 2, 129.00),
('女士连衣裙', 2, 299.00),
('牛仔裤', 2, 399.00),
('运动鞋', 2, 599.00),
('休闲夹克', 2, 459.00),
('沙发', 3, 2999.00),
('餐桌', 3, 1599.00),
('台灯', 3, 199.00),
('床上四件套', 3, 399.00),
('收纳箱', 3, 89.00),
('进口牛奶', 4, 69.00),
('有机大米', 4, 128.00),
('进口巧克力', 4, 89.00),
('坚果礼盒', 4, 158.00),
('茶叶礼盒', 4, 298.00),
('编程入门', 5, 59.00),
('设计思维', 5, 78.00),
('商业管理', 5, 89.00),
('小说畅销书', 5, 45.00),
('儿童绘本', 5, 39.00),
('保湿面霜', 6, 199.00),
('精华液', 6, 399.00),
('面膜套装', 6, 159.00),
('口红', 6, 299.00),
('防晒霜', 6, 129.00),
('篮球', 7, 199.00),
('羽毛球拍', 7, 299.00),
('瑜伽垫', 7, 89.00),
('健身器材', 7, 599.00),
('登山鞋', 7, 459.00),
('婴儿奶粉', 8, 298.00),
('纸尿裤', 8, 158.00),
('婴儿车', 8, 1299.00),
('玩具套装', 8, 259.00),
('儿童服饰', 8, 129.00)
ON CONFLICT (name) DO NOTHING;

-- 插入客户
INSERT INTO customers (name) VALUES 
('张三'),
('李四'),
('王五'),
('赵六'),
('孙七'),
('周八'),
('吴九'),
('郑十'),
('陈一'),
('林二'),
('黄三'),
('刘四'),
('杨五'),
('朱六'),
('秦七'),
('尤八'),
('许九'),
('何十'),
('吕一'),
('施二'),
('张小明'),
('李小红'),
('王大伟'),
('赵丽丽'),
('孙志强'),
('周美玲'),
('吴建国'),
('郑雅文'),
('陈思远'),
('林雨桐'),
('黄天宇'),
('刘子豪'),
('杨思琪'),
('朱文博'),
('秦晓燕'),
('尤俊杰'),
('许梦婷'),
('何浩然'),
('吕佳怡')
ON CONFLICT (name) DO NOTHING;

-- 生成模拟订单数据
-- 创建函数生成随机日期
CREATE OR REPLACE FUNCTION random_date(days_back INTEGER)
RETURNS TIMESTAMP AS $$
BEGIN
    RETURN NOW() - (RANDOM() * days_back)::INTEGER * INTERVAL '1 day' - (RANDOM() * 24)::INTEGER * INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- 创建函数生成随机订单号
CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'ORD' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 插入 250 条订单数据
DO $$
DECLARE
    i INTEGER;
    v_order_no VARCHAR;
    v_customer_id INTEGER;
    v_status VARCHAR;
    v_created_at TIMESTAMP;
    v_total_amount DECIMAL(12, 2);
    v_order_id INTEGER;
    v_product_id INTEGER;
    v_quantity INTEGER;
    v_unit_price DECIMAL(10, 2);
    v_subtotal DECIMAL(12, 2);
    v_statuses VARCHAR[] := ARRAY['pending_payment', 'paid', 'shipped', 'completed', 'cancelled'];
    v_status_weights INTEGER[] := ARRAY[5, 25, 15, 50, 5];
    v_total_weight INTEGER;
    v_rand INTEGER;
    v_idx INTEGER;
    v_cumulative INTEGER;
    v_product_count INTEGER;
BEGIN
    -- 获取商品总数
    SELECT COUNT(*) INTO v_product_count FROM products;
    
    FOR i IN 1..250 LOOP
        -- 生成订单号
        v_order_no := 'ORD' || TO_CHAR(NOW() - (i * INTERVAL '1 hour'), 'YYYYMMDD') || LPAD(i::TEXT, 5, '0');
        
        -- 随机客户 (1-40)
        v_customer_id := FLOOR(RANDOM() * 40) + 1;
        
        -- 根据权重选择订单状态
        v_total_weight := 100;
        v_rand := FLOOR(RANDOM() * v_total_weight) + 1;
        v_cumulative := 0;
        v_idx := 1;
        
        WHILE v_idx <= array_length(v_statuses, 1) LOOP
            v_cumulative := v_cumulative + v_status_weights[v_idx];
            IF v_rand <= v_cumulative THEN
                v_status := v_statuses[v_idx];
                EXIT;
            END IF;
            v_idx := v_idx + 1;
        END LOOP;
        
        -- 生成随机日期 (最近 90 天内)
        v_created_at := random_date(90);
        
        -- 插入订单
        INSERT INTO orders (order_no, customer_id, status, total_amount, created_at)
        VALUES (v_order_no, v_customer_id, v_status, 0, v_created_at)
        RETURNING id INTO v_order_id;
        
        -- 插入 1-3 个订单明细
        v_total_amount := 0;
        FOR j IN 1..FLOOR(RANDOM() * 3) + 1 LOOP
            -- 随机商品
            v_product_id := FLOOR(RANDOM() * v_product_count) + 1;
            SELECT price INTO v_unit_price FROM products WHERE id = v_product_id;
            
            -- 随机数量 (1-5)
            v_quantity := FLOOR(RANDOM() * 5) + 1;
            v_subtotal := v_quantity * v_unit_price;
            v_total_amount := v_total_amount + v_subtotal;
            
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
            VALUES (v_order_id, v_product_id, v_quantity, v_unit_price, v_subtotal);
        END LOOP;
        
        -- 更新订单总金额
        UPDATE orders SET total_amount = v_total_amount WHERE id = v_order_id;
    END LOOP;
END $$;
