// Loaded before each auth test file, so tests never touch the real database file.
process.env.QUEUESMART_DB_PATH = ":memory:";
