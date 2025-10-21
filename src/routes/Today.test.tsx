import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import TodayPage from './Today';
import { useLogsStore } from '../state/useLogsStore';
import { useSettingsStore } from '../state/useSettingsStore';

beforeEach(() => {
  useLogsStore.setState({ logs: {}, currentDate: '2025-01-01' });
  useSettingsStore.setState((state) => ({ settings: state.settings }));
});

describe('TodayPage', () => {
  it('shows zero totals when there are no entries', () => {
    render(<TodayPage />);
    expect(screen.getAllByText(/Nothing logged yet/i).length).toBeGreaterThan(0);
  });
});
