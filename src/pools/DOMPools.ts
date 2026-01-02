import { FactoryPool, PoolStats } from './ObjectPool';

export type { FactoryPool, PoolStats };

export const POOL_CLASSES = {
  listItem: 'pool-list-item',
  selectOption: 'pool-select-option',
  card: 'pool-card',
  questCard: 'pool-quest-card',
  objectiveCard: 'pool-objective-card',
  rewardCard: 'pool-reward-card',
  requirementCard: 'pool-requirement-card',
  segmentItem: 'pool-segment-item',
  offsetCard: 'pool-offset-card',
  toast: 'pool-toast',
  span: 'pool-span',
} as const;

function resetDiv(el: HTMLDivElement): void {
  el.className = '';
  el.textContent = '';
  el.innerHTML = '';
  el.style.cssText = '';
  el.removeAttribute('data-id');
  el.removeAttribute('data-index');
  el.removeAttribute('data-type');
  el.removeAttribute('data-key');
}

function resetOption(el: HTMLOptionElement): void {
  el.className = '';
  el.value = '';
  el.textContent = '';
  el.selected = false;
  el.disabled = false;
  el.removeAttribute('data-id');
}

function resetInput(el: HTMLInputElement): void {
  el.className = '';
  el.value = '';
  el.type = 'text';
  el.removeAttribute('data-field');
  el.removeAttribute('data-index');
}

function resetSelect(el: HTMLSelectElement): void {
  el.className = '';
  el.innerHTML = '';
  el.selectedIndex = -1;
  el.removeAttribute('data-field');
  el.removeAttribute('data-index');
}

function resetLabel(el: HTMLLabelElement): void {
  el.className = '';
  el.textContent = '';
  el.removeAttribute('data-field');
}

function resetSpan(el: HTMLSpanElement): void {
  el.className = '';
  el.textContent = '';
  el.style.cssText = '';
  el.removeAttribute('data-id');
  el.removeAttribute('data-index');
  el.removeAttribute('data-type');
  el.removeAttribute('data-key');
}

export interface PoolRegistry {
  listItem: FactoryPool<HTMLDivElement>;
  selectOption: FactoryPool<HTMLOptionElement>;
  card: FactoryPool<HTMLDivElement>;
  questCard: FactoryPool<HTMLDivElement>;
  objectiveCard: FactoryPool<HTMLDivElement>;
  rewardCard: FactoryPool<HTMLDivElement>;
  requirementCard: FactoryPool<HTMLDivElement>;
  segmentItem: FactoryPool<HTMLDivElement>;
  offsetCard: FactoryPool<HTMLDivElement>;
  toast: FactoryPool<HTMLDivElement>;
  span: FactoryPool<HTMLSpanElement>;
  select: FactoryPool<HTMLSelectElement>;
  input: FactoryPool<HTMLInputElement>;
  label: FactoryPool<HTMLLabelElement>;
  div: FactoryPool<HTMLDivElement>;
}

const PoolCache: Record<string, FactoryPool<unknown>> = Object.create(null);
const pools: FactoryPool<unknown>[] = [];
let poolCount = 0;

function createListItemPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'ListItemPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    150
  );
}

function createSelectOptionPool(): FactoryPool<HTMLOptionElement> {
  return new FactoryPool<HTMLOptionElement>(
    'SelectOptionPool',
    () => document.createElement('option'),
    resetOption,
    undefined,
    300
  );
}

function createCardPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'CardPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    80
  );
}

function createQuestCardPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'QuestCardPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    50
  );
}

function createObjectiveCardPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'ObjectiveCardPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    50
  );
}

function createRewardCardPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'RewardCardPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    50
  );
}

function createRequirementCardPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'RequirementCardPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    50
  );
}

function createSegmentItemPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'SegmentItemPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    30
  );
}

function createOffsetCardPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'OffsetCardPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    20
  );
}

function createToastPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'ToastPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    20
  );
}

function createSpanPool(): FactoryPool<HTMLSpanElement> {
  return new FactoryPool<HTMLSpanElement>(
    'SpanPool',
    () => document.createElement('span'),
    resetSpan,
    undefined,
    300
  );
}

