/** Public runtime context. Never pass process.env across the server boundary. */
export type DeploymentEnvironment =
  | { isPreview: false }
  | { isPreview: true; prNumber: number; branch: string; headSha: string; url: string };

export function parseDeploymentEnvironment(
  env: Record<string, string | undefined>
): DeploymentEnvironment {
  if (env.RELISTEN_DEPLOYMENT_ENV !== 'preview') return { isPreview: false };

  const number = env.RELISTEN_PREVIEW_PR_NUMBER ?? '';
  const headSha = env.RELISTEN_PREVIEW_HEAD_SHA ?? '';
  const branch = env.RELISTEN_PREVIEW_BRANCH ?? '';
  const url = `https://relisten-web-previews-pr-${number}.tail09dbf.ts.net`;
  if (
    !/^[1-9][0-9]{0,9}$/.test(number) ||
    !/^[a-f0-9]{40}$/.test(headSha) ||
    branch.length === 0 ||
    branch.length > 1024 ||
    [...branch].some(
      (character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127
    ) ||
    env.RELISTEN_PREVIEW_URL !== url
  ) {
    throw new Error('Invalid preview deployment metadata; check the injected preview environment.');
  }
  return { isPreview: true, prNumber: Number(number), branch, headSha, url };
}
