// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const Joi = require("joi");

const app = express();

// ------------------- CORS সেটআপ -------------------
// এখানে frontend URL গুলো add করো
const allowedOrigins = [
  process.env.FRONTEND_URL,             // যদি তুমি .env এ FRONTEND_URL রাখ    // তোমার Vercel frontend
  "https://clint-fornt.vercel.app",    // শেষের / দিয়েও add করা
  "http://localhost:5173",            // local dev
];

app.use(cors({
  origin: allowedOrigins,
  credentials:true
}));

// JSON request handle করার জন্য
app.use(express.json());

// ------------------- MONGODB কানেকশন -------------------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i76ih3i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let collection;

// ------------------- MongoDB connect function -------------------
async function connectDB() {
  try {
    await client.connect();
    // connection check
    await client.db("admin").command({ ping: 1 });

    const db = client.db("companywork");
    collection = db.collection("selfData");

    console.log("✅ MongoDB এর সাথে সংযোগ সফল!");
  } catch (err) {
    console.error("❌ MongoDB সংযোগ ব্যর্থ:", err);
    process.exit(1);
  }
}

// ------------------- Data validation -------------------
const dataSchema = Joi.object({
  facebookPage: Joi.string().allow("").optional(),
  facebookFollowers: Joi.number().optional(),
  linkedin: Joi.string().allow("").optional(),
  websiteExists: Joi.boolean().optional(),
  successRate: Joi.number().optional(),
  problems: Joi.array().items(Joi.string()).optional(),
  solutions: Joi.array().items(Joi.string()).optional(),
});

// ------------------- ROUTES -------------------

// Root route
app.get("/", (req, res) => {
  res.send("Clint data server চলছে 🚀");
});

// GET সব data
app.get("/data", async (req, res) => {
  try {
    const docs = await collection.find({}).toArray();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ডাটা আনা ব্যর্থ হয়েছে" });
  }
});

// GET single data
app.get("/data/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "অবৈধ ID" });

    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).json({ error: "ডকুমেন্ট পাওয়া যায়নি" });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "ডকুমেন্ট আনা ব্যর্থ হয়েছে" });
  }
});

// CREATE new document
app.post("/data", async (req, res) => {
  try {
    const { error, value } = dataSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await collection.insertOne(value);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "ডকুমেন্ট সংরক্ষণ ব্যর্থ হয়েছে" });
  }
});

// DELETE document
app.delete("/data/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "অবৈধ ID" });

    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "ডকুমেন্ট পাওয়া যায়নি" });

    res.json({ message: "ডকুমেন্ট সফলভাবে মুছে ফেলা হয়েছে" });
  } catch (err) {
    res.status(500).json({ error: "ডকুমেন্ট মুছে ফেলা ব্যর্থ হয়েছে" });
  }
});

// UPDATE document
app.put("/data/update/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "অবৈধ ID" });

    const { error, value } = dataSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: value }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "ডকুমেন্ট পাওয়া যায়নি" });

    res.json({
      message: "ডকুমেন্ট সফলভাবে আপডেট হয়েছে",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ error: "ডকুমেন্ট আপডেট ব্যর্থ হয়েছে" });
  }
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server চলছে port: ${PORT}`);
  });
});
