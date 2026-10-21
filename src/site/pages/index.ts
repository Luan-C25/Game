import type { Page, SiteContext } from "../layout.ts";
import { homePage, ndisTemplatePage, generalTemplatePage, notFoundPage } from "./core.ts";
import { guidePages } from "./guides.ts";
import { pricingPage, comparePage, privacyPage, termsPage, capacityPage, adminPage } from "./marketing.ts";

export function allPages(ctx: SiteContext): Page[] {
  const legal = { operatorName: ctx.operatorName, operatorAbn: ctx.operatorAbn };
  return [
    homePage(ctx),
    ndisTemplatePage(ctx),
    generalTemplatePage(ctx),
    ...guidePages(ctx),
    pricingPage(ctx),
    comparePage(ctx),
    privacyPage(ctx, legal),
    termsPage(ctx, legal),
    capacityPage(),
    adminPage(),
    notFoundPage(),
  ];
}
