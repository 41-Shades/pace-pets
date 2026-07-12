import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  importExtensionScript,
  installExtensionRuntimeHooks,
} from "./helpers/extension-runtime.js";

installExtensionRuntimeHooks();

const originalChart = globalThis.Chart;
const originalDocument = globalThis.document;
const originalGetComputedStyle = globalThis.getComputedStyle;

beforeAll(async () => {
  await importExtensionScript("collector/extension/dashboard-chart-data.js");
  await importExtensionScript("collector/extension/dashboard-chart-config.js");
  await importExtensionScript("collector/extension/dashboard-chart.js");
});

function windowData() {
  return {
    remainingPercent: 50,
    resetsAt: "2026-05-25T13:00:00.000Z",
    windowMinutes: 300,
  };
}

describe("PacePetsDashboardChartData live endpoint", () => {
  it("appends one explicit-time point without mutating history", () => {
    const data = globalThis.PacePetsDashboardChartData;
    const historicalPoints = [{ paceRatio: 2, x: 1, y: 2 }];
    const latestSample = { collectedAt: "2026-05-25T11:50:00.000Z" };
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");

    const points = data.paceChartPointsWithLivePoint(
      historicalPoints,
      latestSample,
      windowData(),
      atMs,
    );

    expect(points).toHaveLength(2);
    expect(points[1]).toMatchObject({
      live: true,
      paceRatio: 2.5,
      x: atMs,
      y: 2.5,
    });
    expect(historicalPoints).toEqual([{ paceRatio: 2, x: 1, y: 2 }]);
    expect(
      data.livePaceChartPoint(latestSample, windowData(), atMs - 20 * 60_000),
    ).toBeNull();
    expect(
      data.livePaceChartPoint(
        latestSample,
        windowData(),
        Date.parse("2026-05-25T13:00:00.001Z"),
      ),
    ).toBeNull();
  });
});

describe("PacePetsDashboardChart live endpoint refresh", () => {
  let chartInstances;

  beforeEach(() => {
    chartInstances = [];
    globalThis.document = { documentElement: {} };
    globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" });
    globalThis.Chart = class FakeChart {
      static getChart() {
        return null;
      }

      constructor(_context, config) {
        this.data = config.data;
        this.options = config.options;
        this.destroy = vi.fn();
        this.update = vi.fn();
        chartInstances.push(this);
      }
    };
  });

  afterEach(() => {
    globalThis.Chart = originalChart;
    globalThis.document = originalDocument;
    globalThis.getComputedStyle = originalGetComputedStyle;
  });

  it("replaces one live point in place and leaves previews authoritative", () => {
    const chartCanvas = {
      getContext: vi.fn(() => ({})),
      hidden: false,
      setAttribute: vi.fn(),
    };
    const chartFrame = {
      classList: { add: vi.fn(), remove: vi.fn() },
    };
    const chartState = { hidden: false, textContent: "" };
    const renderer = globalThis.PacePetsDashboardChart.createRenderer({
      chartCanvas,
      chartFrame,
      chartState,
      windowSpecs: { weekly: { chartSampleLabel: "7-day" } },
    });
    const summaryWindow = windowData();
    const history = {
      samples: [
        {
          collectedAt: "2026-05-25T11:50:00.000Z",
          windows: { weekly: summaryWindow },
        },
      ],
    };
    const firstAtMs = Date.parse("2026-05-25T12:00:00.000Z");
    renderer.renderHistory({
      atMs: firstAtMs,
      hasResetTiming: true,
      history,
      summaryWindow,
      summaryWindowKey: "weekly",
    });

    expect(chartInstances).toHaveLength(1);
    const chart = chartInstances[0];
    expect(chart.data.datasets[0].data.filter((point) => point.live)).toEqual([
      expect.objectContaining({ x: firstAtMs }),
    ]);

    const nextAtMs = firstAtMs + 60_000;
    expect(
      renderer.refreshHistoryLivePoint({
        atMs: nextAtMs,
        summaryWindow,
        summaryWindowKey: "weekly",
      }),
    ).toBe(true);
    expect(chartInstances).toHaveLength(1);
    expect(chart.data.datasets[0].data.filter((point) => point.live)).toEqual([
      expect.objectContaining({ x: nextAtMs }),
    ]);
    expect(chart.update).toHaveBeenCalledWith("none");

    renderer.renderPreview({
      atMs: nextAtMs,
      paceRatio: 1,
      summaryWindowKey: "weekly",
      windowData: summaryWindow,
    });
    expect(
      renderer.refreshHistoryLivePoint({
        atMs: nextAtMs + 60_000,
        summaryWindow,
        summaryWindowKey: "weekly",
      }),
    ).toBe(false);
  });
});
