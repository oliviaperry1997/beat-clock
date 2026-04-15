import './styles.css';
import { getFormat, setFormat } from '../config.js';
import { getAvailableFormats, hasFormat } from '../registry.js';

export const FORMAT_CHANGE_EVENT = 'beatclock:formatchange';

const COMPONENT_METADATA = Object.freeze({
  year: Object.freeze({
    label: 'Year',
    ariaLabel: 'Change Year format',
    formatLabels: Object.freeze({
      holocene: 'Holocene',
      gregorian: 'Gregorian',
      meghalayan: 'Meghalayan',
      custom: 'Custom',
    }),
  }),
  date: Object.freeze({
    label: 'Date',
    ariaLabel: 'Change Date format',
    formatLabels: Object.freeze({
      gregorian: 'Gregorian',
      chinese: 'Chinese',
      longitudinal: 'Longitudinal',
    }),
  }),
  stdTime: Object.freeze({
    label: 'Standard Time',
    ariaLabel: 'Change Standard Time format',
    formatLabels: Object.freeze({
      '24h': '24h',
      decimal: 'Decimal',
      longitudinal: 'Longitudinal',
    }),
  }),
  solarTime: Object.freeze({
    label: 'Solar Time',
    ariaLabel: 'Change Solar Time format',
    formatLabels: Object.freeze({
      '24h': '24h',
      decimal: 'Decimal',
      longitudinal: 'Longitudinal',
      descriptive: 'Descriptive',
    }),
  }),
});

const COMPONENT_ORDER = ['year', 'date', 'stdTime', 'solarTime'];
const DROPDOWN_OFFSET = 8;

let beatsContainer = null;
let dropdownElement = null;
let activeComponentId = null;
let ownerElement = null;
let layoutSyncPending = false;
let layoutObserver = null;

function syncLayoutMode() {
  if (!beatsContainer) return;

  beatsContainer.classList.remove('is-stacked');

  const availableWidth = beatsContainer.clientWidth || window.innerWidth || 0;
  const requiredWidth = beatsContainer.scrollWidth;
  beatsContainer.classList.toggle('is-stacked', availableWidth > 0 && requiredWidth > availableWidth);
}

function scheduleLayoutSync() {
  if (!beatsContainer || layoutSyncPending) return;

  layoutSyncPending = true;
  const schedule = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (callback) => setTimeout(callback, 0);

  schedule(() => {
    layoutSyncPending = false;
    syncLayoutMode();
  });
}

function getComponentElement(componentId) {
  return beatsContainer?.querySelector(`[data-component="${componentId}"]`) ?? null;
}

function getFormatLabel(componentId, formatId) {
  return COMPONENT_METADATA[componentId]?.formatLabels?.[formatId] ?? formatId;
}

function getActiveFormat(componentId) {
  const formatId = getFormat(componentId);
  if (hasFormat(componentId, formatId)) {
    return formatId;
  }

  return getAvailableFormats(componentId)[0] ?? null;
}

function setOpenState(componentId) {
  for (const id of COMPONENT_ORDER) {
    const element = getComponentElement(id);
    if (!element) continue;
    element.classList.toggle('is-open', id === componentId);
  }
}

function closeDropdown({ returnFocus = false } = {}) {
  if (!dropdownElement) return;

  dropdownElement.hidden = true;
  dropdownElement.replaceChildren();
  setOpenState(null);

  const previousOwner = ownerElement;
  activeComponentId = null;
  ownerElement = null;

  if (returnFocus && previousOwner) {
    previousOwner.focus();
  }
}

function positionDropdown(anchorElement) {
  if (!dropdownElement || !anchorElement) return;

  const anchorRect = anchorElement.getBoundingClientRect();
  dropdownElement.style.minWidth = `${Math.ceil(anchorRect.width)}px`;
  dropdownElement.style.left = '0px';
  dropdownElement.style.top = '0px';
  dropdownElement.hidden = false;

  const dropdownRect = dropdownElement.getBoundingClientRect();
  const fitsBelow = anchorRect.bottom + dropdownRect.height + DROPDOWN_OFFSET < window.innerHeight;
  const unclampedLeft = anchorRect.left + (anchorRect.width - dropdownRect.width) / 2;
  const maxLeft = Math.max(8, window.innerWidth - dropdownRect.width - 8);
  const left = Math.min(Math.max(8, unclampedLeft), maxLeft);
  const top = fitsBelow
    ? anchorRect.bottom + DROPDOWN_OFFSET
    : anchorRect.top - dropdownRect.height - DROPDOWN_OFFSET;

  dropdownElement.style.left = `${left}px`;
  dropdownElement.style.top = `${Math.max(8, top)}px`;
}

