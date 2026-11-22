// __tests__/incident-type.test.js — v0.59.14

import { describe, it, expect } from 'vitest';
import { translateIncidentType } from '../i18n.js';

describe('translateIncidentType', () => {
  it('translates known LTA types to FR', () => {
    expect(translateIncidentType('Roadwork', 'fr')).toBe('Travaux');
    expect(translateIncidentType('Vehicle Breakdown', 'fr')).toBe('Véhicule en panne');
    expect(translateIncidentType('Major Accident', 'fr')).toBe('Accident grave');
    expect(translateIncidentType('Heavy Traffic', 'fr')).toBe('Trafic dense');
  });

  it('keeps EN as-is for lang=en', () => {
    expect(translateIncidentType('Roadwork', 'en')).toBe('Roadwork');
    expect(translateIncidentType('Vehicle Breakdown', 'en')).toBe('Vehicle Breakdown');
  });

  it('falls back to the raw string when the type is unknown', () => {
    expect(translateIncidentType('Sandstorm', 'fr')).toBe('Sandstorm');
  });

  it('returns empty for empty input', () => {
    expect(translateIncidentType('')).toBe('');
    expect(translateIncidentType(null)).toBe('');
    expect(translateIncidentType(undefined)).toBe('');
  });

  it('handles LTA spacing variants by normalising', () => {
    // The LTA feed sometimes returns "Vehicle breakdown" (lowercase b)
    // or "VehicleBreakdown" (no space). Both should resolve.
    expect(translateIncidentType('Vehicle breakdown', 'fr')).toBe('Véhicule en panne');
    expect(translateIncidentType('VehicleBreakdown', 'fr')).toBe('Véhicule en panne');
  });

  // Codex review #218: cover the LTA-documented canonical Type values
  // exactly as they appear on the wire (per LTA's API guide PDF).
  it('translates LTA-documented "Road Works" and "Misc."', () => {
    expect(translateIncidentType('Road Works', 'fr')).toBe('Travaux');
    expect(translateIncidentType('Misc.', 'fr')).toBe('Incident divers');
  });
});
