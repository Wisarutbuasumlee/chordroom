"use client";

import { useSyncExternalStore } from "react";
import { getChordServerState, getChordState, subscribeChord } from "@/lib/chordWindow";

export function useChordWindow() {
  return useSyncExternalStore(subscribeChord, getChordState, getChordServerState);
}
