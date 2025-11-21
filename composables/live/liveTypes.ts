// composables/live/liveTypes.ts
export interface LiveCandidate {
  id: string
  email: string | null
  live_started_at: string | null
}

export type LiveSignalPayload =
  | { viewerId: string }
  | { viewerId: string; offer: RTCSessionDescriptionInit }
  | { viewerId: string; answer: RTCSessionDescriptionInit }
  | { viewerId: string; candidate: RTCIceCandidateInit }
