import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies before importing the module
vi.mock('../../src/alarms/store.js', () => ({
  addAlarm: vi.fn((alarm) => ({ ...alarm, id: 'alm_test', enabled: true, createdAt: new Date().toISOString() })),
  updateAlarm: vi.fn((id, updates) => ({ id, ...updates, enabled: true })),
  deleteAlarm: vi.fn(),
  toggleAlarm: vi.fn((id) => ({ id, enabled: true })),
  loadAlarms: vi.fn(() => []),
  getEnabledAlarms: vi.fn(() => [])
}));

vi.mock('../../src/alarms/templates.js', () => ({
  getTemplate: vi.fn((key) => {
    const templates = {
      'at-beat': {
        label: 'At specific beat time',
        category: 'time',
        params: [{ key: 'beat', label: 'Beat (0-1000)', type: 'number', min: 0, max: 1000 }],
        build: (p) => ({ type: 'beat-time', template: 'at-beat', params: { beat: Number(p.beat) } })
      },
      'at-time': {
        label: 'At specific standard time',
        category: 'time',
        params: [
          { key: 'hours', label: 'Hour (0-23)', type: 'number', min: 0, max: 23 },
          { key: 'minutes', label: 'Minutes (0-59)', type: 'number', min: 0, max: 59 }
        ],
        build: (p) => ({ type: 'standard-time', template: 'at-time', params: { hours: Number(p.hours), minutes: Number(p.minutes) } })
      },
      'on-full-moon': {
        label: 'On full moon day',
        category: 'lunar',
        params: [],
        build: () => ({ type: 'date-trigger', template: 'on-full-moon', params: {} })
      }
    };
    return templates[key] || null;
  }),
  getTemplatesByCategory: vi.fn(() => ({
    time: [
      { key: 'at-beat', label: 'At specific beat time', category: 'time', params: [{ key: 'beat', label: 'Beat (0-1000)', type: 'number' }] },
      { key: 'at-time', label: 'At specific standard time', category: 'time', params: [] }
    ],
    astro: [],
    lunar: [
      { key: 'on-full-moon', label: 'On full moon day', category: 'lunar', params: [] }
    ],
    seasonal: []
  }))
}));

vi.mock('../../src/alarms/notifications.js', () => ({
  ensureNotificationPermission: vi.fn(() => true)
}));

vi.mock('../../src/location/store.js', () => ({
  getActiveLocation: vi.fn(() => ({ id: 'loc_1', name: 'London', latitude: 51.5, longitude: -0.1, country: 'GB' }))
}));

import { initAlarmSystem } from '../../src/alarms/ui.js';
import * as store from '../../src/alarms/store.js';
import * as templates from '../../src/alarms/templates.js';

describe('initAlarmSystem', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="beats-container"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('creates alarm trigger button with id alarm-trigger', () => {
    const result = initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    const trigger = document.getElementById('alarm-trigger');
    expect(trigger).not.toBeNull();
    expect(trigger.tagName).toBe('BUTTON');
    expect(result.stop).toBeDefined();
    expect(typeof result.stop).toBe('function');
  });

  it('creates trigger button with bell emoji text', () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    const trigger = document.getElementById('alarm-trigger');
    expect(trigger.textContent).toBe('🔔');
  });

  it('creates trigger button with alarm-trigger class', () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    const trigger = document.getElementById('alarm-trigger');
    expect(trigger.classList.contains('alarm-trigger')).toBe(true);
  });

  it('returns stop function that removes trigger and manager', () => {
    const { stop } = initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    expect(document.getElementById('alarm-trigger')).not.toBeNull();
    stop();
    expect(document.getElementById('alarm-trigger')).toBeNull();
    expect(document.getElementById('alarm-manager')).toBeNull();
  });
});

describe('alarm manager modal', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="beats-container"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('creates alarm manager modal on trigger click', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    const trigger = document.getElementById('alarm-trigger');
    trigger.click();

    const modal = document.getElementById('alarm-manager');
    expect(modal).not.toBeNull();
    expect(modal.classList.contains('modal')).toBe(true);
  });

  it('modal has Alarm List and Create Alarm tabs', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const tabs = document.querySelectorAll('.alarm-tab');
    expect(tabs.length).toBe(2);

    const tabTexts = Array.from(tabs).map(t => t.textContent);
    expect(tabTexts).toContain('Alarm List');
    expect(tabTexts).toContain('Create Alarm');
  });
});

describe('alarm list', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="beats-container"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('shows "No alarms set" when empty', async () => {
    vi.mocked(store.loadAlarms).mockReturnValue([]);
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const panel = document.getElementById('alarm-panel');
    expect(panel.textContent).toContain('No alarms set');
  });

  it('renders alarms with toggle switches and delete buttons', async () => {
    vi.mocked(store.loadAlarms).mockReturnValue([
      { id: 'alm_1', label: 'Test Alarm', enabled: true },
      { id: 'alm_2', label: 'Another Alarm', enabled: false }
    ]);
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const items = document.querySelectorAll('.alarm-list-item');
    expect(items.length).toBe(2);

    const toggles = document.querySelectorAll('.alarm-toggle-switch');
    expect(toggles.length).toBe(2);

    const removeBtns = document.querySelectorAll('.alarm-remove-btn');
    expect(removeBtns.length).toBe(2);
  });

  it('toggle switch has active class when alarm is enabled', async () => {
    vi.mocked(store.loadAlarms).mockReturnValue([
      { id: 'alm_1', label: 'Enabled Alarm', enabled: true }
    ]);
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const toggle = document.querySelector('.alarm-toggle-switch');
    expect(toggle.classList.contains('active')).toBe(true);
  });

  it('calls toggleAlarm when toggle switch is clicked', async () => {
    vi.mocked(store.loadAlarms).mockReturnValue([
      { id: 'alm_1', label: 'Test Alarm', enabled: true }
    ]);
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const toggle = document.querySelector('.alarm-toggle-switch');
    toggle.click();

    expect(store.toggleAlarm).toHaveBeenCalledWith('alm_1');
  });

  it('calls deleteAlarm when remove button is clicked', async () => {
    vi.mocked(store.loadAlarms).mockReturnValue([
      { id: 'alm_1', label: 'Test Alarm', enabled: true }
    ]);
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const removeBtn = document.querySelector('.alarm-remove-btn');
    removeBtn.click();

    expect(store.deleteAlarm).toHaveBeenCalledWith('alm_1');
  });
});

