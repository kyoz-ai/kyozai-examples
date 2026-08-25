import { identityContext } from './platform.js';

const context = await identityContext();
const destination = context.roles.some((role) =>
  role === 'Instructor' || role === 'TeachingAssistant'
)
  ? '/dashboard.html'
  : '/lab/index.html';

location.replace(destination);
