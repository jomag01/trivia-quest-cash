// WebRTC utilities for video calling
// Using Daily.co as the provider for group video calls up to 200 participants

export interface VideoCallConfig {
  roomName: string;
  userName: string;
  isOwner: boolean;
}

export const createDailyRoom = async (roomName: string): Promise<string> => {
  // This would integrate with Daily.co API through an edge function
  // For now, return a mock room URL
  return `https://your-domain.daily.co/${roomName}`;
};

export const joinDailyRoom = (roomUrl: string, userName: string) => {
  // Open Daily.co room in new window or iframe
  window.open(roomUrl, '_blank', 'width=1280,height=720');
};
