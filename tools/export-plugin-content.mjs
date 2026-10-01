import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

export async function exportPluginContent(site, publicationPath) {
  const catalog = JSON.parse(await readFile(path.join(site, 'catalog.json'), 'utf8'));
  // In the deployed repository the website catalog is the publication authority.
  // Local plugin builds can additionally enforce the production release switch.
  const publication = publicationPath ? JSON.parse(await readFile(publicationPath, 'utf8')) : { defaultIssue: catalog.defaultIssue, withheldIssues: [] };
  const { releaseTranslations } = await import(pathToFileURL(path.join(site, 'i18n.js')).href);
  const { targetOutline } = await import(pathToFileURL(path.join(site, 'target-outlines.js')).href);
  const issues = catalog.issues.filter(issue => Number(issue.id) <= Number(publication.defaultIssue) && !publication.withheldIssues.includes(issue.id));
  if (!issues.some(issue => issue.id === publication.defaultIssue)) throw new Error('Published default issue is missing');
  for (const issue of issues) {
    const translations = releaseTranslations(issue);
    issue.translations = translations.issue;
    for (const target of issue.targets) {
      target.translations = translations.targets[target.id];
      const paths = targetOutline(issue.id, target.id);
      if (paths) target.outline = paths;
    }
  }
  const releaseCatalog = { defaultIssue: publication.defaultIssue, issues };
  const revision = createHash('sha256').update(JSON.stringify(releaseCatalog)).digest('hex');
  const content = { schemaVersion: 1, revision, catalog: releaseCatalog };
  await writeFile(path.join(site, 'plugin-content-v1.json'), JSON.stringify(content));
  return content;
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const site = fileURLToPath(new URL('../site/', import.meta.url));
  const content = await exportPluginContent(site);
  console.log(`Plugin content: ${content.catalog.issues.length} published issues; default ${content.catalog.defaultIssue}.`);
}
