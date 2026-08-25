CREATE TABLE notebook_progress (
  membership_id TEXT NOT NULL,
  path TEXT NOT NULL,
  last_modified TEXT NOT NULL,
  code_cells INTEGER NOT NULL,
  executed_code_cells INTEGER NOT NULL,
  PRIMARY KEY (membership_id, path)
);
