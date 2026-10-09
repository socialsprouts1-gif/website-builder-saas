/**
 * What the tabs across a project are, and which one to point at.
 *
 * Kept apart from the component so the decision can be tested as what it is —
 * a function of two columns — rather than inferred from a ternary in a server
 * layout. The arrow is the whole answer to "I have a site, now what?", and
 * getting it wrong points somebody at the wrong screen or, worse, at nothing.
 */

export interface ProjectTab {
  key: string;
  /** Appended to `/app/project/{id}`; empty is the workspace itself. */
  path: string;
  label: string;
}

/** In the order they are actually used, not alphabetically. */
export const PROJECT_TABS: ProjectTab[] = [
  { key: 'workspace', path: '', label: 'Workspace' },
  { key: 'editor', path: '/editor', label: 'Editor' },
  { key: 'shop', path: '/shop', label: 'Shop' },
  { key: 'results', path: '/leads', label: 'Results' },
  { key: 'chatbot', path: '/chatbot', label: 'Chatbot' },
  { key: 'connectors', path: '/connectors', label: 'Connectors' },
  { key: 'deploy', path: '/deploy', label: 'Deploy' },
];

export function projectTabs(projectId: string): { key: string; href: string; label: string }[] {
  const base = `/app/project/${projectId}`;
  return PROJECT_TABS.map((tab) => ({ key: tab.key, href: `${base}${tab.path}`, label: tab.label }));
}

export interface ProjectState {
  /** `projects.status` — 'ready' once the build has finished. */
  status: string | null;
  /** `projects.public_slug` — set once it has been published. */
  publicSlug: string | null;
}

/**
 * The one tab worth an arrow, or nothing.
 *
 * Nothing while it is still building: the answer then is "wait", and the
 * workspace already says so. The editor once it is built, because the first
 * thing anybody does with a finished site is change something on it — and
 * because that was the step nobody could find. Nothing once it is published:
 * there is no single obvious next move then, and a dot that is always on is a
 * dot that says nothing.
 */
export function nextStepFor(project: ProjectState): string | undefined {
  if (project.status !== 'ready') return undefined;
  if (!project.publicSlug) return 'editor';
  return undefined;
}
