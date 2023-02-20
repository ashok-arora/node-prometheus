const express = require("express");
const app = express();
const port = 3010;
const { MongoClient } = require("mongodb");
require("dotenv").config();
var axios = require("axios");

// Connection URI
const uri = "mongodb://rootuser:rootpass@localhost:27017";

// Create a new MongoClient
const client = new MongoClient(uri);

const database = client.db("koinx");
const collection = database.collection("transactions");

async function check_connection() {
  try {
    await client.connect();
    // Establish and verify connection
    await client.db("koinx").command({ ping: 1 });
    console.log("Connected successfully to server");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
check_connection().catch(console.dir);

async function insert_document(doc) {
  try {
    client.connect();
    const filter = { address: doc.address };
    const new_doc = {
      $set: {
        transactions: doc.transactions,
      },
    };

    // Create a document if one with the given `address` does not exist, upsert means update or insert
    const options = { upsert: true };

    const result = await collection.updateOne(filter, new_doc, options);
    console.log(
      `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`
    );
  } finally {
    await client.close();
  }
}

app.get("/", (req, res) => {
  console.log("GET /");
  if (!req.query.address) {
    res.status(400).send("Error: User address missing. ");
  }

  var config = {
    method: "get",
    maxBodyLength: Infinity,
    url:
      "https://api.etherscan.io/api?module=account&action=txlist&address=" +
      req.query.address +
      "&startblock=0&endblock=99999999&sort=asc&apikey=" +
      process.env.ETHERSCAN_APIKEY,
    headers: {},
  };
  axios(config)
    .then(function (response) {
      const doc = {
        address: req.query.address,
        transactions: response.data["result"],
      };
      insert_document(doc).catch(console.dir);
      res.send(JSON.stringify(response.data["result"]));
    })
    .catch(function (error) {
      res.send(error);
    });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