function applySelection(componentId, formatId) {
  setFormat(componentId, formatId);
  document.dispatchEvent(new CustomEvent(FORMAT_CHANGE_EVENT, {
    detail: { componentId, formatId },
  }));
  closeDropdown();
}

function buildOption(componentId, formatId, activeFormatId) {
  const option = document.createElement('button');
  option.type = 'button';
  option.className = 'format-selector-option';
  option.textContent = getFormatLabel(componentId, formatId);

  if (formatId === activeFormatId) {
    option.classList.add('is-active');
    const checkmark = document.createElement('span');
    checkmark.className = 'format-selector-option__checkmark';
    checkmark.textContent = '✓';
    option.appendChild(checkmark);
  }

  option.addEventListener('click', () => applySelection(componentId, formatId));
  return option;
}

function openDropdown(componentId, anchorElement) {
  if (!dropdownElement) return;

  const formats = getAvailableFormats(componentId);
  if (formats.length === 0) {
    closeDropdown();
    return;
  }

  if (activeComponentId === componentId && !dropdownElement.hidden) {
    closeDropdown();
    return;
  }

  dropdownElement.replaceChildren();

  const activeFormatId = getActiveFormat(componentId);
  for (const formatId of formats) {
    dropdownElement.appendChild(buildOption(componentId, formatId, activeFormatId));
  }

  activeComponentId = componentId;
  ownerElement = anchorElement;
  setOpenState(componentId);
  positionDropdown(anchorElement);
}

function handleComponentActivate(event) {
  event.stopPropagation();
  openDropdown(event.currentTarget.dataset.component, event.currentTarget);
}

function handleComponentKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  handleComponentActivate(event);
}

function ensureDropdown() {
  if (dropdownElement) return;

  dropdownElement = document.createElement('div');
  dropdownElement.className = 'format-selector-dropdown';
  dropdownElement.hidden = true;
  document.body.appendChild(dropdownElement);

  document.addEventListener('click', (event) => {
    if (dropdownElement.hidden) return;
    if (dropdownElement.contains(event.target) || ownerElement?.contains(event.target)) return;
    closeDropdown();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || dropdownElement.hidden) return;
    event.preventDefault();
    closeDropdown({ returnFocus: true });
  });
}

function ensureComponent(componentId) {
  const metadata = COMPONENT_METADATA[componentId];
  if (!metadata || !beatsContainer) return null;

  let component = getComponentElement(componentId);
  if (!component) {
    component = document.createElement('span');
    component.className = 'clock-component';
    component.dataset.component = componentId;
    beatsContainer.appendChild(component);
  }

  component.classList.add('clock-component');
  component.dataset.component = componentId;
  component.dataset.hoverLabel = metadata.label;
  component.setAttribute('tabindex', '0');
  component.setAttribute('role', 'button');
  component.setAttribute('aria-label', metadata.ariaLabel);

  if (component.dataset.selectorBound !== 'true') {
    component.addEventListener('click', handleComponentActivate);
    component.addEventListener('keydown', handleComponentKeydown);
    component.dataset.selectorBound = 'true';
  }

  return component;
}

export function initFormatSelectors(container) {
  if (layoutObserver) {
    layoutObserver.disconnect();
    layoutObserver = null;
  }

  beatsContainer = container;
  if (!beatsContainer) return;

  beatsContainer.setAttribute('aria-label', 'Beat Clock display');
  ensureDropdown();

  const orderedComponents = COMPONENT_ORDER.map((componentId) => ensureComponent(componentId)).filter(Boolean);
  for (const component of orderedComponents) {
    beatsContainer.appendChild(component);
  }

  if (typeof ResizeObserver === 'function') {
    layoutObserver = new ResizeObserver(() => scheduleLayoutSync());
    layoutObserver.observe(beatsContainer);
  } else {
    window.addEventListener('resize', scheduleLayoutSync);
  }

  scheduleLayoutSync();
}

export function renderFormatDisplay(values) {
  if (!beatsContainer) return;

  for (const componentId of COMPONENT_ORDER) {
    const component = getComponentElement(componentId);
    if (!component) continue;
    component.dataset.formatId = getActiveFormat(componentId) ?? '';
    component.textContent = values?.[componentId] ?? '';
  }

  scheduleLayoutSync();
}
