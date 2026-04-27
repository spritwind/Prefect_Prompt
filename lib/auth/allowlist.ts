export function isAllowed(githubLogin: string | undefined): boolean {
  if (!githubLogin) return false;
  const raw = process.env.ALLOWED_GITHUB_LOGINS ?? "";
  if (raw.trim() === "") return false; // explicit empty = nobody
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(githubLogin.toLowerCase());
}
