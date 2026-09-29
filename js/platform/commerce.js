/** Commerce adapter contract. A production adapter must verify purchases outside
 * editable app data (Store bridge / trusted backend). Client gates are UX only.
 * Never grant entitlements from backups, localStorage, URL parameters or a toggle.
 */
export function createWebCommerce() {
  return Object.freeze({
    async getEntitlements() {
      return { plan: "free", expiresAt: null };
    },
    async purchase() {
      throw new Error("Satın alma henüz kullanıma açık değil.");
    },
    async restore() {
      return { plan: "free", expiresAt: null };
    },
  });
}