function createSelectPool(): FactoryPool<HTMLSelectElement> {
  return new FactoryPool<HTMLSelectElement>(
    'SelectPool',
    () => document.createElement('select'),
    resetSelect,
    undefined,
    100
  );
}

function createInputPool(): FactoryPool<HTMLInputElement> {
  return new FactoryPool<HTMLInputElement>(
    'InputPool',
    () => document.createElement('input'),
    resetInput,
    undefined,
    100
  );
}

function createLabelPool(): FactoryPool<HTMLLabelElement> {
  return new FactoryPool<HTMLLabelElement>(
    'LabelPool',
    () => document.createElement('label'),
    resetLabel,
    undefined,
    100
  );
}

function createDivPool(): FactoryPool<HTMLDivElement> {
  return new FactoryPool<HTMLDivElement>(
    'DivPool',
    () => document.createElement('div'),
    resetDiv,
    undefined,
    300
  );
}

let poolRegistry: PoolRegistry | null = null;

export function getPoolRegistry(): PoolRegistry {
  if (!poolRegistry) {
    poolRegistry = {
      listItem: createListItemPool(),
      selectOption: createSelectOptionPool(),
      card: createCardPool(),
      questCard: createQuestCardPool(),
      objectiveCard: createObjectiveCardPool(),
      rewardCard: createRewardCardPool(),
      requirementCard: createRequirementCardPool(),
      segmentItem: createSegmentItemPool(),
      offsetCard: createOffsetCardPool(),
      toast: createToastPool(),
      span: createSpanPool(),
      select: createSelectPool(),
      input: createInputPool(),
      label: createLabelPool(),
      div: createDivPool(),
    };

    const registry = poolRegistry;
    PoolCache['listItem'] = registry.listItem as FactoryPool<unknown>;
    PoolCache['selectOption'] = registry.selectOption as FactoryPool<unknown>;
    PoolCache['card'] = registry.card as FactoryPool<unknown>;
    PoolCache['questCard'] = registry.questCard as FactoryPool<unknown>;
    PoolCache['objectiveCard'] = registry.objectiveCard as FactoryPool<unknown>;
    PoolCache['rewardCard'] = registry.rewardCard as FactoryPool<unknown>;
    PoolCache['requirementCard'] = registry.requirementCard as FactoryPool<unknown>;
    PoolCache['segmentItem'] = registry.segmentItem as FactoryPool<unknown>;
    PoolCache['offsetCard'] = registry.offsetCard as FactoryPool<unknown>;
    PoolCache['toast'] = registry.toast as FactoryPool<unknown>;
    PoolCache['span'] = registry.span as FactoryPool<unknown>;
    PoolCache['select'] = registry.select as FactoryPool<unknown>;
    PoolCache['input'] = registry.input as FactoryPool<unknown>;
    PoolCache['label'] = registry.label as FactoryPool<unknown>;
    PoolCache['div'] = registry.div as FactoryPool<unknown>;

    pools[poolCount++] = registry.listItem as FactoryPool<unknown>;
    pools[poolCount++] = registry.selectOption as FactoryPool<unknown>;
    pools[poolCount++] = registry.card as FactoryPool<unknown>;
    pools[poolCount++] = registry.questCard as FactoryPool<unknown>;
    pools[poolCount++] = registry.objectiveCard as FactoryPool<unknown>;
    pools[poolCount++] = registry.rewardCard as FactoryPool<unknown>;
    pools[poolCount++] = registry.requirementCard as FactoryPool<unknown>;
    pools[poolCount++] = registry.segmentItem as FactoryPool<unknown>;
    pools[poolCount++] = registry.offsetCard as FactoryPool<unknown>;
    pools[poolCount++] = registry.toast as FactoryPool<unknown>;
    pools[poolCount++] = registry.span as FactoryPool<unknown>;
    pools[poolCount++] = registry.select as FactoryPool<unknown>;
    pools[poolCount++] = registry.input as FactoryPool<unknown>;
    pools[poolCount++] = registry.label as FactoryPool<unknown>;
    pools[poolCount++] = registry.div as FactoryPool<unknown>;
  }
  return poolRegistry;
}

