// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const Joi = require("joi");

const app = express();

// ==================== CORS FIX ====================
// Option 1: সবাইকে allow (সর্বোচ্চ সহজ)
app.use(cors({
  origin: "*",  // সবাইকে access দিলে
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Option 2: শুধু তোমার frontend (প্রোডাকশন)
// app.use(cors({
//   origin: "https://clint-forntend.vercel.app",
//   credentials: true
// }));

// CORS headers manually
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
});

// JSON parser
app.use(express.json());

// ==================== MONGODB ====================
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i76ih3i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let collection;

async function connectDB() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    
    const db = client.db("companywork");
    collection = db.collection("selfData");
    
    console.log("✅ MongoDB connected!");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

// ==================== VALIDATION ====================
const dataSchema = Joi.object({
  facebookPage: Joi.string().allow("").optional(),
  facebookFollowers: Joi.number().optional(),
  linkedin: Joi.string().allow("").optional(),
  websiteExists: Joi.boolean().optional(),
  successRate: Joi.number().optional(),
  problems: Joi.array().items(Joi.string()).optional(),
  solutions: Joi.array().items(Joi.string()).optional(),
});

// ==================== ROUTES ====================

// Health Check
app.get("/", (req, res) => {
  res.json({ 
    message: "Clint data server চলছে 🚀",
    status: "active",
    cors: "enabled",
    timestamp: new Date().toISOString()
  });
});

// GET সব data
app.get("/data", async (req, res) => {
  try {
    console.log("📦 Fetching all data...");
    const docs = await collection.find({}).toArray();
    res.json({
      success: true,
      count: docs.length,
      data: docs,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ GET /data error:", err);
    res.status(500).json({ 
      success: false,
      error: "ডাটা আনা ব্যর্থ হয়েছে",
      details: err.message 
    });
  }
});

// GET single data
app.get("/data/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "অবৈধ ID" 
      });
    }

    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return res.status(404).json({ 
        success: false, 
        error: "ডকুমেন্ট পাওয়া যায়নি" 
      });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: "ডকুমেন্ট আনা ব্যর্থ হয়েছে" 
    });
  }
});

// CREATE new document
app.post("/data", async (req, res) => {
  try {
    console.log("➕ Creating new document:", req.body);
    
    const { error, value } = dataSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const result = await collection.insertOne(value);
    res.status(201).json({
      success: true,
      message: "ডাটা সফলভাবে সংরক্ষণ হয়েছে",
      insertedId: result.insertedId
    });
  } catch (err) {
    console.error("❌ POST /data error:", err);
    res.status(500).json({ 
      success: false, 
      error: "ডকুমেন্ট সংরক্ষণ ব্যর্থ হয়েছে" 
    });
  }
});

// DELETE document
app.delete("/data/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "অবৈধ ID" 
      });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "ডকুমেন্ট পাওয়া যায়নি" 
      });
    }

    res.json({ 
      success: true, 
      message: "ডকুমেন্ট সফলভাবে মুছে ফেলা হয়েছে" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: "ডকুমেন্ট মুছে ফেলা ব্যর্থ হয়েছে" 
    });
  }
});

// UPDATE document
app.put("/data/update/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "অবৈধ ID" 
      });
    }

    const { error, value } = dataSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: value }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "ডকুমেন্ট পাওয়া যায়নি" 
      });
    }

    res.json({
      success: true,
      message: "ডকুমেন্ট সফলভাবে আপডেট হয়েছে",
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: "ডকুমেন্ট আপডেট ব্যর্থ হয়েছে" 
    });
  }
});

// Test route
app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "API working perfectly!",
    cors: "enabled",
    frontend: "https://clint-forntend.vercel.app",
    timestamp: new Date().toISOString()
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port: ${PORT}`);
    console.log(`🌐 CORS enabled for all origins`);
    console.log(`📡 Test URL: http://localhost:${PORT}/test`);
  });
});

// Handle errors
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled rejection:", err);
});