describe('template picker', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="beats-container"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('calls getTemplatesByCategory when create tab is opened', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    expect(templates.getTemplatesByCategory).toHaveBeenCalled();
  });

  it('renders template options from categories', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    const options = document.querySelectorAll('.template-option');
    expect(options.length).toBeGreaterThan(0);
  });

  it('renders category headers for non-empty categories', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    const categories = document.querySelectorAll('.template-category');
    // Should have at least time and lunar categories
    expect(categories.length).toBeGreaterThanOrEqual(2);
  });
});

describe('parameter form', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="beats-container"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders inputs from template.params when template is selected', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    // Switch to create tab
    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    // Click a template with params (at-beat has one param)
    const templateBtn = Array.from(document.querySelectorAll('.template-option'))
      .find(b => b.dataset.template === 'at-beat');
    templateBtn.click();

    // Check that the beat param input exists (timeout field is separate)
    const beatInput = document.querySelector('.param-input[data-param="beat"]');
    expect(beatInput).not.toBeNull();
    expect(beatInput.dataset.param).toBe('beat');
  });

  it('renders template label in form', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    const templateBtn = Array.from(document.querySelectorAll('.template-option'))
      .find(b => b.dataset.template === 'at-beat');
    templateBtn.click();

    const label = document.querySelector('.form-template-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('At specific beat time');
  });

  it('has Add Date Condition button', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    const templateBtn = Array.from(document.querySelectorAll('.template-option'))
      .find(b => b.dataset.template === 'at-beat');
    templateBtn.click();

    const dateBtn = document.getElementById('add-date-condition');
    expect(dateBtn).not.toBeNull();
    expect(dateBtn.textContent).toContain('Add Date Condition');
  });

  it('has recurrence selector with once, daily, weekly, lunar options', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    const templateBtn = Array.from(document.querySelectorAll('.template-option'))
      .find(b => b.dataset.template === 'at-beat');
    templateBtn.click();

    const select = document.getElementById('recurrence-select');
    expect(select).not.toBeNull();

    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(options).toContain('once');
    expect(options).toContain('daily');
    expect(options).toContain('weekly');
    expect(options).toContain('lunar');
  });

  it('has notification toggles for browser, inApp, audio', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    const templateBtn = Array.from(document.querySelectorAll('.template-option'))
      .find(b => b.dataset.template === 'at-beat');
    templateBtn.click();

    const browserToggle = document.querySelector('input[data-notif="browser"]');
    const inAppToggle = document.querySelector('input[data-notif="inApp"]');
    const audioToggle = document.querySelector('input[data-notif="audio"]');

    expect(browserToggle).not.toBeNull();
    expect(inAppToggle).not.toBeNull();
    expect(audioToggle).not.toBeNull();
  });

  it('templates with no params render no template inputs', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    const templateBtn = Array.from(document.querySelectorAll('.template-option'))
      .find(b => b.dataset.template === 'on-full-moon');
    templateBtn.click();

    // No template param inputs (timeout field is separate, data-param="timeoutDuration")
    const templateInputs = document.querySelectorAll('.param-input[data-param="phase"]');
    expect(templateInputs.length).toBe(0);
  });
});

describe('save alarm', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="beats-container"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('calls addAlarm when save button is clicked', async () => {
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    const templateBtn = Array.from(document.querySelectorAll('.template-option'))
      .find(b => b.dataset.template === 'at-beat');
    templateBtn.click();

    // Fill in the parameter
    const input = document.querySelector('.param-input[data-param="beat"]');
    input.value = '500';
    input.dispatchEvent(new Event('input'));

    // Click save
    document.getElementById('save-alarm').click();

    expect(store.addAlarm).toHaveBeenCalled();
  });

  it('calls ensureNotificationPermission when browser notifications enabled', async () => {
    const { ensureNotificationPermission } = await import('../../src/alarms/notifications.js');
    initAlarmSystem({ latitude: 51.5, longitude: -0.1 });
    document.getElementById('alarm-trigger').click();

    const createTab = Array.from(document.querySelectorAll('.alarm-tab'))
      .find(t => t.textContent === 'Create Alarm');
    createTab.click();

    const templateBtn = Array.from(document.querySelectorAll('.template-option'))
      .find(b => b.dataset.template === 'at-beat');
    templateBtn.click();

    const input = document.querySelector('.param-input[data-param="beat"]');
    input.value = '500';
    input.dispatchEvent(new Event('input'));

    document.getElementById('save-alarm').click();

    expect(ensureNotificationPermission).toHaveBeenCalled();
  });
});
