import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

/**
 * Initialize a flatpickr datetime picker on the given input element.
 * @param {HTMLElement} inputElement - The input element to attach flatpickr to
 * @param {function} onConvert - Callback called with the selected Date on change
 * @returns {object} The flatpickr instance
 */
export function initGregorianToClockPicker(inputElement, onConvert) {
  return flatpickr(inputElement, {
    enableTime: true,
    dateFormat: 'Y-m-d H:i',
    time_24hr: true,
    defaultDate: new Date(),
    onChange: (selectedDates, dateStr) => {
      if (selectedDates.length > 0 && selectedDates[0]) {
        onConvert(selectedDates[0]);
      }
    },
  });
}
