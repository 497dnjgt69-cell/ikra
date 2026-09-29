export default function initialize() {
  (() => {
    const states = new WeakMap();
    window.animatePanel = (el, show) => {
      const prior = states.get(el);
      if (prior && prior.show === show) return;
      if (!prior && el.classList.contains("hidden") === !show) return;
      prior?.animation?.cancel();
      el.classList.remove("hidden");
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const frames = show
        ? [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity: 1, transform: "translateY(0)" },
          ]
        : [
            {
              opacity: getComputedStyle(el).opacity,
              transform: "translateY(0)",
            },
            { opacity: 0, transform: "translateY(6px)" },
          ];
      const animation = el.animate(frames, {
          duration: reduced ? 0 : 190,
          easing: "cubic-bezier(.22,1,.36,1)",
        }),
        state = { show, animation };
      states.set(el, state);
      animation.finished
        .then(() => {
          if (states.get(el) !== state) return;
          el.classList.toggle("hidden", !show);
          states.delete(el);
        })
        .catch(() => {});
    };
    window.closePanel = async (dialog) => {
      if (!dialog.open || dialog.dataset.closing) return;
      dialog.dataset.closing = "true";
      dialog.classList.add("is-closing");
      const shell = dialog.querySelector(".dialog-shell");
      const opacity = getComputedStyle(shell).opacity;
      shell.getAnimations().forEach((a) => a.cancel());
      await shell
        .animate(
          [
            { opacity, transform: "translateY(0) scale(1)" },
            { opacity: 0, transform: "translateY(8px) scale(.985)" },
          ],
          {
            duration: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : 190,
            easing: "cubic-bezier(.4,0,.8,.4)",
            fill: "forwards",
          },
        )
        .finished.catch(() => {});
      dialog.close();
      shell.getAnimations().forEach((a) => a.cancel());
      dialog.classList.remove("is-closing");
      delete dialog.dataset.closing;
    };
  })();
}
