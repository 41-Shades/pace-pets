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
  await importExtensionScript("collector/extension/dashboard-chart-readout.js");
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

function chartElements() {
  const chartListeners = {};
  return {
    chartCanvas: {
      addEventListener: vi.fn((eventName, listener) => {
        chartListeners[eventName] = listener;
      }),
      getContext: vi.fn(() => ({})),
      hidden: false,
      setAttribute: vi.fn(),
    },
    chartFrame: { classList: { add: vi.fn(), remove: vi.fn() } },
    chartInspection: { hidden: true },
    chartInspectionTime: { textContent: "" },
    chartInspectionValues: { textContent: "" },
    chartListeners,
    chartState: { hidden: false, textContent: "" },
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
      remainingPercent: 50,
      timePercent: 20,
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

  it("formats real readings with percents and previews without invented data", () => {
    const readout = globalThis.PacePetsDashboardChartReadout;
    const reading = readout.pointReadout({
      paceRatio: 1.3,
      remainingPercent: 48.4,
      timePercent: 37.4,
      x: Date.parse("2026-05-25T12:00:00.000Z"),
      y: 1.3,
    });
    const preview = readout.pointReadout({
      paceRatio: 1.3,
      preview: true,
      x: Date.parse("2026-05-25T12:00:00.000Z"),
      y: 1.3,
    });

    expect(reading?.values).toBe("Usage 48% · Time 37% · Pace 1.30x");
    expect(preview?.values).toBe("Pace 1.30x");
    expect(
      readout.pointReadout({
        cappedHigh: true,
        paceRatio: 52,
        x: Date.parse("2026-05-25T12:00:00.000Z"),
        y: 50,
      })?.values,
    ).toBe("Pace 52.00x (capped)");
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
    const elements = chartElements();
    const renderer = globalThis.PacePetsDashboardChart.createRenderer({
      ...elements,
      windowSpecs: { weekly: { chartSampleLabel: "7-day" } },
    });
    const {
      chartInspection,
      chartInspectionTime,
      chartInspectionValues,
      chartListeners,
    } = elements;
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
    expect(chart.options.plugins.tooltip.enabled).toBe(false);
    expect(chartInspection.hidden).toBe(true);
    expect(chartInspectionTime.textContent).toBe("");
    expect(chartInspectionValues.textContent).toBe("");

    chart.options.onHover(null, [{ datasetIndex: 0, index: 0 }], chart);
    expect(chartInspection.hidden).toBe(false);
    expect(chartInspectionValues.textContent).toBe(
      "Usage 50% · Time 23% · Pace 2.14x",
    );
    chartListeners.mouseleave();
    expect(chartInspection.hidden).toBe(true);
    expect(chartInspectionTime.textContent).toBe("");
    expect(chartInspectionValues.textContent).toBe("");

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
