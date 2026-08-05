/** 应用内带机构 URI 段的路径（如 /gmqwgy/login） */
function unitPath(
  unitUri: string,
  page: "login" | "characters" | "chat" | "records"
) {
  const uri = unitUri.trim().replace(/^\/+|\/+$/g, "");
  return uri ? `/${uri}/${page}` : `/${page}`;
}

export function pathLogin(unitUri: string) {
  return unitPath(unitUri, "login");
}

export function pathChat(unitUri: string) {
  return unitPath(unitUri, "chat");
}

export function pathCharacters(unitUri: string) {
  return unitPath(unitUri, "characters");
}

export function pathRecords(unitUri: string) {
  return unitPath(unitUri, "records");
}
