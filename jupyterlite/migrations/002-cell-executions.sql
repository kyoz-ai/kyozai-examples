CREATE TABLE cell_executions (
  membership_id TEXT NOT NULL,
  path TEXT NOT NULL,
  cell_id TEXT NOT NULL,
  executed_at TEXT NOT NULL,
  execution_count INTEGER,
  success INTEGER NOT NULL,
  error TEXT,
  PRIMARY KEY (membership_id, path, cell_id, executed_at)
);
