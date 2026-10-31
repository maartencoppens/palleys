import "dotenv/config";

// Integration tests write to the database. Refuse anything that isn't a local one.
const url = new URL(process.env.DATABASE_URL ?? "postgresql://missing");
if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
  throw new Error(`Integration tests only run against a local database, not ${url.hostname}`);
}
