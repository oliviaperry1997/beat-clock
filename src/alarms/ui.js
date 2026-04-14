/**
 * Alarm UI module — DOM rendering for alarm management.
 *
 * Integrates store, templates, notifications, and location modules into
 * a cohesive user interface for alarm creation, listing, and management.
 */

import { addAlarm, updateAlarm, deleteAlarm, toggleAlarm, loadAlarms, getEnabledAlarms } from './store.js';
import { getTemplate, getTemplatesByCategory } from './templates.js';
import { ensureNotificationPermission } from './notifications.js';
import { getActiveLocation } from '../location/store.js';

// State
let activeTab = 'list';
let currentTemplateKey = null;
let formData = {};
let onDismissAlarm = null;

/**
 * Generate a human-readable label for an alarm.
 */
function getAlarmDescription(alarm) {
  if (!alarm.condition) return alarm.label || 'Alarm';

  const c = alarm.condition;
  switch (c.type) {
    case 'beat-time':
      return `At ${c.params.beat} beats`;
    case 'standard-time':
      return `At ${String(c.params.hours).padStart(2, '0')}:${String(c.params.minutes).padStart(2, '0')}`;
    case 'astro-offset': {
      const eventLabels = { sunrise: 'sunrise', sunset: 'sunset', solarNoon: 'solar noon' };
      const eventName = eventLabels[c.params.event] || c.params.event;
      const offset = c.params.offsetMinutes || 0;
      if (offset === 0) return `At ${eventName}`;
      const dir = offset > 0 ? 'after' : 'before';
      return `${Math.abs(offset)} min ${dir} ${eventName}`;
    }
    case 'astro-offset-beats': {
      const eventLabels = { sunrise: 'sunrise', sunset: 'sunset', solarNoon: 'solar noon' };
      const eventName = eventLabels[c.params.event] || c.params.event;
      const offset = c.params.offsetBeats;
      if (offset === 0 || offset == null) return `At ${eventName}`;
      const dir = offset > 0 ? 'after' : 'before';
      return `${Math.abs(offset)} beats ${dir} ${eventName}`;
    }
    case 'date-trigger':
      return c.template || alarm.label;
    default:
      return alarm.label || 'Alarm';
  }
}

/**
 * Initialize the full alarm system UI.
 *
 * @param {Object} location - Location object with latitude/longitude
 * @param {function} dismissCallback - Called with alarmId to dismiss active alarm
 * @returns {Object} Cleanup handle with { stop() }
 */
export function initAlarmSystem(location, dismissCallback) {
  onDismissAlarm = dismissCallback;
  createAlarmTrigger(location);
  return {
    stop() {
      const trigger = document.getElementById('alarm-trigger');
      const manager = document.getElementById('alarm-manager');
      if (trigger) trigger.remove();
      if (manager) manager.remove();
    }
  };
}

/**
 * Create the alarm trigger button in the DOM.
 */
function createAlarmTrigger(location) {
  const btn = document.createElement('button');
  btn.id = 'alarm-trigger';
  btn.className = 'alarm-trigger';
  btn.textContent = '🔔';
  btn.setAttribute('aria-label', 'Manage alarms');

  btn.addEventListener('click', () => {
    openAlarmManager(location);
  });

  document.body.appendChild(btn);
}

/**
 * Open the alarm manager modal.
 */
function openAlarmManager(location) {
  let modal = document.getElementById('alarm-manager');
  if (!modal) {
    modal = createAlarmManager(location);
  }
  modal.classList.remove('hidden');
  activeTab = 'list';
  renderAlarmTabs();
  renderAlarmList();
}

/**
 * Close the alarm manager modal.
 */
function closeAlarmManager() {
  const modal = document.getElementById('alarm-manager');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Create the alarm manager modal DOM elements.
 */
function createAlarmManager(location) {
  const modal = document.createElement('div');
  modal.id = 'alarm-manager';
  modal.className = 'modal hidden';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Alarms</h2>
        <button id="close-alarm-manager" aria-label="Close">×</button>
      </div>
      <div id="alarm-tabs" class="alarm-tabs"></div>
      <div id="alarm-panel"></div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  document.getElementById('close-alarm-manager').addEventListener('click', closeAlarmManager);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeAlarmManager();
    }
  });

  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeAlarmManager();
    }
  });

  return modal;
}

