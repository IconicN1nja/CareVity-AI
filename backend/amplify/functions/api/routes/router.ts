import type { ApiEvent, ApiResult } from '../types/http';

export type RouteHandler = (event: ApiEvent, params: Record<string, string>) => Promise<ApiResult>;

type Route = { method: string; pattern: RegExp; keys: string[]; handler: RouteHandler };

export class ApiRouter {
  private readonly routes: Route[] = [];

  get(path: string, handler: RouteHandler) { this.add('GET', path, handler); return this; }
  post(path: string, handler: RouteHandler) { this.add('POST', path, handler); return this; }

  match(method: string, path: string): { handler: RouteHandler; params: Record<string, string> } | undefined {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = route.pattern.exec(path);
      if (!match) continue;
      return {
        handler: route.handler,
        params: Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])])),
      };
    }
    return undefined;
  }

  private add(method: string, path: string, handler: RouteHandler) {
    const keys: string[] = [];
    const source = path.replace(/\/:([^/]+)/g, (_, key: string) => {
      keys.push(key);
      return '/([^/]+)';
    });
    this.routes.push({ method, pattern: new RegExp(`^${source}/?$`), keys, handler });
  }
}
