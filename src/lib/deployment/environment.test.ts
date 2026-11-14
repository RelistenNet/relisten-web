import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import PreviewIndicator from '@/components/PreviewIndicator';
import { parseDeploymentEnvironment } from './environment';

const preview = {
  RELISTEN_DEPLOYMENT_ENV: 'preview',
  RELISTEN_PREVIEW_PR_NUMBER: '138',
  RELISTEN_PREVIEW_BRANCH: 'review/$(NODE_ENV);<b>$(id)</b>',
  RELISTEN_PREVIEW_HEAD_SHA: 'a'.repeat(40),
  RELISTEN_PREVIEW_URL: 'https://relisten-pr-138.tail09dbf.ts.net',
};

describe('deployment rendering', () => {
  it('defaults to production and renders no indicator', () => {
    expect(
      renderToStaticMarkup(
        createElement(PreviewIndicator, {
          deployment: parseDeploymentEnvironment({ DATABASE_PASSWORD: 'unrelated' }),
        })
      )
    ).toBe('');
  });

  it('renders literal branch text and only allowlisted runtime fields', () => {
    const deployment = parseDeploymentEnvironment({ ...preview, SECRET: 'must-not-appear' });
    const html = renderToStaticMarkup(createElement(PreviewIndicator, { deployment }));
    expect(html).toContain('PR #138');
    expect(html).toContain('review/$(NODE_ENV);&lt;b&gt;$(id)&lt;/b&gt;');
    expect(html).toContain('Uses your real account');
    expect(html).not.toContain('<b>');
    expect(JSON.stringify(deployment)).not.toContain('must-not-appear');
  });

  it.each([
    { RELISTEN_PREVIEW_PR_NUMBER: '0' },
    { RELISTEN_PREVIEW_HEAD_SHA: 'main' },
    { RELISTEN_PREVIEW_BRANCH: '' },
    { RELISTEN_PREVIEW_URL: 'https://evil.example' },
  ])('rejects incomplete or inconsistent preview identity: %s', (override) => {
    expect(() => parseDeploymentEnvironment({ ...preview, ...override })).toThrow(
      'Invalid preview'
    );
  });
});
