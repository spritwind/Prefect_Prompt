import { Octokit } from "@octokit/rest";

interface CommitFileInput {
  /** repo-relative path, e.g. "prompts/factor-research/test/foo.md" */
  path: string;
  /** Full file content (with frontmatter etc.) */
  content: string;
  /** Commit message */
  message: string;
  /** Commit author display name */
  author: string;
}

interface CommitResult {
  ok: boolean;
  url?: string;
  error?: string;
}

function repoSlug(): { owner: string; repo: string } | null {
  const slug = process.env.GITHUB_REPO ?? "";
  const [owner, repo] = slug.split("/");
  if (!owner || !repo) return null;
  return { owner, repo };
}

export async function commitFile(input: CommitFileInput): Promise<CommitResult> {
  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return { ok: false, error: "GITHUB_PAT not configured on server" };
  }
  const repo = repoSlug();
  if (!repo) {
    return { ok: false, error: "GITHUB_REPO env not set (expect 'owner/repo')" };
  }

  const octokit = new Octokit({ auth: pat });
  const safeAuthor = input.author.replace(/[^\w.\-+]/g, "") || "prompt-hub";
  const email = `${safeAuthor}@prompt-hub.local`;

  // Check if file already exists — refuse to overwrite (MVP create-only).
  try {
    await octokit.repos.getContent({
      owner: repo.owner,
      repo: repo.repo,
      path: input.path,
    });
    return {
      ok: false,
      error: `Path already exists: ${input.path}. Pick a different id or category.`,
    };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 404) {
      return { ok: false, error: `GitHub getContent failed: ${(err as Error).message}` };
    }
    // 404 = file doesn't exist, proceed to create
  }

  try {
    const res = await octokit.repos.createOrUpdateFileContents({
      owner: repo.owner,
      repo: repo.repo,
      path: input.path,
      message: input.message,
      content: Buffer.from(input.content, "utf8").toString("base64"),
      committer: { name: safeAuthor, email },
      author: { name: safeAuthor, email },
    });
    return { ok: true, url: res.data.commit.html_url };
  } catch (err) {
    return {
      ok: false,
      error: `GitHub commit failed: ${(err as Error).message}`,
    };
  }
}
