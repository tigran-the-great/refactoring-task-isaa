import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (email, password, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name',
      [email, hashedPassword, name]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (admin only)
app.post('/api/products', async (req, res) => {
  const { name, description, price, stock } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, stock, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [name, description, price, stock]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product stock
app.patch('/api/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [stock, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { items } = req.body; // items: [{ productId, quantity }]
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  let decoded: any;
  
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const userId = decoded.userId;
  
  try {
      await pool.query('BEGIN');
    
    let totalAmount = 0;
    const orderItems = [];
    
      for (const item of items) {
        const productResult = await pool.query(
        'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
        [item.productId]
      );
      
      if (productResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }
      
      const product = productResult.rows[0];
      
      if (product.stock < item.quantity) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      await pool.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, product.id]
      );
      
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });
    }
    
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total_amount, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [userId, totalAmount, 'pending']
    );
    
    const order = orderResult.rows[0];
    
    for (const item of orderItems) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [order.id, item.productId, item.quantity, item.price]
      );
    }
    
    await pool.query('COMMIT');
    
    const completeOrderResult = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price
              )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [order.id]
    );
    
    res.status(201).json(completeOrderResult.rows[0]);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user orders
app.get('/api/orders', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  let decoded: any;
  
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const userId = decoded.userId;
  
  try {
    const result = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price
              )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel order
app.post('/api/orders/:id/cancel', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { id } = req.params;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  let decoded: any;
  
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const userId = decoded.userId;
  
  try {
    await pool.query('BEGIN');
    
    // Get order
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (orderResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    if (order.status !== 'pending') {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only cancel pending orders' });
    }
    
    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );
    
    for (const item of itemsResult.rows) {
      await pool.query(
        'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
    
    await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', id]
    );
    
    await pool.query('COMMIT');
    
    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order statistics (admin only)
app.get('/api/stats/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value
      FROM orders
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all active coupons
app.get('/api/coupons', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, code, description, discount_type, discount_value, 
             min_order_amount, max_discount_amount, valid_from, valid_until,
             max_uses, max_uses_per_user
      FROM coupons 
      WHERE is_active = true 
        AND (valid_until IS NULL OR valid_until > NOW())
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create coupon (admin only)
app.post('/api/coupons', async (req, res) => {
  const { code, description, discount_type, discount_value, min_order_amount, 
          max_discount_amount, max_uses, max_uses_per_user, valid_until } = req.body;
  
  try {
    const result = await pool.query(`
      INSERT INTO coupons (code, description, discount_type, discount_value, 
                          min_order_amount, max_discount_amount, max_uses, 
                          max_uses_per_user, valid_until, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [code, description, discount_type, discount_value, min_order_amount,
        max_discount_amount, max_uses, max_uses_per_user, valid_until]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Apply coupon to order
app.post('/api/orders/:orderId/apply-coupon', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { orderId } = req.params;
  const { couponCode } = req.body;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  let decoded: any;
  
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const userId = decoded.userId;
  
  try {
    await pool.query('BEGIN');
    
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );
    
    if (orderResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    if (order.status !== 'pending') {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only apply coupons to pending orders' });
    }
    
    const existingCouponResult = await pool.query(
      'SELECT * FROM coupon_usage WHERE order_id = $1',
      [orderId]
    );
    
    if (existingCouponResult.rows.length > 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Order already has a coupon applied' });
    }
    
    const couponResult = await pool.query(
      'SELECT * FROM coupons WHERE code = $1',
      [couponCode]
    );
    
    if (couponResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Coupon not found' });
    }
    
    const coupon = couponResult.rows[0];
    
    if (!coupon.is_active) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Coupon is not active' });
    }
    
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Coupon is not yet valid' });
    }
    
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    
    if (order.total_amount < coupon.min_order_amount) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Order amount must be at least $${coupon.min_order_amount}. Current amount: $${order.total_amount}` 
      });
    }
    
    if (coupon.max_uses !== null) {
      const usageResult = await pool.query(
        'SELECT COUNT(*) as usage_count FROM coupon_usage WHERE coupon_id = $1',
        [coupon.id]
      );
      
      const usageCount = parseInt(usageResult.rows[0].usage_count);
      
      if (usageCount >= coupon.max_uses) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Coupon has reached maximum usage limit' });
      }
    }
    
    if (coupon.max_uses_per_user !== null) {
      const userUsageResult = await pool.query(
        'SELECT COUNT(*) as usage_count FROM coupon_usage WHERE coupon_id = $1 AND user_id = $2',
        [coupon.id, userId]
      );
      
      const userUsageCount = parseInt(userUsageResult.rows[0].usage_count);
      
      if (userUsageCount >= coupon.max_uses_per_user) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'You have already used this coupon the maximum number of times' });
      }
    }
    
    let discountAmount = 0;
    
    if (coupon.discount_type === 'percentage') {
      discountAmount = (order.total_amount * coupon.discount_value) / 100;
      
      if (coupon.max_discount_amount !== null && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = coupon.discount_value;
      
      if (discountAmount > order.total_amount) {
        discountAmount = order.total_amount;
      }
    } else {
      await pool.query('ROLLBACK');
      return res.status(500).json({ error: 'Invalid coupon discount type' });
    }
    
    discountAmount = Math.round(discountAmount * 100) / 100;
    
    const newTotal = order.total_amount - discountAmount;
    
    if (newTotal < 0) {
      await pool.query('ROLLBACK');
      return res.status(500).json({ error: 'Discount calculation error' });
    }
    
    await pool.query(
      'UPDATE orders SET total_amount = $1, updated_at = NOW() WHERE id = $2',
      [newTotal, orderId]
    );
    
    await pool.query(
      'INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [coupon.id, userId, orderId, discountAmount]
    );
    
    await pool.query('COMMIT');
    
    const updatedOrderResult = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price
              )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [orderId]
    );
    
    res.json({
      order: updatedOrderResult.rows[0],
      discount: {
        code: coupon.code,
        amount: discountAmount,
        originalTotal: order.total_amount,
        newTotal: newTotal
      }
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

