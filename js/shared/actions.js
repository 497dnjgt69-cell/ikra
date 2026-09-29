// One boundary for UI actions: services throw; UI reports failure and repaints
// persisted state instead of leaving a changed input that was never saved.
export function handleAction(action) {
  return function (...args) {
    const fail = (error) => {
      window.ikraNotify(
        error?.name === "AccessDeniedError"
          ? error.message
          : "İşlem kaydedilemedi. Lütfen tekrar dene.",
      );
      document.dispatchEvent(new Event("ikra-action-failed"));
      return false;
    };
    try {
      const result = action.apply(this, args);
      return result?.then ? result.catch(fail) : result;
    } catch (error) {
      return fail(error);
    }
  };
}
