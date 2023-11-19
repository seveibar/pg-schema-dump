import test from "ava"
import { doubleDumpTest } from "../fixtures/double-dump-test"

test("[feature] functions", async (t) => {
  const structure: string = await doubleDumpTest(t, {
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
    `,
  })
  t.log(structure)
  t.truthy(structure.includes("public.auth_account_id"))
})
