const PEOPLE = {
  AK: { name: 'Avery Kim', color: '#4f46e5' },
  ML: { name: 'Maya Lin', color: '#db2777' },
  JO: { name: 'Jonah Ortiz', color: '#0891b2' },
  SR: { name: 'Sara Reyes', color: '#ea580c' },
};

const LABELS = {
  Feature: '#4f46e5',
  Bug: '#ef4444',
  Design: '#db2777',
  Performance: '#f59e0b',
  Backend: '#0891b2',
};

const PRIORITIES = [
  { key: 'urgent', name: 'Urgent', bars: 3, shortcut: '1' },
  { key: 'high', name: 'High', bars: 3, shortcut: '2' },
  { key: 'medium', name: 'Medium', bars: 2, shortcut: '3' },
  { key: 'low', name: 'Low', bars: 1, shortcut: '4' },
];

const GROUPS = [
  {
    key: 'progress',
    name: 'In progress',
    issues: [
      {
        id: 'WEB-121',
        title: 'Speed up the first dashboard load',
        label: 'Performance',
        priority: 'urgent',
        who: 'ML',
        date: 'Oct 6',
      },
      {
        id: 'WEB-118',
        title: 'Dark mode for the settings page',
        label: 'Design',
        priority: 'medium',
        who: 'JO',
        date: 'Oct 4',
      },
      {
        id: 'WEB-115',
        title: 'Retry failed webhooks with backoff',
        label: 'Backend',
        priority: 'high',
        who: 'SR',
        date: 'Oct 2',
      },
    ],
  },
  {
    key: 'todo',
    name: 'Todo',
    issues: [
      {
        id: 'WEB-124',
        title: 'Export reports as CSV',
        label: 'Feature',
        priority: 'medium',
        who: 'AK',
        date: 'Oct 8',
      },
      {
        id: 'WEB-123',
        title: 'Date picker skips a day on Safari',
        label: 'Bug',
        priority: 'high',
        who: 'ML',
        date: 'Oct 8',
      },
      {
        id: 'WEB-120',
        title: 'Invite teammates with a link',
        label: 'Feature',
        priority: 'low',
        who: 'JO',
        date: 'Oct 5',
      },
      {
        id: 'WEB-117',
        title: 'Empty state for new projects',
        label: 'Design',
        priority: 'low',
        who: 'SR',
        date: 'Oct 3',
      },
    ],
  },
  {
    key: 'backlog',
    name: 'Backlog',
    issues: [
      {
        id: 'WEB-110',
        title: 'Keyboard shortcuts for the board view',
        label: 'Feature',
        priority: 'low',
        who: 'JO',
        date: 'Sep 29',
      },
      {
        id: 'WEB-106',
        title: 'Audit log for admin actions',
        label: 'Backend',
        priority: 'medium',
        who: 'SR',
        date: 'Sep 26',
      },
    ],
  },
  {
    key: 'done',
    name: 'Done',
    issues: [
      {
        id: 'WEB-112',
        title: 'Two-factor sign in',
        label: 'Backend',
        priority: 'high',
        who: 'AK',
        date: 'Sep 30',
      },
      {
        id: 'WEB-109',
        title: 'New billing page',
        label: 'Design',
        priority: 'medium',
        who: 'ML',
        date: 'Sep 28',
      },
    ],
  },
];

const NEXT_ID = 'WEB-125';
const TOAST_MS = 9000;
const HIGHLIGHT_MS = 2600;

const STATUS_ICONS = {
  progress:
    '<svg class="status progress" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M8 5a3 3 0 0 1 0 6z"/></svg>',
  todo: '<svg class="status todo" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/></svg>',
  backlog:
    '<svg class="status backlog" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/></svg>',
  done: '<svg class="status done" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="m5.5 8.2 1.7 1.7 3.3-3.4"/></svg>',
};

const byId = (id) => document.getElementById(id);
const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

