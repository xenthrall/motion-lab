/** Shared by the experiment gallery and option-picker panels: a set of
 * buttons where exactly one is "selected" via aria-pressed. */
export function wireToggleGroup(
  buttons: HTMLButtonElement[],
  onChange: (id: string) => void,
): void {
  for (const button of buttons) {
    button.addEventListener("click", () => {
      for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
      onChange(button.dataset.value ?? "");
    });
  }
}

export function setToggleGroupSelection(buttons: HTMLButtonElement[], selectedId: string): void {
  for (const button of buttons) {
    button.setAttribute("aria-pressed", String(button.dataset.value === selectedId));
  }
}
