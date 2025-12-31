import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./db";
import recipes from "./routes/recipes";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for Expo app
app.use("/*", cors({
  origin: "*", // In production, restrict to your domain
  allowMethods: ["GET", "OPTIONS"],
  allowHeaders: ["Content-Type"],
}));

// Health check
app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "NutriPlanIT API",
    version: "1.0.0",
  });
});

// Mount routes
app.route("/recipes", recipes);

export default app;
