import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.VERCEL = "1";
process.env.ALLOWED_ORIGINS = "https://frontend.example.com";

const { default: app } = await import("../server.js");

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint is independent of the database", async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    message: "HangOut server is running",
  });
});

test("unknown routes return JSON 404", async () => {
  const response = await fetch(`${baseUrl}/missing`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).message, "Route not found");
});

test("protected routes reject missing authentication before database access", async () => {
  const response = await fetch(`${baseUrl}/api/user/data`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
});

test("approved CORS preflight succeeds", async () => {
  const response = await fetch(`${baseUrl}/api/user/data`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://frontend.example.com",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "Authorization,Content-Type",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://frontend.example.com"
  );
});

test("unapproved CORS origin is rejected", async () => {
  const response = await fetch(`${baseUrl}/`, {
    headers: { Origin: "https://blocked.example.com" },
  });
  assert.equal(response.status, 403);
});

test("Inngest endpoint is registered", async () => {
  const response = await fetch(`${baseUrl}/api/inngest`);
  assert.notEqual(response.status, 404);
});