export function clearAllPools(): void {
  for (let i = 0; i < poolCount; i++) {
    pools[i].clear();
  }
}

export function getAllPoolStats(): Record<string, PoolStats> {
  const stats: Record<string, PoolStats> = {};
  for (const key in PoolCache) {
    const pool = PoolCache[key];
    if (pool) {
      stats[key] = pool.getStats();
    }
  }
  return stats;
}

export function resetPoolRegistry(): void {
  if (poolRegistry) {
    poolRegistry.listItem.clear();
    poolRegistry.selectOption.clear();
    poolRegistry.card.clear();
    poolRegistry.questCard.clear();
    poolRegistry.objectiveCard.clear();
    poolRegistry.rewardCard.clear();
    poolRegistry.requirementCard.clear();
    poolRegistry.segmentItem.clear();
    poolRegistry.offsetCard.clear();
    poolRegistry.select.clear();
    poolRegistry.input.clear();
    poolRegistry.label.clear();
    poolRegistry.div.clear();
    poolRegistry = null;
  }
  for (const key in PoolCache) {
    delete PoolCache[key];
  }
  pools.length = 0;
  poolCount = 0;
}

export function createPool<T>(
  name: string,
  factory: () => T,
  resetFn: (obj: T) => void,
  destroyFn?: (obj: T) => void,
  size: number = 100
): FactoryPool<T> {
  if (PoolCache[name]) {
    return PoolCache[name] as FactoryPool<T>;
  }

  const pool = new FactoryPool<T>(name, factory, resetFn, destroyFn, size);
  PoolCache[name] = pool as FactoryPool<unknown>;
  pools[poolCount++] = pool as FactoryPool<unknown>;
  return pool;
}

export function acquireListItem(): HTMLDivElement {
  return getPoolRegistry().listItem.get();
}

export function releaseListItem(el: HTMLDivElement): void {
  getPoolRegistry().listItem.return(el);
}

export function acquireSelectOption(): HTMLOptionElement {
  return getPoolRegistry().selectOption.get();
}

export function releaseSelectOption(el: HTMLOptionElement): void {
  getPoolRegistry().selectOption.return(el);
}

export function acquireCard(): HTMLDivElement {
  return getPoolRegistry().card.get();
}

export function releaseCard(el: HTMLDivElement): void {
  getPoolRegistry().card.return(el);
}

export function acquireQuestCard(): HTMLDivElement {
  return getPoolRegistry().questCard.get();
}

export function releaseQuestCard(el: HTMLDivElement): void {
  getPoolRegistry().questCard.return(el);
}

export function acquireObjectiveCard(): HTMLDivElement {
  return getPoolRegistry().objectiveCard.get();
}

export function releaseObjectiveCard(el: HTMLDivElement): void {
  getPoolRegistry().objectiveCard.return(el);
}

export function acquireRewardCard(): HTMLDivElement {
  return getPoolRegistry().rewardCard.get();
}

export function releaseRewardCard(el: HTMLDivElement): void {
  getPoolRegistry().rewardCard.return(el);
}

export function acquireRequirementCard(): HTMLDivElement {
  return getPoolRegistry().requirementCard.get();
}

export function releaseRequirementCard(el: HTMLDivElement): void {
  getPoolRegistry().requirementCard.return(el);
}

export function acquireSegmentItem(): HTMLDivElement {
  return getPoolRegistry().segmentItem.get();
}

export function releaseSegmentItem(el: HTMLDivElement): void {
  getPoolRegistry().segmentItem.return(el);
}

export function acquireOffsetCard(): HTMLDivElement {
  return getPoolRegistry().offsetCard.get();
}

export function releaseOffsetCard(el: HTMLDivElement): void {
  getPoolRegistry().offsetCard.return(el);
}

export function acquireToast(): HTMLDivElement {
  return getPoolRegistry().toast.get();
}

export function releaseToast(el: HTMLDivElement): void {
  getPoolRegistry().toast.return(el);
}

