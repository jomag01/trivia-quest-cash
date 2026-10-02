// Scalable camera lives via Amazon IVS Real-Time stages.
// The seller publishes once to Amazon; Amazon fans the video out to viewers,
// so the seller's phone upload stays the same no matter how many people watch.
import { supabase } from "@/integrations/supabase/client";
import type { ConnectionState } from "./SFUConnection";

type IvsModule = typeof import("amazon-ivs-web-broadcast");
let ivsPromise: Promise<IvsModule> | null = null;
const loadIvs = () => (ivsPromise ||= import("amazon-ivs-web-broadcast"));

async function getToken(action: "stage-publish" | "stage-view", streamId: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("ivs-stream", { body: { action, streamId } });
  if (error) { console.warn("[IVS stage]", action, error.message); return null; }
  return (data as { token?: string | null })?.token || null;
}

const mapState = (s: string): ConnectionState =>
  s === "connected" ? "connected" : s === "connecting" ? "connecting" : s === "errored" ? "failed" : "disconnected";

/** Seller side. start() resolves false if the stage could not be used (caller falls back). */
export class IVSStageBroadcaster {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stage: any = null;
  constructor(private streamId: string, private opts: { onStateChange?: (s: ConnectionState) => void } = {}) {}

  async start(stream: MediaStream): Promise<boolean> {
    const token = await getToken("stage-publish", this.streamId);
    if (!token) return false;
    const ivs = await loadIvs();
    const local = stream.getTracks().map((t) =>
      t.kind === "video"
        ? new ivs.LocalStageStream(t, { simulcast: { enabled: true } } as never)
        : new ivs.LocalStageStream(t)
    );
    this.stage = new ivs.Stage(token, {
      stageStreamsToPublish: () => local,
      shouldPublishParticipant: () => true,
      shouldSubscribeToParticipant: () => ivs.SubscribeType.NONE,
    });
    this.stage.on(ivs.StageEvents.STAGE_CONNECTION_STATE_CHANGED, (s: string) => this.opts.onStateChange?.(mapState(s)));
    try {
      await this.stage.join();
      return true;
    } catch (e) {
      console.warn("[IVS stage] publish join failed", e);
      this.stop();
      return false;
    }
  }

  stop() {
    try { this.stage?.leave(); } catch { /* ignore */ }
    this.stage = null;
  }

  /** Delete the Amazon stage when the live ends. */
  static async end(streamId: string) {
    await supabase.functions.invoke("ivs-stream", { body: { action: "stage-end", streamId } }).catch(() => {});
  }
}

/** Viewer side. connect() resolves false if the live isn't on a stage. */
export class IVSStageViewer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stage: any = null;
  private media = new MediaStream();
  constructor(
    private streamId: string,
    private opts: { onRemoteStream: (s: MediaStream) => void; onStateChange?: (s: ConnectionState) => void }
  ) {}

  async connect(): Promise<boolean> {
    const token = await getToken("stage-view", this.streamId);
    if (!token) return false;
    const ivs = await loadIvs();
    this.stage = new ivs.Stage(token, {
      stageStreamsToPublish: () => [],
      shouldPublishParticipant: () => false,
      shouldSubscribeToParticipant: () => ivs.SubscribeType.AUDIO_VIDEO,
    });
    this.stage.on(ivs.StageEvents.STAGE_CONNECTION_STATE_CHANGED, (s: string) => this.opts.onStateChange?.(mapState(s)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.stage.on(ivs.StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (_p: any, streams: any[]) => {
      streams.forEach((s) => {
        this.media.getTracks().filter((t) => t.kind === s.mediaStreamTrack.kind).forEach((t) => this.media.removeTrack(t));
        this.media.addTrack(s.mediaStreamTrack);
      });
      this.opts.onRemoteStream(this.media);
    });
    try {
      await this.stage.join();
      return true;
    } catch (e) {
      console.warn("[IVS stage] view join failed", e);
      this.disconnect();
      return false;
    }
  }

  disconnect() {
    try { this.stage?.leave(); } catch { /* ignore */ }
    this.stage = null;
  }
}
