/**
 * Tick rates for live Standard Time display refresh.
 *
 * Decimal time updates once per centibeat.
 * 24h time updates once per second so seconds remain visible.
 * Longitudinal time updates three times per visible hundredth-degree step.
 */

export function tickRateForFormat(formatId) {
  switch (formatId) {
    case '24h':
      return 1000;
    case 'longitudinal':
      return 800;
    case 'decimal':
    default:
      return 864;
  }
}
