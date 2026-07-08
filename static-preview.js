// Zero-dependency static file server for local preview (no Stripe backend).
// Usage: node static-preview.js  ->  http://localhost:4311
// For the full card payment flow use `npm start` (server.js) instead.
const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "public");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(root, p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(4311, () => console.log("Preview on http://localhost:4311"));
