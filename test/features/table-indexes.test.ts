import test from "ava"
import { doubleDumpTest } from "../fixtures/double-dump-test"

test("[feature] indexes", async (t) => {
  const indexName = "test_index"
  const structure: string = await doubleDumpTest(t, {
    sql: `
    CREATE TABLE test_table(
      id uuid PRIMARY KEY,
      name text not null UNIQUE
    );

    CREATE INDEX ${indexName} ON test_table(name);
    `,
  })
  t.log(structure)

  // Check if the structure includes the created index
  t.truthy(structure.includes(`INDEX ${indexName} ON public.test_table`))
})
