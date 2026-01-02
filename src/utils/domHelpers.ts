import { recycleOptions, acquireSelectOption } from '../pools/DOMPools';

export function fillOptions(select: HTMLSelectElement | null, options: Array<{ value: number | string; label: string }> | string[]): void {
  if (!select) return;
  
  recycleOptions(select); // Clear existing options and return them to the pool
  
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < options.length; i += 1) {
    const opt = options[i] as { value: number | string; label: string } | string;
    const option = acquireSelectOption(); // Get an option from the pool
    
    if (typeof opt === 'string') {
      option.value = opt;
      option.textContent = opt;
    } else {
      option.value = String(opt.value);
      option.textContent = opt.label;
    }
    fragment.appendChild(option);
  }
  select.appendChild(fragment);
}
