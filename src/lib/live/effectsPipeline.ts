/**
 * Live video compositor: camera -> (green screen key | AI person cutout) -> background -> stickers.
 * Output is a canvas MediaStream that replaces the raw camera in the broadcast.
 */
export type BgMode = "none" | "chroma" | "segment";

export interface Sticker {
  id: string;
  kind: "emoji" | "image";
  value: string; // emoji char or image url
  x: number; // 0..1 center
  y: number;
  size: number; // fraction of canvas width
}

export interface EffectSettings {
  mode: BgMode;
  keyColor: [number, number, number]; // 0..1
  similarity: number; // 0..1
  smoothness: number; // 0..1
  background: { type: "none" | "color" | "image" | "video"; value: string };
  stickers: Sticker[];
}

export const DEFAULT_EFFECTS: EffectSettings = {
  mode: "none",
  keyColor: [0, 1, 0],
  similarity: 0.4,
  smoothness: 0.1,
  background: { type: "none", value: "" },
  stickers: [],
};

const VS = `attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)/2.,1.-(p.y+1.)/2.);gl_Position=vec4(p,0.,1.);}`;
const FS = `precision mediump float;varying vec2 uv;uniform sampler2D t;uniform vec3 k;uniform float s;uniform float m;
vec2 rgb2uv(vec3 c){return vec2(c.r*-.169+c.g*-.331+c.b*.5+.5,c.r*.5+c.g*-.419+c.b*-.081+.5);}
void main(){vec4 c=texture2D(t,uv);float d=distance(rgb2uv(c.rgb),rgb2uv(k));float a=smoothstep(s,s+m,d);
float sp=pow(clamp(d-s,0.,1.),1.5);float l=clamp(c.r*.2126+c.g*.7152+c.b*.0722,0.,1.);
vec3 col=mix(vec3(l),c.rgb,clamp(sp/m,0.,1.));gl_FragColor=vec4(col*a,a);}`;

export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Loads remote media as a same-origin blob URL so the canvas stays exportable. */
async function toLocalUrl(url: string): Promise<string> {
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Could not load background");
  return URL.createObjectURL(await res.blob());
}

export class EffectsPipeline {
  private cam = document.createElement("video");
  private out = document.createElement("canvas");
  private ctx = this.out.getContext("2d")!;
  private layer = document.createElement("canvas");
  private lctx = this.layer.getContext("2d")!;
  private gl: WebGLRenderingContext | null = null;
  private glCanvas = document.createElement("canvas");
  private glTex: WebGLTexture | null = null;
  private glU: Record<string, WebGLUniformLocation | null> = {};
  private maskCanvas = document.createElement("canvas");
  private segmenter: any = null;
  private segLoading: Promise<void> | null = null;
  private bgImg: HTMLImageElement | null = null;
  private bgVid: HTMLVideoElement | null = null;
  private stickerImgs = new Map<string, HTMLImageElement>();
  private raf = 0;
  private stopped = false;
  private lastSegTs = -1;
  settings: EffectSettings = { ...DEFAULT_EFFECTS };
  stream: MediaStream;

  constructor(private camera: MediaStream, fps = 30) {
    this.cam.srcObject = camera;
    this.cam.muted = true;
    this.cam.playsInline = true;
    void this.cam.play().catch(() => {});
    const s = camera.getVideoTracks()[0]?.getSettings();
    this.resize(s?.width || 720, s?.height || 1280);
    this.stream = this.out.captureStream(fps);
    camera.getAudioTracks().forEach((t) => this.stream.addTrack(t));
    this.loop();
  }

  private resize(w: number, h: number) {
    const scale = Math.min(1, 1280 / Math.max(w, h));
    const W = Math.round(w * scale), H = Math.round(h * scale);
    if (this.out.width === W && this.out.height === H) return;
    [this.out, this.layer, this.glCanvas].forEach((c) => { c.width = W; c.height = H; });
  }

  get canvas() { return this.out; }

  async update(next: Partial<EffectSettings>) {
    const prevBg = this.settings.background;
    this.settings = { ...this.settings, ...next };
    const bg = this.settings.background;
    if (bg.type !== prevBg.type || bg.value !== prevBg.value) await this.loadBackground();
    if (this.settings.mode === "segment") await this.ensureSegmenter();
    for (const st of this.settings.stickers) if (st.kind === "image" && !this.stickerImgs.has(st.value)) {
      const img = new Image();
      img.src = await toLocalUrl(st.value).catch(() => st.value);
      this.stickerImgs.set(st.value, img);
    }
  }

  private async loadBackground() {
    this.bgVid?.pause();
    this.bgImg = null;
    this.bgVid = null;
    const { type, value } = this.settings.background;
    if (!value || (type !== "image" && type !== "video")) return;
    const src = await toLocalUrl(value);
    if (type === "image") {
      const img = new Image();
      img.src = src;
      await img.decode().catch(() => {});
      this.bgImg = img;
    } else {
      const v = document.createElement("video");
      Object.assign(v, { src, muted: true, loop: true, playsInline: true });
      await v.play().catch(() => {});
      this.bgVid = v;
    }
  }