/**
 * Render tab navigation.
 */
function renderAlarmTabs() {
  const container = document.getElementById('alarm-tabs');
  if (!container) return;

  container.innerHTML = `
    <button class="alarm-tab ${activeTab === 'list' ? 'active' : ''}" data-tab="list">Alarm List</button>
    <button class="alarm-tab ${activeTab === 'create' ? 'active' : ''}" data-tab="create">Create Alarm</button>
  `;

  container.querySelectorAll('.alarm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      renderAlarmTabs();
      if (activeTab === 'list') {
        renderAlarmList();
      } else {
        renderTemplatePicker();
      }
    });
  });
}

/**
 * Render the alarm list in the list tab.
 */
function renderAlarmList() {
  const container = document.getElementById('alarm-panel');
  if (!container) return;

  const alarms = loadAlarms();

  if (alarms.length === 0) {
    container.innerHTML = '<div class="no-alarms">No alarms set</div>';
    return;
  }

  container.innerHTML = alarms.map(alarm => `
    <div class="alarm-list-item" data-id="${alarm.id}">
      <span class="alarm-label">${getAlarmDescription(alarm)}</span>
      <div class="alarm-toggle-switch ${alarm.enabled ? 'active' : ''}" data-toggle="${alarm.id}" aria-label="Toggle ${alarm.label}" role="switch"></div>
      <button class="alarm-edit-btn" data-edit="${alarm.id}" aria-label="Edit ${alarm.label}">✎</button>
      <button class="alarm-remove-btn" data-remove="${alarm.id}" aria-label="Remove ${alarm.label}">×</button>
    </div>
  `).join('');

  // Toggle handlers
  container.querySelectorAll('.alarm-toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggleAlarm(toggle.dataset.toggle);
      renderAlarmList();
    });
  });

  // Edit handlers
  container.querySelectorAll('.alarm-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editAlarm(btn.dataset.edit);
    });
  });

  // Remove handlers
  container.querySelectorAll('.alarm-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteAlarm(btn.dataset.remove);
      renderAlarmList();
    });
  });
}

/**
 * Render the template picker in the create tab.
 */
function renderTemplatePicker() {
  const container = document.getElementById('alarm-panel');
  if (!container) return;

  const categories = getTemplatesByCategory();
  const categoryLabels = {
    time: 'Time-based',
    astro: 'Astronomical',
    lunar: 'Lunar',
    seasonal: 'Seasonal'
  };

  let html = '';
  for (const [category, templates] of Object.entries(categories)) {
    if (templates.length === 0) continue;
    html += `<div class="template-category">${categoryLabels[category] || category}</div>`;
    for (const template of templates) {
      html += `<button class="template-option" data-template="${template.key}">${template.label}</button>`;
    }
  }

  container.innerHTML = html;

  // Template click handlers
  container.querySelectorAll('.template-option').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTemplateKey = btn.dataset.template;
      formData = {};
      renderParameterForm(currentTemplateKey);
    });
  });
}

/**
 * Render the parameter form for a selected template.
 */
