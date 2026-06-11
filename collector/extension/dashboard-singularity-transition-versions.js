(function attachPacePetsDashboardSingularityTransitionVersions(root) {
  "use strict";

  const DEVELOPER_OPTIONS = root.PacePetsDeveloperOptions;
  const V1_RENDERER = root.PacePetsDashboardSingularityTransitionRenderer;
  const V2_RENDERER = root.PacePetsDashboardSingularityTransitionV2Renderer;
  if (!DEVELOPER_OPTIONS || !V1_RENDERER || !V2_RENDERER) {
    throw new Error(
      "Developer options and Singularity transition renderers must load before transition versions.",
    );
  }

  const RENDERERS = Object.freeze({
    v1: V1_RENDERER,
    v2: V2_RENDERER,
  });

  function create({ version, ...options }) {
    const normalizedVersion =
      DEVELOPER_OPTIONS.normalizeSingularityTransitionVersion(version);
    const renderer = RENDERERS[normalizedVersion];
    if (!renderer) {
      throw new Error(
        `Unsupported Singularity transition version: ${normalizedVersion}`,
      );
    }

    return renderer.create(options);
  }

  root.PacePetsDashboardSingularityTransitionVersions = Object.freeze({
    create,
  });
})(globalThis);