  private async ensureSegmenter() {
    if (this.segmenter) return;
    this.segLoading ??= (async () => {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
      const opts = (delegate: "GPU" | "CPU") => ({
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate,
        },
        runningMode: "VIDEO" as const,
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      try { this.segmenter = await ImageSegmenter.createFromOptions(files, opts("GPU")); }
      catch { this.segmenter = await ImageSegmenter.createFromOptions(files, opts("CPU")); }
    })();
    await this.segLoading;
  }

  private initGl() {
    if (this.gl) return this.gl;
    const gl = this.glCanvas.getContext("webgl", { premultipliedAlpha: true });
    if (!gl) return null;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.glTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.glTex);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    this.glU = { k: gl.getUniformLocation(prog, "k"), s: gl.getUniformLocation(prog, "s"), m: gl.getUniformLocation(prog, "m") };
    this.gl = gl;
    return gl;
  }

  private drawCover(src: CanvasImageSource, sw: number, sh: number, ctx = this.ctx) {
    const W = this.out.width, H = this.out.height;
    if (!sw || !sh) return;
    const r = Math.max(W / sw, H / sh);
    const w = sw * r, h = sh * r;
    ctx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
  }

  private drawBackground() {
    const { background } = this.settings;
    const W = this.out.width, H = this.out.height;
    if (background.type === "color" && background.value) {
      this.ctx.fillStyle = background.value;
      this.ctx.fillRect(0, 0, W, H);
    } else if (this.bgImg?.naturalWidth) this.drawCover(this.bgImg, this.bgImg.naturalWidth, this.bgImg.naturalHeight);
    else if (this.bgVid?.videoWidth) this.drawCover(this.bgVid, this.bgVid.videoWidth, this.bgVid.videoHeight);
    else { this.ctx.fillStyle = "#111"; this.ctx.fillRect(0, 0, W, H); }
  }

  private personLayer(): CanvasImageSource | null {
    const { mode } = this.settings;
    const vw = this.cam.videoWidth, vh = this.cam.videoHeight;
    if (mode === "chroma") {
      const gl = this.initGl();
      if (!gl) return null;
      gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
      gl.bindTexture(gl.TEXTURE_2D, this.glTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.cam);
      gl.uniform3fv(this.glU.k, this.settings.keyColor);
      gl.uniform1f(this.glU.s, this.settings.similarity * 0.5);
      gl.uniform1f(this.glU.m, Math.max(0.001, this.settings.smoothness * 0.3));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // GL canvas is stretched to output size; camera aspect is preserved by matching sizes.
      return this.glCanvas;
    }
    if (mode === "segment" && this.segmenter) {
      const now = performance.now();
      if (now <= this.lastSegTs) return null;
      this.lastSegTs = now;
      const res = this.segmenter.segmentForVideo(this.cam, now);
      const mask = res?.confidenceMasks?.[0];
      if (!mask) return null;
      const mw = mask.width, mh = mask.height;
      const data = mask.getAsFloat32Array() as Float32Array;
      this.maskCanvas.width = mw; this.maskCanvas.height = mh;
      const mctx = this.maskCanvas.getContext("2d")!;
      const img = mctx.createImageData(mw, mh);
      for (let i = 0; i < data.length; i++) img.data[i * 4 + 3] = Math.min(255, Math.max(0, (data[i] - 0.3) * 425));
      mctx.putImageData(img, 0, 0);
      res.close?.();
      const L = this.lctx;
      L.globalCompositeOperation = "source-over";
      L.clearRect(0, 0, this.layer.width, this.layer.height);
      L.filter = "blur(2px)";
      this.drawCover(this.maskCanvas, vw, vh, L);
      L.filter = "none";
      L.globalCompositeOperation = "source-in";
      this.drawCover(this.cam, vw, vh, L);
      L.globalCompositeOperation = "source-over";
      return this.layer;
    }
    return null;
  }

  private drawStickers() {
    const W = this.out.width, H = this.out.height;
    for (const st of this.settings.stickers) {
      const size = st.size * W;
      const cx = st.x * W, cy = st.y * H;
      if (st.kind === "emoji") {
        this.ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(st.value, cx, cy);
      } else {
        const img = this.stickerImgs.get(st.value);
        if (img?.naturalWidth) {
          const h = size * (img.naturalHeight / img.naturalWidth);
          this.ctx.drawImage(img, cx - size / 2, cy - h / 2, size, h);
        }
      }
    }
  }

  private loop = () => {
    if (this.stopped) return;
    const vw = this.cam.videoWidth, vh = this.cam.videoHeight;
    if (vw && vh) {
      if (this.settings.mode === "chroma") this.resize(vw, vh);
      const W = this.out.width, H = this.out.height;
      this.ctx.clearRect(0, 0, W, H);
      const person = this.settings.mode !== "none" ? this.personLayer() : null;
      if (person) {
        this.drawBackground();
        this.ctx.drawImage(person, 0, 0, W, H);
      } else if (this.settings.mode === "segment" && !this.segmenter) {
        this.drawCover(this.cam, vw, vh); // model still loading
      } else if (this.settings.mode === "segment") {
        // skip frame, keep previous
      } else {
        this.drawCover(this.cam, vw, vh);
      }
      this.drawStickers();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.bgVid?.pause();
    this.stream.getVideoTracks().forEach((t) => t.stop());
    this.segmenter?.close?.();
    this.cam.srcObject = null;
  }
}
