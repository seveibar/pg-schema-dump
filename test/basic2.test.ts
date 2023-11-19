import test from "ava"
import { doubleDumpTest } from "./fixtures/double-dump-test"

test("[double-dump-test] basic2", async (t) => {
  const structure = await doubleDumpTest(t, {
    sql: `
    CREATE FUNCTION public.auth_account_id() RETURNS uuid
      LANGUAGE plpgsql
      AS $$
      DECLARE account_id uuid;
      BEGIN
        account_id := (
          SELECT account_api_key.account_id
            FROM super_api.account_api_key
            WHERE key_string=current_setting('request.header.apikey', 't')
        );
        RETURN account_id;
      END
    $$;

    CREATE TABLE test_table(
      id uuid PRIMARY KEY,
      name text not null
    )
    `,
  })
  t.log(structure)
  t.truthy(structure.includes("public.auth_account_id"))
})
