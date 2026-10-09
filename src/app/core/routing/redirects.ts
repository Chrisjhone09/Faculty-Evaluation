import { inject } from '@angular/core';
import { Router, UrlTree, type RedirectFunction } from '@angular/router';

/**
 * Builds a route redirect that can carry query parameters.
 *
 * Angular's string form of `redirectTo` treats the whole value as a path, so
 * `redirectTo: 'academics?tab=subjects'` would look for a route literally
 * named "academics?tab=subjects" and fail. The function form lets us return
 * a parsed UrlTree instead, which is the only way to land a legacy path on a
 * specific tab of a consolidated workspace.
 *
 * Usage:
 *   { path: 'subjects', redirectTo: redirectToTab('/admin/academics', 'subjects') }
 */
export function redirectToTab(path: string, tab: string) {
  return (): UrlTree => inject(Router).createUrlTree([path], { queryParams: { tab } });
}

/**
 * Redirect that forwards a route parameter, e.g.
 * /dean/faculty-performance/:instructorId -> /dean/faculty/:instructorId
 */
export function redirectWithParam(basePath: string, paramName: string): RedirectFunction {
  return (redirectData) => inject(Router).createUrlTree([basePath, redirectData.params[paramName]]);
}