function priorityIcon(key) {
  const priority = PRIORITIES.find((item) => item.key === key);
  if (key === 'urgent') {
    return '<svg class="priority urgent" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="3.5"/><path d="M8 4.8v4M8 11.2v.1"/></svg>';
  }
  const bars = [0, 1, 2]
    .map((index) => {
      const height = 5 + index * 3;
      const on = index < priority.bars ? ' class="on"' : '';
      return `<rect${on} x="${2 + index * 4.5}" y="${14 - height}" width="3" height="${height}" rx="1"/>`;
    })
    .join('');
  return `<svg class="priority" viewBox="0 0 16 16" aria-hidden="true">${bars}</svg>`;
}

function avatar(who, size = '') {
  const person = PEOPLE[who];
  return `<span class="avatar ${size}" style="--avatar:${person.color}" title="${person.name}">${who}</span>`;
}

function label(name) {
  return `<span class="label"><span class="label-dot" style="--label:${LABELS[name]}"></span>${name}</span>`;
}

function rowHtml(issue, status, extraClass = '') {
  return `<li class="row ${extraClass}" data-id="${issue.id}">
    ${priorityIcon(issue.priority)}
    <span class="row-id">${issue.id}</span>
    ${STATUS_ICONS[status]}
    <span class="row-title">${escapeHtml(issue.title)}</span>
    ${label(issue.label)}
    ${avatar(issue.who)}
    <span class="row-date">${issue.date}</span>
  </li>`;
}

function render() {
  byId('groups').innerHTML = GROUPS.map(
    (group) => `<section aria-label="${group.name}">
      <div class="group-head">${STATUS_ICONS[group.key]}${group.name}<span class="group-count" data-count="${group.key}">${group.issues.length}</span></div>
      <ul class="rows" data-rows="${group.key}">${group.issues.map((issue) => rowHtml(issue, group.key)).join('')}</ul>
    </section>`,
  ).join('');
}

const MENUS = ['priority', 'assignee'];
const state = { priority: undefined, assignee: 'AK', created: undefined };

function openModal() {
  byId('overlay').hidden = false;
}

function closeModal() {
  byId('overlay').hidden = true;
  closeMenus();
}

function renderMenus() {
  byId('priority-menu').innerHTML = PRIORITIES.map(
    (item) =>
      `<button type="button" class="menu-item" role="menuitem" aria-label="${item.name}" data-priority="${item.key}">${priorityIcon(item.key)}${item.name}<span class="menu-key">${item.shortcut}</span></button>`,
  ).join('');
  byId('assignee-menu').innerHTML = Object.entries(PEOPLE)
    .map(
      ([key, person]) =>
        `<button type="button" class="menu-item" role="menuitem" aria-label="${person.name}" data-person="${key}">${avatar(key, 'tiny')}${person.name}</button>`,
    )
    .join('');
}

function toggleMenu(name) {
  const menu = byId(`${name}-menu`);
  const open = menu.hidden;
  closeMenus();
  menu.hidden = !open;
  byId(`${name}-button`).setAttribute('aria-expanded', String(open));
}

function closeMenus() {
  for (const name of MENUS) {
    byId(`${name}-menu`).hidden = true;
    byId(`${name}-button`).setAttribute('aria-expanded', 'false');
  }
}

function choosePriority(key) {
  const priority = PRIORITIES.find((item) => item.key === key);
  state.priority = key;
  byId('priority-icon').innerHTML = priorityIcon(key);
  byId('priority-label').textContent = priority.name;
  closeMenus();
}

function chooseAssignee(key) {
  const person = PEOPLE[key];
  state.assignee = key;
  const badge = byId('assignee-avatar');
  badge.textContent = key;
  badge.style.setProperty('--avatar', person.color);
  byId('assignee-label').textContent = person.name;
  closeMenus();
}

