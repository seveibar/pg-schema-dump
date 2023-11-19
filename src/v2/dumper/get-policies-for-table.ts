import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getPoliciesForTable = async (
  { schemaname, tablename }: { schemaname: string; tablename: string },
  ctx: DumperContext
): Promise<OutType.Policy[]> => {
  return [] // TODO
}
