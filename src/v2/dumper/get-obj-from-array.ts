export const getObjFromArray = <T>(ar: T[], k?: keyof T): Record<string, T> => {
  if (!k) k = "name" as any
  const obj: Record<string, T> = {}
  for (const item of ar) {
    obj[item[k as any]] = item
  }
  return obj
}
