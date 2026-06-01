import { useEffect, useMemo } from "react";
import { matchPath, useLocation } from "react-router-dom";

export type PortalName = "Admin" | "Partner";

export type RouteTitleEntry = {
  path: string;
  title: string;
  end?: boolean;
};

type UsePageTitleOptions = {
  title?: string | null;
  entity?: string | number | null;
  portal: PortalName;
  routeTitles?: RouteTitleEntry[];
  restoreOnUnmount?: boolean;
};

const BRAND_NAME = "NoWayHome";

export function buildPageTitle(page: string, portal: PortalName) {
  return `${page} | ${portal} | ${BRAND_NAME}`;
}

export function resolveRouteTitle(pathname: string, routeTitles: RouteTitleEntry[], fallback: string) {
  const entry = routeTitles.find((item) =>
    matchPath({ path: item.path, end: item.end ?? true }, pathname),
  );
  return entry?.title || fallback;
}

export function useRoutePageTitle(portal: PortalName, routeTitles: RouteTitleEntry[], fallback: string) {
  const location = useLocation();
  const pageTitle = useMemo(
    () => resolveRouteTitle(location.pathname, routeTitles, fallback),
    [fallback, location.pathname, routeTitles],
  );

  useEffect(() => {
    document.title = buildPageTitle(pageTitle, portal);
  }, [pageTitle, portal]);
}

export function usePageTitle({
  title,
  entity,
  portal,
  routeTitles,
  restoreOnUnmount = true,
}: UsePageTitleOptions) {
  const location = useLocation();
  const computedTitle = useMemo(() => {
    const routeTitle = routeTitles
      ? resolveRouteTitle(location.pathname, routeTitles, portal)
      : portal;
    const baseTitle = title || routeTitle;
    const entityLabel = entity == null || entity === "" ? "" : String(entity);
    return buildPageTitle(entityLabel ? `${baseTitle} - ${entityLabel}` : baseTitle, portal);
  }, [entity, location.pathname, portal, routeTitles, title]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = computedTitle;

    return () => {
      if (restoreOnUnmount) {
        document.title = previousTitle;
      }
    };
  }, [computedTitle, restoreOnUnmount]);
}
