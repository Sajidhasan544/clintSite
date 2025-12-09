// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const Joi = require("joi");

const app = express();

// ==================== CORS ====================
app.use(cors({
  origin: "*",
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
});

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
// ✔️ Only Company_Name required
// ✔️ All other fields optional + allow("")
const dataSchema = Joi.object({
  Company_Name: Joi.string().required(),

  Contact_Person: Joi.string().allow("").optional(),
  Contact_Number: Joi.string().allow("").optional(),
  Mail: Joi.string().allow("").optional(),
  Address: Joi.string().allow("").optional(),
  Support_Person: Joi.string().allow("").optional(),

  facebookPage: Joi.string().allow("").optional(),
  facebookFollowers: Joi.number().optional(),
  linkedin: Joi.string().allow("").optional(),
  websiteExists: Joi.boolean().optional(),
  successRate: Joi.number().optional(),
  problems: Joi.array().items(Joi.string()).optional(),
  solutions: Joi.array().items(Joi.string()).optional(),

  createdAt: Joi.date().optional(),
  updatedAt: Joi.date().optional()
});

// ==================== ROUTES ====================

// Health Check
app.get("/", (req, res) => {
  res.json({ 
    message: "Company Data Server Running 🚀",
    status: "active",
    cors: "enabled",
    timestamp: new Date().toISOString()
  });
});

// GET ALL data
app.get("/data", async (req, res) => {
  try {
    console.log("📦 Fetching all data...");
    const docs = await collection.find({}).toArray();
    
    const transformedData = docs.map(doc => ({
      ...doc,
      _id: doc._id,
      Company_Name: doc.Company_Name || doc.facebookPage || "",
      Contact_Person: doc.Contact_Person || doc.linkedin || "",
      Contact_Number: doc.Contact_Number || "",
      Mail: doc.Mail || "",
      Address: doc.Address || "",
      Support_Person: doc.Support_Person || "",
      facebookPage: doc.facebookPage || doc.Company_Name || "",
      linkedin: doc.linkedin || doc.Contact_Person || ""
    }));
    
    res.json({
      success: true,
      count: transformedData.length,
      data: transformedData,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ GET /data error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch data",
      details: err.message 
    });
  }
});

// GET SINGLE data by ID
app.get("/data/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid ID format" 
      });
    }

    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return res.status(404).json({ 
        success: false, 
        error: "Document not found" 
      });
    }

    res.json({ 
      success: true, 
      data: doc 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch document" 
    });
  }
});

// CREATE
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

    const dataToInsert = {
      ...value,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(dataToInsert);
    
    res.status(201).json({
      success: true,
      message: "Company data saved successfully",
      insertedId: result.insertedId,
      data: dataToInsert
    });
  } catch (err) {
    console.error("❌ POST /data error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to save data",
      details: err.message 
    });
  }
});

// UPDATE
app.put("/data/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid ID" 
      });
    }

    const { error, value } = dataSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const updateData = {
      ...value,
      updatedAt: new Date()
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Document not found" 
      });
    }

    res.json({
      success: true,
      message: "Document updated successfully",
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: "Failed to update document" 
    });
  }
});

// DELETE
app.delete("/data/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid ID" 
      });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Document not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Document deleted successfully" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: "Failed to delete document" 
    });
  }
});

// SEARCH
app.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Search query required"
      });
    }

    const searchQuery = {
      $or: [
        { Company_Name: { $regex: q, $options: "i" } },
        { Contact_Person: { $regex: q, $options: "i" } },
        { Contact_Number: { $regex: q, $options: "i" } },
        { Mail: { $regex: q, $options: "i" } },
        { Address: { $regex: q, $options: "i" } }
      ]
    };

    const results = await collection.find(searchQuery).toArray();
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({
      success: false,
      error: "Search failed"
    });
  }
});

// TEST endpoint
app.get("/test", async (req, res) => {
  try {
    const count = await collection.countDocuments();
    
    res.json({
      success: true,
      message: "API is working perfectly!",
      database: "Connected",
      totalRecords: count,
      cors: "enabled",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Database connection failed"
    });
  }
});

// BULK insert
app.post("/data/bulk", async (req, res) => {
  try {
    const { companies } = req.body;
    
    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Companies array required"
      });
    }

    const validatedCompanies = [];
    for (const company of companies) {
      const { error, value } = dataSchema.validate(company);
      if (error) {
        return res.status(400).json({
          success: false,
          error: `Invalid data: ${error.details[0].message}`
        });
      }
      validatedCompanies.push({
        ...value,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    const result = await collection.insertMany(validatedCompanies);
    
    res.status(201).json({
      success: true,
      message: `${result.insertedCount} companies added successfully`,
      insertedIds: result.insertedIds
    });
  } catch (err) {
    console.error("❌ Bulk insert error:", err);
    res.status(500).json({
      success: false,
      error: "Bulk insert failed"
    });
  }
});

// ==================== ERROR HANDLING ====================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port: ${PORT}`);
    console.log(`🌐 CORS enabled for all origins`);
    console.log(`📡 API Base URL: http://localhost:${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/`);
    console.log(`📊 Test Endpoint: http://localhost:${PORT}/test`);
  });
});

// Handle shutdown gracefully
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Closing connections...");
  await client.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Closing connections...");
  await client.close();
  process.exit(0);
});
