// WebSocket Service Stub
// This is a placeholder to prevent import errors

class WebSocketService {
  connect() {
    console.log('WebSocket service (stub) - connect called');
  }

  disconnect() {
    console.log('WebSocket service (stub) - disconnect called');
  }

  on(event: string, handler: Function) {
    console.log('WebSocket service (stub) - on called:', event);
  }

  off(event: string, handler: Function) {
    console.log('WebSocket service (stub) - off called:', event);
  }

  emit(event: string, data: any) {
    console.log('WebSocket service (stub) - emit called:', event, data);
  }

  joinTournament(tournamentId: string) {
    console.log('WebSocket service (stub) - joinTournament called:', tournamentId);
  }

  leaveTournament(tournamentId: string) {
    console.log('WebSocket service (stub) - leaveTournament called:', tournamentId);
  }
}

export const websocketService = new WebSocketService();
export default WebSocketService;

