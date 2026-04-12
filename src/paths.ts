/** 应用内带机构 URI 段的路径（如 /gmqwgy/login） */
export function pathLogin(unitUri: string) {
  return `/${unitUri}/login`;
}

export function pathChat(unitUri: string) {
  return `/${unitUri}/chat`;
}

export function pathRecords(unitUri: string) {
  return `/${unitUri}/records`;
}
