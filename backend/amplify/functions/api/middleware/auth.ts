import type { ApiEvent, Identity } from '../types/http';

export function getIdentity(event: ApiEvent): Identity {
  const authorizer = event.requestContext.authorizer as Record<string, unknown> | undefined;
  const claims = authorizer?.claims;
  const values = claims && typeof claims === 'object' ? claims as Record<string, string> : authorizer as Record<string, string> | undefined;
  if (!values?.sub) throw new Error('UNAUTHORIZED');
  return {
    id: values.sub,
    email: values.email || `${values.sub}@carevity.ai`,
    name: values.name || values.username || values['cognito:username'] || 'User',
  };
}
