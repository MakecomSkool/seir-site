import { SOUND, type SoundBed } from "@/content/film";

// Звуковой слой фильма: WebAudio поверх rAF-цикла FilmStage. Эмбиент-слои
// переливаются по глобальному времени t (скат crossfadeT центрирован на
// границе раздела — сумма соседей держится около единицы), вжухи пролётов
// триггерятся на смене сегментов с громкостью и питчем от скорости скролла.
// Контекст создаётся только после жеста пользователя (политика автоплея),
// буферы грузятся лениво после разблокировки.
export class FilmSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bedGains = new Map<string, GainNode>();
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Set<string>();
  private started = new Set<string>();
  private enabled = true;
  private lastWhooshAt = 0;
  private whooshIdx = 0;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? SOUND.masterGain : 0;
    this.master.connect(this.ctx.destination);
    for (const bed of [...SOUND.beds, ...SOUND.extras]) this.load(bed.src);
    for (const src of SOUND.whooshes) this.load(src);
  }

  private load(src: string) {
    if (!this.ctx || this.buffers.has(src) || this.loading.has(src)) return;
    this.loading.add(src);
    fetch(src)
      .then((r) => r.arrayBuffer())
      .then((ab) => this.ctx!.decodeAudioData(ab))
      .then((buf) => {
        this.buffers.set(src, buf);
        this.loading.delete(src);
      })
      .catch(() => this.loading.delete(src));
  }

  // Луп-слой стартует при первом появлении буфера на нулевой громкости.
  // Точки лупа сдвинуты внутрь: mp3-кодек добавляет тишину по краям
  // (encoder delay), на бесшовных дронах внутренний шов не слышен.
  private ensureBed(bed: SoundBed) {
    if (!this.ctx || !this.master || this.started.has(bed.id)) return;
    const buf = this.buffers.get(bed.src);
    if (!buf) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    const node = this.ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    node.loopStart = 0.08;
    node.loopEnd = Math.max(1, buf.duration - 0.08);
    node.connect(gain);
    node.start();
    this.bedGains.set(bed.id, gain);
    this.started.add(bed.id);
  }

  // Вызывается каждый rAF: целевая громкость слоя из окна [fromT, toT]
  // со скатами шириной crossfadeT, сглаживание setTargetAtTime
  update(t: number) {
    if (!this.ctx || !this.master) return;
    const fade = SOUND.crossfadeT;
    for (const bed of [...SOUND.beds, ...SOUND.extras]) {
      this.ensureBed(bed);
      const gain = this.bedGains.get(bed.id);
      if (!gain) continue;
      const inRamp = (t - bed.fromT + fade / 2) / fade;
      const outRamp = (bed.toT + fade / 2 - t) / fade;
      const target =
        Math.max(0, Math.min(1, Math.min(inRamp, outRamp))) * bed.gain;
      gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
    }
  }

  // Вжух пролёта на смене сегмента: громкость и питч от скорости скролла,
  // кулдаун гасит очередь от джиттера у границы
  junction(velocity: number) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const now = performance.now();
    if (now - this.lastWhooshAt < SOUND.whooshCooldownMs) return;
    const src = SOUND.whooshes[this.whooshIdx++ % SOUND.whooshes.length];
    const buf = this.buffers.get(src);
    if (!buf) return;
    this.lastWhooshAt = now;
    const v = Math.min(1, Math.abs(velocity) / 3500);
    const gain = this.ctx.createGain();
    gain.gain.value = SOUND.whooshGain * (0.45 + v * 0.55);
    gain.connect(this.master);
    const node = this.ctx.createBufferSource();
    node.buffer = buf;
    node.playbackRate.value = 0.92 + v * 0.25;
    node.connect(gain);
    node.onended = () => gain.disconnect();
    node.start();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(
        on ? SOUND.masterGain : 0,
        this.ctx.currentTime,
        0.15,
      );
      if (on && this.ctx.state === "suspended")
        this.ctx.resume().catch(() => {});
    }
  }

  suspend() {
    this.ctx?.suspend().catch(() => {});
  }

  resume() {
    if (this.enabled) this.ctx?.resume().catch(() => {});
  }

  dispose() {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.bedGains.clear();
    this.buffers.clear();
    this.started.clear();
  }
}