function createIssue() {
  const title = byId('issue-title').value.trim();
  if (!title) {
    byId('issue-title').focus();
    return;
  }
  const issue = {
    id: NEXT_ID,
    title,
    description: byId('issue-description').value.trim(),
    label: 'Feature',
    priority: state.priority ?? 'medium',
    who: state.assignee,
    date: 'Oct 9',
  };
  state.created = issue;
  closeModal();
  const rows = document.querySelector('[data-rows="todo"]');
  rows.insertAdjacentHTML('afterbegin', rowHtml(issue, 'todo', 'row-new'));
  const count = document.querySelector('[data-count="todo"]');
  count.textContent = String(Number(count.textContent) + 1);
  setTimeout(() => rows.firstElementChild?.classList.remove('row-new'), HIGHLIGHT_MS);
  showToast(`${issue.id} created`);
}

function showToast(text) {
  byId('toast-text').textContent = text;
  byId('toast').hidden = false;
  setTimeout(() => {
    byId('toast').hidden = true;
  }, TOAST_MS);
}

function openDrawer() {
  const issue = state.created;
  if (!issue) return;
  const priority = PRIORITIES.find((item) => item.key === issue.priority);
  byId('toast').hidden = true;
  const drawer = byId('drawer');
  drawer.innerHTML = `<div class="drawer-head"><span class="team-badge small" style="--team:#4f46e5">W</span>${issue.id}</div>
    <h2>${escapeHtml(issue.title)}</h2>
    ${
      issue.description
        ? `<p class="drawer-text filled">${escapeHtml(issue.description)}</p>`
        : '<p class="drawer-text">Add a description…</p>'
    }
    <dl class="props">
      <dt>Status</dt><dd>${STATUS_ICONS.todo}Todo</dd>
      <dt>Priority</dt><dd>${priorityIcon(issue.priority)}${priority.name}</dd>
      <dt>Assignee</dt><dd>${avatar(issue.who, 'tiny')}${PEOPLE[issue.who].name}</dd>
      <dt>Label</dt><dd>${label(issue.label)}</dd>
    </dl>
    <p class="activity-title">Activity</p>
    <div class="activity-list" id="activity-list">
      <p class="activity">${avatar('AK', 'tiny')}<span><strong>Avery Kim</strong> created the issue · just now</span></p>
    </div>
    <div class="comment-box">
      <textarea id="comment-input" aria-label="Leave a comment" placeholder="Leave a comment…" rows="2" spellcheck="false"></textarea>
      <div class="comment-actions"><button type="button" class="button primary" id="post-comment">Comment</button></div>
    </div>`;
  drawer.hidden = false;
}

function postComment() {
  const input = byId('comment-input');
  const text = input.value.trim();
  if (!text) return;
  byId('activity-list').insertAdjacentHTML(
    'beforeend',
    `<div class="comment">
      <div class="comment-head">${avatar('AK', 'tiny')}<strong>Avery Kim</strong><span class="faint">just now</span></div>
      <p class="comment-text">${escapeHtml(text)}</p>
    </div>`,
  );
  input.value = '';
}

render();
renderMenus();

byId('new-issue').addEventListener('click', openModal);
byId('cancel-issue').addEventListener('click', closeModal);
byId('create-issue').addEventListener('click', createIssue);
byId('priority-button').addEventListener('click', () => toggleMenu('priority'));
byId('assignee-button').addEventListener('click', () => toggleMenu('assignee'));
byId('priority-menu').addEventListener('click', (event) => {
  const item = event.target.closest('[data-priority]');
  if (item) choosePriority(item.dataset.priority);
});
byId('assignee-menu').addEventListener('click', (event) => {
  const item = event.target.closest('[data-person]');
  if (item) chooseAssignee(item.dataset.person);
});
byId('view-issue').addEventListener('click', openDrawer);
byId('drawer').addEventListener('click', (event) => {
  if (event.target.closest('#post-comment')) postComment();
});
byId('overlay').addEventListener('click', (event) => {
  if (event.target === event.currentTarget) closeModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !byId('overlay').hidden) {
    createIssue();
  }
});
