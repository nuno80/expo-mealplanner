// Direct Turso REST API client for browser
// Bypasses @libsql/client which doesn't work well with proxies

const rawUrl = import.meta.env.VITE_TURSO_URL?.trim();
const token = import.meta.env.VITE_TURSO_TOKEN?.trim();

// Use proxy in dev mode to avoid CORS
const isDev = import.meta.env.DEV;
const baseUrl = isDev
  ? `${window.location.origin}/api/turso`
  : rawUrl;

console.log(`[Turso] Base URL: ${baseUrl} (Original: ${rawUrl})`);
console.log(`[Turso] Mode: ${isDev ? "DEVELOPMENT (Proxy)" : "PRODUCTION"}`);

if (!rawUrl || !token) {
  console.error("[Turso] Missing configuration! Check .env.local");
}



// Execute a SQL query using Turso's HTTP API
async function executeQuery(sql: string): Promise<Record<string, unknown>[]> {
  const url = `${baseUrl}/v2/pipeline`;

  console.log(`[Turso] Executing query to: ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql } },
        { type: "close" }
      ]
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Turso] HTTP ${response.status}: ${text}`);
    throw new Error(`Turso HTTP ${response.status}: ${text}`);
  }

  const data = await response.json();
  console.log("[Turso] Raw response (truncated):", JSON.stringify(data).slice(0, 500));

  // Turso v2 API structure: results[0].response.result.{cols, rows}
  const firstResult = data.results?.[0];
  if (!firstResult || firstResult.type !== "ok") {
    console.error("[Turso] Query failed:", firstResult);
    return [];
  }

  const result = firstResult.response?.result;
  if (!result || !result.cols || !result.rows) {
    console.log("[Turso] No data in response");
    return [];
  }

  // Extract column names
  const columns = result.cols.map((col: { name: string }) => col.name);

  // Convert rows - each cell is {type: "text"|"integer"|"float", value: ...}
  const rows = result.rows.map((row: Array<{ type: string; value: unknown } | null>) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((colName: string, i: number) => {
      const cell = row[i];
      if (cell === null) {
        obj[colName] = null;
      } else {
        // Extract the value, converting types appropriately
        obj[colName] = cell.value;
      }
    });
    return obj;
  });

  console.log(`[Turso] Parsed ${rows.length} rows`);
  return rows;
}

// Type-safe query helper
export async function query<T>(sql: string): Promise<T[]> {
  try {
    const rows = await executeQuery(sql);
    return rows as T[];
  } catch (error) {
    console.error("[Turso] Query Error:", error);
    throw error;
  }
}

// Single row query
export async function queryOne<T>(sql: string): Promise<T | null> {
  const rows = await query<T>(sql);
  return rows[0] ?? null;
}

// Execute a write query (UPDATE, INSERT, DELETE) - returns affected rows
export async function execute(sql: string): Promise<number> {
  const url = `${baseUrl}/v2/pipeline`;

  console.log(`[Turso] Executing write: ${sql.slice(0, 100)}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql } },
        { type: "close" }
      ]
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Turso] HTTP ${response.status}: ${text}`);
    throw new Error(`Turso HTTP ${response.status}: ${text}`);
  }

  const data = await response.json();
  const firstResult = data.results?.[0];

  if (!firstResult || firstResult.type !== "ok") {
    console.error("[Turso] Write failed:", firstResult);
    throw new Error("Write query failed");
  }

  const affectedRows = firstResult.response?.result?.affected_row_count ?? 0;
  console.log(`[Turso] ✅ Affected rows: ${affectedRows}`);
  return affectedRows;
}
