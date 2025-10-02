const http = require("http");

function request(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: "localhost", port: 3000, path }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

(async () => {
  try {
    const res = await request("/healthz");
    if (res.status !== 200) {
      console.error("❌ Health check failed", res);
      process.exit(1);
    }
    console.log("✅ Unit test passed");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