function renderParameterForm(templateKey) {
  const container = document.getElementById('alarm-panel');
  if (!container) return;

  const template = getTemplate(templateKey);
  if (!template) return;

  let html = `<div class="form-template-label">${template.label}</div>`;

  // Parameter inputs
  for (const param of template.params) {
    html += `
      <div class="param-field">
        <label class="param-label">${param.label}</label>
        <input type="${param.type}" class="param-input" data-param="${param.key}"
          ${param.min !== undefined ? `min="${param.min}"` : ''}
          ${param.max !== undefined ? `max="${param.max}"` : ''}
          value="${formData[param.key] || ''}" />
      </div>
    `;
  }

  // Date condition button
  html += `
    <button id="add-date-condition" class="add-date-condition-btn">Add Date Condition</button>
    <div id="date-filter-panel" class="date-filter-panel hidden"></div>
  `;

  // Recurrence selector
  html += `
    <div class="param-field">
      <label class="param-label">Recurrence</label>
      <select id="recurrence-select" class="param-input">
        <option value="once" ${formData.recurrence === 'once' ? 'selected' : ''}>Once</option>
        <option value="daily" ${formData.recurrence === 'daily' ? 'selected' : ''}>Daily</option>
        <option value="weekly" ${formData.recurrence === 'weekly' ? 'selected' : ''}>Weekly</option>
        <option value="lunar" ${formData.recurrence === 'lunar' ? 'selected' : ''}>Lunar cycle</option>
      </select>
    </div>
  `;

  // Timeout duration (optional)
  const timeoutMin = formData.timeoutDuration ? Math.floor(formData.timeoutDuration / 60000) : '';
  html += `
    <div class="param-field">
      <label class="param-label">Auto-stop after (minutes, empty = indefinite)</label>
      <input type="number" class="param-input" data-param="timeoutDuration"
        min="1" value="${timeoutMin}" placeholder="Indefinite" />
    </div>
  `;

  // Notification toggles
  html += `
    <div class="notification-toggles">
      <label class="notification-toggle">
        <input type="checkbox" data-notif="browser" checked /> Browser
      </label>
      <label class="notification-toggle">
        <input type="checkbox" data-notif="inApp" checked /> In-app
      </label>
      <label class="notification-toggle">
        <input type="checkbox" data-notif="audio" checked /> Audio
      </label>
    </div>
  `;

  // Action buttons
  const saveText = formData._editingId ? 'Save Changes' : 'Save Alarm';
  html += `
    <div class="form-actions">
      <button id="back-to-templates" class="back-btn">← Back</button>
      <button id="save-alarm" class="save-btn">${saveText}</button>
    </div>
    <div id="form-error" class="error hidden"></div>
  `;

  container.innerHTML = html;

  // Wire up param inputs
  container.querySelectorAll('.param-input[data-param]').forEach(input => {
    input.addEventListener('input', (e) => {
      formData[e.target.dataset.param] = e.target.value;
    });
  });

  // Recurrence
  const recurrenceSelect = document.getElementById('recurrence-select');
  if (recurrenceSelect) {
    recurrenceSelect.addEventListener('change', (e) => {
      formData.recurrence = e.target.value;
    });
  }

  // Date condition
  const addDateBtn = document.getElementById('add-date-condition');
  if (addDateBtn) {
    addDateBtn.addEventListener('click', () => {
      const panel = document.getElementById('date-filter-panel');
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        renderDateFilterPicker();
      } else {
        panel.classList.add('hidden');
        formData.dateFilter = null;
      }
    });
  }

  // Back to templates
  const backBtn = document.getElementById('back-to-templates');
  if (backBtn) {
    backBtn.addEventListener('click', renderTemplatePicker);
  }

  // Save
  const saveBtn = document.getElementById('save-alarm');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveAlarmFromForm(templateKey);
    });
  }
}

/**
 * Render date filter picker.
 */
function renderDateFilterPicker() {
  const container = document.getElementById('date-filter-panel');
  if (!container) return;

  container.innerHTML = `
    <div class="date-filter-options">
      <button class="date-option" data-filter="full-moon">Full Moon Day</button>
      <button class="date-option" data-filter="new-moon">New Moon Day</button>
      <button class="date-option" data-filter="equinox">Equinox Day</button>
      <button class="date-option" data-filter="solstice">Solstice Day</button>
      <button class="date-option" data-filter="weekday">Specific Weekdays</button>
    </div>
    <div id="weekday-picker" class="weekday-picker hidden">
      <label class="weekday-label"><input type="checkbox" data-weekday="1" /> Mon</label>
      <label class="weekday-label"><input type="checkbox" data-weekday="2" /> Tue</label>
      <label class="weekday-label"><input type="checkbox" data-weekday="3" /> Wed</label>
      <label class="weekday-label"><input type="checkbox" data-weekday="4" /> Thu</label>
      <label class="weekday-label"><input type="checkbox" data-weekday="5" /> Fri</label>
      <label class="weekday-label"><input type="checkbox" data-weekday="6" /> Sat</label>
      <label class="weekday-label"><input type="checkbox" data-weekday="0" /> Sun</label>
    </div>
  `;

  // Date option click handlers
  container.querySelectorAll('.date-option').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.date-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      const filterType = btn.dataset.filter;
      if (filterType === 'weekday') {
        document.getElementById('weekday-picker').classList.remove('hidden');
      } else {
        document.getElementById('weekday-picker').classList.add('hidden');
        formData.dateFilter = { type: filterType };
      }
    });
  });

  // Weekday checkboxes
  container.querySelectorAll('input[data-weekday]').forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(container.querySelectorAll('input[data-weekday]:checked'))
        .map(c => parseInt(c.dataset.weekday, 10));
      formData.dateFilter = { type: 'weekday', params: { days: selected } };
    });
  });
}

