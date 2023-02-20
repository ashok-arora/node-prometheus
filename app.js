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
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    // Establish and verify connection
    await client.db("koinx").command({ ping: 1 });
    console.log("Connected successfully to server");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
check_connection().catch(console.dir);

async function insert_document(doc) {
  try {
    const result = await collection.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
  } finally {
    await client.close();
  }
}

app.get("/", (req, res) => {
  console.log("GET /");
  //   console.log("Active connections: " + active_connections);
  if (!req.query.address) {
    // const err = new Error("Error: User address missing. ");
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
      const transactions = response.data["result"];
      client.connect();
      const existing_address = database
        .collection("users")
        .findOne({ address: req.query.address });
      if (existing_address && existing_address.length > 0) {
        console.log("Address already exists");
      } else {
        insert_document(doc).catch(console.dir);
      }
      res.send(JSON.stringify(transactions));
    })
    .catch(function (error) {
      res.send(error);
    });

  //   res.send(process.env.ETHERSCAN_APIKEY);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
