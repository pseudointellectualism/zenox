import StreamWaitingScreen from "@/components/player/StreamWaitingScreen";

export default function MediaLoading() {
  return (
    <StreamWaitingScreen
      isReady={false}
      sourceName="Bubbles"
    />
  );
}
