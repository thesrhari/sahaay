const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3001;

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory and the assets directory
app.use(express.static(__dirname));
app.use(
  "/E-Consultation-Listing-Page_files",
  express.static(path.join(__dirname, "E-Consultation Listing Page_files"))
);

// Route for the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "E-Consultation Listing Page.html"));
});

// Route for the comment page
app.get("/comment.html", (req, res) => {
  res.sendFile(path.join(__dirname, "comment.html"));
});

// API route to get comments
app.get("/api/comments", (req, res) => {
  fs.readFile("comments.json", "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        // File doesn't exist
        return res.json([]);
      }
      return res.status(500).send("Error reading comments file.");
    }
    res.json(JSON.parse(data));
  });
});

// API route to add a comment
app.post("/api/comments", (req, res) => {
  const newComment = {
    text: req.body.comment,
    timestamp: new Date().toISOString(),
  };

  fs.readFile("comments.json", "utf8", (err, data) => {
    let comments = [];
    if (!err && data) {
      comments = JSON.parse(data);
    }

    comments.push(newComment);

    fs.writeFile("comments.json", JSON.stringify(comments, null, 2), (err) => {
      if (err) {
        return res.status(500).send("Error saving comment.");
      }
      res.status(201).json(newComment);
    });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
