// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();

app.use(cors());

app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i76ih3i.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Clint data server is running');
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db('companywork');
    const collection = db.collection('selfData');

    // GET all data
    app.get('/data', async (req, res) => {
      try {
        const docs = await collection.find({}).toArray();
        res.json(docs);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch data" });
      }
    });

    // GET single document
    app.get('/data/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const doc = await collection.findOne({ _id: new ObjectId(id) });
        res.json(doc);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch document" });
      }
    });

    // CREATE new document
    app.post('/data', async (req, res) => {
      try {
        const newDoc = req.body;
        const result = await collection.insertOne(newDoc);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to insert document" });
      }
    });

    // DELETE document
    app.delete('/data/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete document" });
      }
    });

    // UPDATE document
    app.put('/data/update/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        const fieldsToUpdate = {
          facebookPage: updateData.facebookPage,
          facebookFollowers: updateData.facebookFollowers,
          linkedin: updateData.linkedin,
          websiteExists: updateData.websiteExists,
          successRate: updateData.successRate,
          problems: updateData.problems,
          solutions: updateData.solutions,
        };

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach(key => {
          if (fieldsToUpdate[key] === undefined) {
            delete fieldsToUpdate[key];
          }
        });

        const result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: fieldsToUpdate }
        );

        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update document" });
      }
    });

  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
