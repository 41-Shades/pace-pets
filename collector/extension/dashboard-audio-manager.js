(function attachPacePetsDashboardAudioManager(root) {
  "use strict";

  const AUDIO_CLIPS = root.PacePetsAudioClips;
  const AUDIO_PREFERENCES = root.PacePetsAudioPreferences;
  if (!AUDIO_CLIPS || !AUDIO_PREFERENCES) {
    throw new Error(
      "Audio clips and preferences must load before dashboard-audio-manager.js.",
    );
  }

  const STATUS_MUTED = "muted";
  const STATUS_NEEDS_GESTURE = "needsGesture";
  const STATUS_READY = "ready";
  const STATUS_UNAVAILABLE = "unavailable";
  const STOP_PAD_SECONDS = 0.05;

  function seconds(ms) {
    return Math.max(0, ms || 0) / 1000;
  }

  function finiteMilliseconds(value) {
    return Number.isFinite(value) ? Math.max(0, value) : null;
  }

  function bufferDurationMs(buffer) {
    return Number.isFinite(buffer?.duration)
      ? Math.max(0, buffer.duration * 1000)
      : 0;
  }

  function clipOffsetMs(buffer, options) {
    return Math.min(
      finiteMilliseconds(options.offsetMs) ?? 0,
      bufferDurationMs(buffer),
    );
  }

  function clipDurationMs(buffer, options, offsetMs) {
    const durationMs = finiteMilliseconds(options.durationMs);
    if (durationMs !== null) {
      return durationMs;
    }
    if (finiteMilliseconds(options.fadeOutMs) !== null) {
      return Math.max(0, bufferDurationMs(buffer) - offsetMs);
    }
    return null;
  }

  function scheduleClipEnd({
    durationMs,
    fadeOutMs,
    gain,
    source,
    startAt,
    volume,
  }) {
    if (durationMs === null) {
      return;
    }

    const stopAt = startAt + seconds(durationMs);
    const fadeDurationMs = Math.min(
      durationMs,
      finiteMilliseconds(fadeOutMs) ?? 0,
    );
    if (fadeDurationMs > 0) {
      const fadeStartAt = startAt + seconds(durationMs - fadeDurationMs);
      gain.gain.setValueAtTime(volume, fadeStartAt);
      gain.gain.linearRampToValueAtTime(0, stopAt);
    }
    source.stop(stopAt + STOP_PAD_SECONDS);
  }

  function audioContextConstructor() {
    return root.AudioContext || root.webkitAudioContext || null;
  }

  function gainValue(node) {
    return Number.isFinite(node?.gain?.value) ? node.gain.value : 0;
  }

  class DashboardAudioManager {
    constructor({
      AudioContextConstructor = audioContextConstructor(),
      clips = AUDIO_CLIPS,
      fetchAudio = root.fetch?.bind(root),
      preferences = AUDIO_PREFERENCES,
    } = {}) {
      this.AudioContextConstructor = AudioContextConstructor;
      this.activeByGroup = new Map();
      this.buffers = new Map();
      this.bufferPromises = new Map();
      this.clips = clips;
      this.context = null;
      this.fetchAudio = fetchAudio;
      this.gains = null;
      this.preference = preferences.storedAudioPreferenceValue();
      this.preferenceRevision = 0;
      this.preferences = preferences;
      this.statusListeners = new Set();
      this.unavailable = false;
    }

    status() {
      if (!this.preference.enabled) {
        return STATUS_MUTED;
      }
      if (this.unavailable) {
        return STATUS_UNAVAILABLE;
      }
      return this.context?.state === "running"
        ? STATUS_READY
        : STATUS_NEEDS_GESTURE;
    }

    async loadPreference() {
      const preferenceRevision = this.preferenceRevision;
      const result = await this.preferences.readAudioPreference();
      if (preferenceRevision !== this.preferenceRevision) {
        return Object.freeze({ error: result.error, status: this.status() });
      }

      this.preference = result.value;
      this.applyPreference();
      this.notifyStatusChanged();
      return Object.freeze({ error: result.error, status: this.status() });
    }

    setPreference(preference) {
      this.preferenceRevision += 1;
      this.preference = this.preferences.storedAudioPreferenceValue(preference);
      this.applyPreference();
      this.notifyStatusChanged();
      return this.preference;
    }

    async storeCurrentPreference() {
      return this.preferences.storeAudioPreference(this.preference);
    }

    async storePreference(preference) {
      this.setPreference(preference);
      return this.storeCurrentPreference();
    }

    addStatusChangeListener(listener) {
      this.statusListeners.add(listener);
      return () => {
        this.statusListeners.delete(listener);
      };
    }

    notifyStatusChanged() {
      const status = this.status();
      for (const listener of this.statusListeners) {
        listener(status);
      }
    }

    async setEnabled(enabled) {
      const preference = this.setPreference({
        ...this.preference,
        enabled: enabled === true,
      });
      if (!preference.enabled) {
        this.stopAll();
        const result = await this.storeCurrentPreference();
        return Object.freeze({ ...result, status: this.status() });
      }

      await this.resume();
      const result = await this.storeCurrentPreference();
      return Object.freeze({ ...result, status: this.status() });
    }

    async setVolume(volume) {
      const result = await this.storePreference({
        ...this.preference,
        volume,
      });
      return Object.freeze({ ...result, status: this.status() });
    }

    ensureContext() {
      if (this.context || this.unavailable) {
        return this.context;
      }
      if (!this.AudioContextConstructor || !this.fetchAudio) {
        this.unavailable = true;
        this.notifyStatusChanged();
        return null;
      }

      this.context = new this.AudioContextConstructor();
      this.context.addEventListener?.("statechange", () => {
        this.notifyStatusChanged();
      });
      this.gains = this.createGainGraph();
      this.applyPreference();
      return this.context;
    }

    createGainGraph() {
      const master = this.context.createGain();
      const music = this.context.createGain();
      const effects = this.context.createGain();
      music.connect(master);
      effects.connect(master);
      master.connect(this.context.destination);
      return Object.freeze({ effects, master, music });
    }

    applyPreference() {
      if (this.gains?.master) {
        this.gains.master.gain.value = this.preference.volume;
      }
    }

    async resume() {
      if (!this.preference.enabled) {
        return this.status();
      }

      const context = this.ensureContext();
      if (!context) {
        return this.status();
      }

      try {
        if (context.state !== "running") {
          await context.resume?.();
        }
      } catch {
        this.notifyStatusChanged();
        return this.status();
      }

      this.notifyStatusChanged();
      return this.status();
    }

    async loadBuffer(clipId) {
      if (this.buffers.has(clipId)) {
        return this.buffers.get(clipId);
      }
      if (this.bufferPromises.has(clipId)) {
        return this.bufferPromises.get(clipId);
      }

      const clipUrl = this.clips.urlForClip(clipId);
      if (!clipUrl) {
        throw new Error(`Unknown audio clip: ${clipId}`);
      }

      const bufferPromise = this.fetchAudio(clipUrl)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => this.context.decodeAudioData(arrayBuffer))
        .then((buffer) => {
          this.buffers.set(clipId, buffer);
          return buffer;
        })
        .finally(() => {
          this.bufferPromises.delete(clipId);
        });
      this.bufferPromises.set(clipId, bufferPromise);
      return bufferPromise;
    }

    async preloadClip(clipId) {
      if (this.status() !== STATUS_READY) {
        return null;
      }

      return this.loadBuffer(clipId);
    }

    timelineStartTime() {
      return this.status() === STATUS_READY ? this.context.currentTime : null;
    }

    channelGain(channel) {
      return channel === "music" ? this.gains.music : this.gains.effects;
    }

    async playClip(clipId, options = {}) {
      if (this.status() !== STATUS_READY) {
        return null;
      }

      const clip = this.clips.clipForId(clipId);
      if (!clip) {
        throw new Error(`Unknown audio clip: ${clipId}`);
      }

      const buffer = await this.loadBuffer(clipId);
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      const requestedStartAt = Number.isFinite(options.startAt)
        ? options.startAt
        : this.context.currentTime + seconds(options.delayMs);
      const startAt = Math.max(this.context.currentTime, requestedStartAt);
      const volume = Number.isFinite(options.volume)
        ? options.volume
        : clip.volume;
      const group = options.group || clip.group;
      const offsetMs = clipOffsetMs(buffer, options);
      const durationMs = clipDurationMs(buffer, options, offsetMs);

      source.buffer = buffer;
      source.loop = options.loop ?? clip.loop;
      gain.gain.value = options.fadeInMs ? 0 : volume;
      gain.connect(this.channelGain(clip.channel));
      source.connect(gain);
      if (options.fadeInMs) {
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(
          volume,
          startAt + seconds(options.fadeInMs),
        );
      }
      const handle = Object.freeze({ gain, group, source });
      source.onended = () => this.releaseHandle(handle);
      this.trackHandle(handle);
      source.start(startAt, seconds(offsetMs));
      scheduleClipEnd({
        durationMs,
        fadeOutMs: options.fadeOutMs,
        gain,
        source,
        startAt,
        volume,
      });
      return handle;
    }

    scheduleClip(
      clipId,
      { atMs = 0, timelineStartAt = null, ...options } = {},
    ) {
      const startAt = Number.isFinite(timelineStartAt)
        ? timelineStartAt + seconds(atMs)
        : undefined;
      return this.playClip(clipId, { ...options, delayMs: atMs, startAt });
    }

    trackHandle(handle) {
      const handles = this.activeByGroup.get(handle.group) || new Set();
      handles.add(handle);
      this.activeByGroup.set(handle.group, handles);
    }

    releaseHandle(handle) {
      const handles = this.activeByGroup.get(handle.group);
      handles?.delete(handle);
      if (handles?.size === 0) {
        this.activeByGroup.delete(handle.group);
      }
    }

    fadeOut(handle, { durationMs = 0 } = {}) {
      if (!handle || !this.context) {
        return;
      }

      const now = this.context.currentTime;
      const stopAt = now + seconds(durationMs);
      handle.gain.gain.cancelScheduledValues?.(now);
      handle.gain.gain.setValueAtTime(gainValue(handle.gain), now);
      handle.gain.gain.linearRampToValueAtTime(0, stopAt);
      handle.source.stop(stopAt + STOP_PAD_SECONDS);
    }

    stopGroup(group, { fadeOutMs = 0 } = {}) {
      const handles = [...(this.activeByGroup.get(group) || [])];
      for (const handle of handles) {
        this.fadeOut(handle, { durationMs: fadeOutMs });
      }
    }

    stopAll({ fadeOutMs = 0 } = {}) {
      for (const group of [...this.activeByGroup.keys()]) {
        this.stopGroup(group, { fadeOutMs });
      }
    }
  }

  function create(options) {
    return new DashboardAudioManager(options);
  }

  root.PacePetsDashboardAudioManager = Object.freeze({
    STATUS_MUTED,
    STATUS_NEEDS_GESTURE,
    STATUS_READY,
    STATUS_UNAVAILABLE,
    create,
  });
})(globalThis);
