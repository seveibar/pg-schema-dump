import test from "ava"
import { doubleDumpTest } from "../fixtures/double-dump-test"

test("[feature] indexes", async (t) => {
  const structure: string = await doubleDumpTest(t, {
    sql: `
    CREATE TABLE test_table(
      id uuid PRIMARY KEY,
      name text not null UNIQUE
    )
    `,
  })
  t.log(structure)
  t.truthy(structure.includes("public.auth_account_id"))
})
