const response = await fetch('/_kyozai/capabilities/context');
if (!response.ok) {
  throw new Error(`context request failed: ${response.status}`);
}
const context = await response.json();
const staff = context.roles.some(
  (role) => role === 'Instructor' || role === 'TeachingAssistant',
);

location.replace(staff ? '/dashboard.html' : '/quiz.html');
