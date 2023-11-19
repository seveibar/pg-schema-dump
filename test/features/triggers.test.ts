import test from "ava"
import { doubleDumpTest } from "../fixtures/double-dump-test"

test("[feature] triggers", async (t) => {
  const triggerName = "test_trigger"
  const structure: string = await doubleDumpTest(t, {
    sql: `
    CREATE TABLE test_table(
      id uuid PRIMARY KEY,
      name text not null UNIQUE
    );

    CREATE OR REPLACE FUNCTION test_trigger_function()
    RETURNS trigger AS $$
    BEGIN
      -- Trigger logic goes here
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER ${triggerName}
    BEFORE INSERT ON test_table
    FOR EACH ROW
    EXECUTE FUNCTION test_trigger_function();
    `,
  })
  t.log(structure)

  // Check if the structure includes the created trigger
  t.truthy(structure.includes(`TRIGGER ${triggerName}`))
})
