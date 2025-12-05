// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const Joi = require("joi");

const app = express();

// ------------------- CORS FIXED -------------------
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://clint-fornt.vercel.app",
  "http://localhost:5173"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server or tools without origin
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS BLOCKED:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

app.use(express.json());

// ------------------- MONGODB CONNECTION -------------------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i76ih3i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let collection;

// CONNECT FUNCTION
async function connectDB() {
  try {
    await client.connect();

    // Ensure connection is alive
    await client.db("admin").command({ ping: 1 });

    const db = client.db("companywork");
    collection = db.collection("selfData");

    console.log("✅ Connected to MongoDB!");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

// ------------------- VALIDATION -------------------
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

// Root Route
app.get("/", (req, res) => {
  res.send("Clint data server is running");
});

// GET all data
app.get("/data", async (req, res) => {
  try {
    const docs = await collection.find({}).toArray();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// GET single data
app.get("/data/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });

    const doc = await collection.findOne({ _id: new ObjectId(id) });

    if (!doc) return res.status(404).json({ error: "Document not found" });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// CREATE new document
app.post("/data", async (req, res) => {
  try {
    const { error, value } = dataSchema.validate(req.body);
    if (error)
      return res.status(400).json({ error: error.details[0].message });

    const result = await collection.insertOne(value);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to insert document" });
  }
});

// DELETE document
app.delete("/data/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Document not found" });

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// UPDATE document (Frontend route matches)
app.put("/data/update/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });

    const { error, value } = dataSchema.validate(req.body);
    if (error)
      return res.status(400).json({ error: error.details[0].message });

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: value }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Document not found" });

    res.json({
      message: "Document updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update document" });
  }
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
