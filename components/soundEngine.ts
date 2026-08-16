import { SOUND, type SoundBed } from "@/content/film";

// Звуковой слой фильма: WebAudio поверх rAF-цикла FilmStage. Эмбиент-слои
// и музыкальная подложка переливаются по глобальному времени t (скат
// crossfadeT центрирован на границе раздела), голосовые реплики играют
// один раз на входе в раздел с дакингом фона. Контекст создаётся только
// после жеста пользователя (политика автоплея), буферы грузятся лениво.
export class FilmSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  // Шина фона (эмбиенты + музыка): приглушается под голосом
  private bedsBus: GainNode | null = null;
  private bedGains = new Map<string, GainNode>();
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Set<string>();
  private started = new Set<string>();
  private enabled = true;
  private lastWhooshAt = 0;
  private whooshIdx = 0;
  // Голос: сыгранные разделы, текущий источник, отложенный до буфера/жеста
  private voiceSrcBySection = new Map(
    SOUND.voice.map((v) => [v.section as string, v.src]),
  );
  private voPlayed = new Set<string>();
  private voCurrent: AudioBufferSourceNode | null = null;
  private pendingVoice: string | null = null;

  // Музыка — обычный слой с окном во весь фильм
  private allBeds: SoundBed[] = [
    ...SOUND.beds,
    ...SOUND.extras,
    { id: "music", src: SOUND.music.src, fromT: -999, toT: 999, gain: SOUND.music.gain },
  ];

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
    this.bedsBus = this.ctx.createGain();
    this.bedsBus.gain.value = 1;
    this.bedsBus.connect(this.master);
    for (const bed of this.allBeds) this.load(bed.src);
    for (const src of SOUND.whooshes) this.load(src);
    for (const src of this.voiceSrcBySection.values()) this.load(src);
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
    if (!this.ctx || !this.bedsBus || this.started.has(bed.id)) return;
    const buf = this.buffers.get(bed.src);
    if (!buf) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.bedsBus);
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
    for (const bed of this.allBeds) {
      this.ensureBed(bed);
      const gain = this.bedGains.get(bed.id);
      if (!gain) continue;
      const inRamp = (t - bed.fromT + fade / 2) / fade;
      const outRamp = (bed.toT + fade / 2 - t) / fade;
      const target =
        Math.max(0, Math.min(1, Math.min(inRamp, outRamp))) * bed.gain;
      gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
    }
    // Реплика, ждавшая буфер или разблокировку
    if (this.pendingVoice) this.voice(this.pendingVoice);
  }

  // Презентационная реплика раздела: один раз за сессию, фон приглушается
  voice(section: string) {
    const src = this.voiceSrcBySection.get(section);
    if (!src || this.voPlayed.has(section)) {
      if (this.pendingVoice === section) this.pendingVoice = null;
      return;
    }
    if (!this.ctx || !this.master || !this.bedsBus) {
      this.pendingVoice = section;
      return;
    }
    const buf = this.buffers.get(src);
    if (!buf) {
      this.pendingVoice = section;
      return;
    }
    this.pendingVoice = null;
    this.voPlayed.add(section);
    this.voCurrent?.stop();
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    gain.connect(this.master);
    const node = this.ctx.createBufferSource();
    node.buffer = buf;
    node.connect(gain);
    this.bedsBus.gain.setTargetAtTime(
      SOUND.voiceDuck,
      this.ctx.currentTime,
      0.3,
    );
    node.onended = () => {
      gain.disconnect();
      // Дакинг снимает только последняя живая реплика
      if (this.voCurrent === node && this.ctx && this.bedsBus) {
        this.voCurrent = null;
        this.bedsBus.gain.setTargetAtTime(1, this.ctx.currentTime, 0.5);
      }
    };
    node.start();
    this.voCurrent = node;
  }

  // Вжух пролёта на смене сегмента: выключен пустым списком в конфиге
  junction(velocity: number) {
    if (!SOUND.whooshes.length) return;
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
    this.bedsBus = null;
    this.bedGains.clear();
    this.buffers.clear();
    this.started.clear();
  }
}
