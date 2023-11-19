import test from "ava"
import { doubleDumpTest } from "../fixtures/double-dump-test"

test("[feature] domains", async (t) => {
  const structure: string = await doubleDumpTest(t, {
    sql: `
    CREATE DOMAIN text_domain AS TEXT;
    CREATE TABLE test_table(
      id uuid PRIMARY KEY,
      name text_domain not null UNIQUE
    );
    `,
  })

  t.log(structure)
  t.truthy(structure.includes("CREATE DOMAIN public.text_domain"))
})
