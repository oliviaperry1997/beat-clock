import './stdtime-picker.css';
import { getFormat, setFormat } from '../config.js';
import { getAvailableFormats } from '../registry.js';

export const STDTIME_FORMAT_CHANGE_EVENT = 'beatclock:formatchange';

const LABELS = Object.freeze({
  '24h': '24h',
  decimal: 'Decimal',
  longitudinal: 'Longitudinal',
});

function getActiveFormat() {
  const formatId = getFormat('stdTime');
  return getAvailableFormats('stdTime').includes(formatId) ? formatId : '24h';
}

export function initStdTimePicker() {
  let root = document.getElementById('stdtime-picker-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'stdtime-picker-root';

    const beatsContainer = document.getElementById('beats-container');
    if (beatsContainer?.parentNode) {
      beatsContainer.parentNode.insertBefore(root, beatsContainer);
    } else {
      document.body.appendChild(root);
    }
  }

  root.className = 'stdtime-picker';
  root.replaceChildren();

  const select = document.createElement('select');
  select.id = 'stdtime-picker';
  select.className = 'stdtime-picker__control';
  select.setAttribute('aria-label', 'Standard Time format');

  for (const formatId of getAvailableFormats('stdTime')) {
    const option = document.createElement('option');
    option.value = formatId;
    option.textContent = LABELS[formatId] ?? formatId;
    select.appendChild(option);
  }

  select.value = getActiveFormat();
  select.addEventListener('change', () => {
    setFormat('stdTime', select.value);
    document.dispatchEvent(new CustomEvent(STDTIME_FORMAT_CHANGE_EVENT, {
      detail: { componentId: 'stdTime', formatId: select.value },
    }));
  });

  root.appendChild(select);
  return select;
}
