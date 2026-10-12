// Unit tests never touch the network or the database.
process.env.AI_VISIBILITY_MOCK_MODE = "true";
process.env.MOCK_LATENCY_MS = "0";
