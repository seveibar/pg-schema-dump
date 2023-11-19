import test from "ava"
import { doubleDumpTest } from "../fixtures/double-dump-test"

test("[feature] grants", async (t) => {
  const structure: string = await doubleDumpTest(t, {
    sql: `
      CREATE TABLE test_table(
        id uuid PRIMARY KEY,
        name text not null UNIQUE
      );

      CREATE ROLE some_role;

      GRANT SELECT ON test_table TO PUBLIC;
      GRANT INSERT ON test_table TO some_role;
    `,
  })

  t.log(structure)

  // Check if the structure includes the GRANT statements
  t.truthy(
    structure.includes("GRANT SELECT ON TABLE public.test_table TO PUBLIC;")
  )
  t.truthy(
    structure.includes("GRANT INSERT ON TABLE public.test_table TO some_role;")
  )
})