/**
 * Edit an existing alarm.
 */
function editAlarm(alarmId) {
  const alarms = loadAlarms();
  const alarm = alarms.find(a => a.id === alarmId);
  if (!alarm) return;

  // Store the ID we're editing
  formData._editingId = alarmId;

  // Find the template that matches
  const templateKey = alarm.condition?.template;
  if (!templateKey) {
    // No matching template — can't edit
    return;
  }

  currentTemplateKey = templateKey;

  // Populate formData with alarm data
  formData = {
    _editingId: alarmId,
    recurrence: alarm.recurrence || 'once',
    dateFilter: alarm.condition.dateFilter || null,
    timeoutDuration: alarm.timeoutDuration || null,
  };

  // Populate condition params
  if (alarm.condition.params) {
    for (const [key, val] of Object.entries(alarm.condition.params)) {
      formData[key] = val;
    }
  }

  activeTab = 'create';
  renderAlarmTabs();
  renderParameterForm(currentTemplateKey);

  // Set notification toggles from saved alarm
  const notifBrowser = document.querySelector('input[data-notif="browser"]');
  const notifInApp = document.querySelector('input[data-notif="inApp"]');
  const notifAudio = document.querySelector('input[data-notif="audio"]');
  if (notifBrowser) notifBrowser.checked = alarm.notifications?.browser ?? true;
  if (notifInApp) notifInApp.checked = alarm.notifications?.inApp ?? true;
  if (notifAudio) notifAudio.checked = alarm.notifications?.audio ?? true;
}

/**
 * Save alarm from form data.
 */
function saveAlarmFromForm(templateKey) {
  const template = getTemplate(templateKey);
  if (!template) return;

  // Collect params — default empty numeric fields to 0
  const params = {};
  for (const param of template.params) {
    let val = formData[param.key];
    if (val !== undefined && val !== '') {
      params[param.key] = Number(val);
    } else if (param.type === 'number') {
      // Empty number fields default to 0
      params[param.key] = 0;
    }
  }

  // Build condition from template
  const condition = template.build(params);

  // Add date filter if set
  if (formData.dateFilter) {
    condition.dateFilter = formData.dateFilter;
  }

  // Get notification settings
  const notifBrowser = document.querySelector('input[data-notif="browser"]')?.checked ?? true;
  const notifInApp = document.querySelector('input[data-notif="inApp"]')?.checked ?? true;
  const notifAudio = document.querySelector('input[data-notif="audio"]')?.checked ?? true;

  // Request notification permission if browser notifications enabled
  if (notifBrowser) {
    ensureNotificationPermission();
  }

  // Construct alarm object
  const alarmData = {
    condition,
    recurrence: formData.recurrence || 'once',
    notifications: {
      browser: notifBrowser,
      inApp: notifInApp,
      audio: notifAudio
    }
  };

  // Timeout duration (convert minutes to ms)
  const timeoutMin = formData.timeoutDuration;
  if (timeoutMin !== undefined && timeoutMin !== '' && Number(timeoutMin) > 0) {
    alarmData.timeoutDuration = Number(timeoutMin) * 60000;
  }

  if (formData._editingId) {
    // Editing existing alarm
    updateAlarm(formData._editingId, alarmData);
    delete formData._editingId;
  } else {
    // New alarm
    addAlarm({ ...alarmData, label: template.label });
  }

  // Close modal and re-render
  closeAlarmManager();

  // Re-open to show updated list
  const location = getActiveLocation();
  openAlarmManager(location);
}