export function acquireSpan(): HTMLSpanElement {
  return getPoolRegistry().span.get();
}

export function releaseSpan(el: HTMLSpanElement): void {
  getPoolRegistry().span.return(el);
}

export function acquireSelect(): HTMLSelectElement {
  return getPoolRegistry().select.get();
}

export function releaseSelect(el: HTMLSelectElement): void {
  getPoolRegistry().select.return(el);
}

export function acquireInput(): HTMLInputElement {
  return getPoolRegistry().input.get();
}

export function releaseInput(el: HTMLInputElement): void {
  getPoolRegistry().input.return(el);
}

export function acquireLabel(): HTMLLabelElement {
  return getPoolRegistry().label.get();
}

export function releaseLabel(el: HTMLLabelElement): void {
  getPoolRegistry().label.return(el);
}

export function acquireDiv(): HTMLDivElement {
  return getPoolRegistry().div.get();
}

export function releaseDiv(el: HTMLDivElement): void {
  getPoolRegistry().div.return(el);
}

export function recycleOptions(select: HTMLSelectElement): void {
  const options = select.options;
  for (let i = options.length - 1; i >= 0; i--) {
    const option = options[i];
    releaseSelectOption(option);
    select.remove(i);
  }
}
const toRelease: HTMLDivElement[] = [];
export function recyclePoolTree(container: HTMLElement): void {
  const elements = container.children;
  toRelease.length = 0;
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i] as HTMLElement;
    if (element.classList.contains('pool-quest-card')) {
      toRelease.push(element as HTMLDivElement);
    } else if (element.classList.contains('pool-objective-card')) {
      toRelease.push(element as HTMLDivElement);
    } else if (element.classList.contains('pool-reward-card')) {
      toRelease.push(element as HTMLDivElement);
    } else if (element.classList.contains('pool-requirement-card')) {
      toRelease.push(element as HTMLDivElement);
    } else if (element.classList.contains('pool-segment-item')) {
      toRelease.push(element as HTMLDivElement);
    } else if (element.classList.contains('pool-offset-card')) {
      toRelease.push(element as HTMLDivElement);
    } else if (element.classList.contains('pool-card')) {
      toRelease.push(element as HTMLDivElement);
    } else if (element.classList.contains('pool-list-item')) {
      toRelease.push(element as HTMLDivElement);
    }
  }
  
  for (const el of toRelease) {
    if (el.classList.contains('pool-quest-card')) {
      releaseQuestCard(el);
    } else if (el.classList.contains('pool-objective-card')) {
      releaseObjectiveCard(el);
    } else if (el.classList.contains('pool-reward-card')) {
      releaseRewardCard(el);
    } else if (el.classList.contains('pool-requirement-card')) {
      releaseRequirementCard(el);
    } else if (el.classList.contains('pool-segment-item')) {
      releaseSegmentItem(el);
    } else if (el.classList.contains('pool-offset-card')) {
      releaseOffsetCard(el);
    } else if (el.classList.contains('pool-card')) {
      releaseCard(el);
    } else if (el.classList.contains('pool-list-item')) {
      releaseListItem(el);
    }
  }
  
  container.innerHTML = '';
}

export function bindPoolItem<T extends HTMLElement>(element: T, obj: { element: T }): void {
  obj.element = element;
}

export function getOptionPool(): FactoryPool<HTMLOptionElement> {
  return getPoolRegistry().selectOption;
}

export function getSelectPool(): FactoryPool<HTMLSelectElement> {
  return getPoolRegistry().select;
}

export function getCardPool(): FactoryPool<HTMLDivElement> {
  return getPoolRegistry().card;
}

export function getQuestCardPool(): FactoryPool<HTMLDivElement> {
  return getPoolRegistry().questCard;
}

export function getObjectiveCardPool(): FactoryPool<HTMLDivElement> {
  return getPoolRegistry().objectiveCard;
}

export function getRewardCardPool(): FactoryPool<HTMLDivElement> {
  return getPoolRegistry().rewardCard;
}

export function getRequirementCardPool(): FactoryPool<HTMLDivElement> {
  return getPoolRegistry().requirementCard;
}
