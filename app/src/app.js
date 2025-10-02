const express = require("express");
const app = express();

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Hello from DevSecOps secure pipeline 👋" });
});

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}`));
