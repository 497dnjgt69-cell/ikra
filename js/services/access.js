import { featureCatalog } from "../config/features.js";
import { createWebCommerce } from "../platform/commerce.js";
export class AccessDeniedError extends Error {
  constructor(feature) {
    super("Bu özellik IKRA Pro gerektiriyor.");
    this.name = "AccessDeniedError";
    this.feature = feature;
  }
}
export function createAccess({
  provider = createWebCommerce(),
  catalog = featureCatalog,
  now = Date.now,
} = {}) {
  let entitlement = { plan: "free", expiresAt: null };
  let generation = 0;
  const listeners = new Set();
  const plan = () =>
    entitlement.plan === "pro" &&
    (entitlement.expiresAt === null || entitlement.expiresAt > now())
      ? "pro"
      : "free";
  function accept(value) {
    // Only responses from the injected trusted adapter can update this private state.
    const expiry = value?.expiresAt;
    entitlement =
      value?.plan === "pro" && (expiry === null || Number.isFinite(expiry))
        ? { plan: "pro", expiresAt: expiry }
        : { plan: "free", expiresAt: null };
    for (const listener of listeners) listener(plan());
    return plan();
  }
  async function query(method, ...args) {
    const token = ++generation;
    try {
      const result = await provider[method](...args);
      return token === generation ? accept(result) : plan();
    } catch (error) {
      if (token === generation) accept(null);
      throw error;
    }
  }
  function can(feature) {
    const rule = Object.hasOwn(catalog, feature) ? catalog[feature] : null;
    return (
      !!rule &&
      (rule.minimumPlan === "free" ||
        (rule.minimumPlan === "pro" && plan() === "pro"))
    );
  }
  return Object.freeze({
    get plan() {
      return plan();
    },
    can,
    require(feature) {
      if (!can(feature)) throw new AccessDeniedError(feature);
    },
    refresh: () => query("getEntitlements"),
    purchase: (product) => query("purchase", product),
    restore: () => query("restore"),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
