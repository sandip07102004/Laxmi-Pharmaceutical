const mongoose = require('mongoose');
const { getDbStatus } = require('../config/db');

const orderItemSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  dosage: { type: String },
  pack: { type: String },
  slot: { type: String }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true
  },
  orderType: {
    type: String,
    enum: ['regular', 'refill'],
    default: 'regular'
  },
  fulfillmentType: {
    type: String,
    enum: ['takeaway', 'delivery'],
    default: 'takeaway'
  },
  refillDetails: {
    cycleFrequency: { type: String },
    deliverySlot: { type: String },
    nextRefillDate: { type: String }
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Items array is required'],
    validate: [v => Array.isArray(v) && v.length > 0, 'Order must contain at least one item']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'dispensed', 'cancelled'],
    default: 'confirmed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MongooseOrder = mongoose.model('Order', orderSchema);

// In-memory storage fallback for when MongoDB daemon is not running locally
const inMemoryOrders = [];

const saveOrder = async (orderData) => {
  if (getDbStatus()) {
    return await MongooseOrder.create(orderData);
  }

  // Graceful in-memory fallback
  const fallbackOrder = {
    _id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...orderData,
    status: orderData.status || 'confirmed',
    createdAt: new Date(),
    _storageType: 'in-memory'
  };
  inMemoryOrders.push(fallbackOrder);
  console.log(`[Order Saved] Order ${fallbackOrder._id} saved to memory (MongoDB offline).`);
  return fallbackOrder;
};

const getOrders = async () => {
  if (getDbStatus()) {
    return await MongooseOrder.find().sort({ createdAt: -1 });
  }
  return inMemoryOrders;
};

module.exports = {
  Order: MongooseOrder,
  saveOrder,
  getOrders
};
