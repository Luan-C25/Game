import type { Page, SiteContext } from "../layout.ts";
import { homePage, ndisTemplatePage, generalTemplatePage, notFoundPage } from "./core.ts";

export function allPages(ctx: SiteContext): Page[] {
  return [homePage(ctx), ndisTemplatePage(ctx), generalTemplatePage(ctx), notFoundPage()];
}
