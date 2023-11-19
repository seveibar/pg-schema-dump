import { DumperContext } from "./dumper-context"
import * as OutType from "../../types"

export const getTablelessSequencesForSchema = async (
  { schemaname }: { schemaname: string },
  ctx: DumperContext
): Promise<OutType.Sequence[]> => {
  return [] // TODO
}
