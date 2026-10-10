export const ISSUE_ROWS = [
  { dot: '#F59E0B', width: '58%', avatar: '#DB2777' },
  { dot: '#4F46E5', width: '42%', avatar: '#0891B2' },
  { dot: '#10B981', width: '50%', avatar: '#EA580C' },
] as const;

export const MOCK_APP = {
  heading: 'Issues',
  newIssue: '+ New issue',
  newIssueTitle: 'Add an onboarding checklist',
  issueCreated: 'Issue created',
  formTitle: 'New issue',
  titlePlaceholder: 'Issue title',
  cancel: 'Cancel',
  create: 'Create issue',
  address: 'localhost:3000',
  user: 'maya@your-app.com',
} as const;
