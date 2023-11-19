import test from "ava"
import { doubleDumpTest } from "../fixtures/double-dump-test"

test("[feature] policies", async (t) => {
  const policyName = "test_policy"
  const structure: string = await doubleDumpTest(t, {
    sql: `
    CREATE TABLE test_table(
      id uuid PRIMARY KEY,
      name text not null UNIQUE
    );

    CREATE POLICY ${policyName}
    ON test_table
    FOR ALL
    USING (true)
    WITH CHECK (true);
    `,
  })
  t.log(structure)

  // Check if the structure includes the created policy
  t.truthy(structure.includes(`POLICY ${policyName}`))
})
