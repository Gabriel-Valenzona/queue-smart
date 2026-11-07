import { afterAll } from "vitest";
import { closeDatabase } from "../src/server/db/connection";

// Config sets the path before any application imports; file isolation gives each
// suite its own database. Local repository fixtures close their own connections.
afterAll(() => closeDatabase());
