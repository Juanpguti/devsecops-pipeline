const express = require("express");
const app = express();

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Hello from DevSecOps secure pipeline 👋" });
});

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ----- VULNERABILIDAD 1: uso de eval() (SAST - Semgrep lo detectará) -----
app.get("/vuln-eval", (req, res) => {
  // WARNING: código inseguro intencional para pruebas
  const code = req.query.code || "1+1";
  try {
    const result = eval(code); // <- esto es exactamente lo que Semgrep busca
    res.json({ ok: true, result });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e) });
  }
});

// ----- VULNERABILIDAD 2: endpoint reflejado sin escape (DAST - ZAP puede marcarlo) -----
app.get("/reflect", (req, res) => {
  const msg = req.query.msg || "";
  // WARNING: devolvemos directamente user input SIN sanitizar
  res.send(`<html><body><h1>Message</h1><div>${msg}</div></body></html>`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}`));
