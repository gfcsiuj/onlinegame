import { MULTISYNQ_API_KEY } from '../constants';
import { joinRoom } from 'trystero';

// We use Trystero to create a serverless P2P mesh network.
// The 'appId' effectively acts as the API Key/Room Key.
const APP_ID = MULTISYNQ_API_KEY.substring(0, 20); // Use part of key as Room ID

export interface PeerData {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  rotation: number;
  velocity: number;
}

class MultisynqService {
  private static instance: MultisynqService;
  private room: any;
  private sendAction: any;
  private onAction: any;
  private peers: Map<string, PeerData> = new Map();
  private onPeersUpdate: ((peers: PeerData[]) => void) | null = null;
  private myId: string = "";

  private constructor() {}

  public static getInstance(): MultisynqService {
    if (!MultisynqService.instance) {
      MultisynqService.instance = new MultisynqService();
    }
    return MultisynqService.instance;
  }

  public async connect(playerName: string, color: string): Promise<string> {
    console.log(`[Multisynq] Joining room: ${APP_ID}`);
    
    try {
      // Join the P2P room
      const config = { appId: APP_ID };
      this.room = joinRoom(config, 'apex-redline-lobby');
      
      // Setup actions
      const [sendData, getPeerData] = this.room.makeAction('gameUpdate');
      this.sendAction = sendData;
      
      // Handle self ID
      this.myId = this.room.selfId;

      // Listen for updates
      getPeerData((data: PeerData, peerId: string) => {
        this.peers.set(peerId, { ...data, id: peerId });
        this.notifyPeersUpdate();
      });

      // Handle peer leaving
      this.room.onPeerLeave((peerId: string) => {
        this.peers.delete(peerId);
        this.notifyPeersUpdate();
      });

      // Handle peer joining
      this.room.onPeerJoin((peerId: string) => {
        console.log(`Peer joined: ${peerId}`);
      });

      return this.myId;
    } catch (e) {
      console.error("Multisynq connection error:", e);
      throw new Error("Failed to initialize P2P network");
    }
  }

  public broadcastState(data: Omit<PeerData, 'id'>) {
    if (this.sendAction) {
      try {
        // Send raw data directly to all peers
        this.sendAction(data);
      } catch (e) {
        // Suppress send errors to prevent game loop lag
      }
    }
  }

  public subscribeToPeers(callback: (peers: PeerData[]) => void) {
    this.onPeersUpdate = callback;
  }

  private notifyPeersUpdate() {
    if (this.onPeersUpdate) {
      this.onPeersUpdate(Array.from(this.peers.values()));
    }
  }

  public getNetworkStatus() {
    return this.room ? 'CONNECTED' : 'DISCONNECTED';
  }
}

export const multisynq = MultisynqService.getInstance();