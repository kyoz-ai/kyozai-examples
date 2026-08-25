CREATE TABLE quiz_results (
  membership_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  submitted_at TEXT NOT NULL,
  PRIMARY KEY (membership_id, quiz_id)
);
