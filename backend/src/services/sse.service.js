class SSEService {
  constructor() {
    this.clients = new Map();
  }

  addClient(userId, res) {
    if (!this.clients.has(userId)) this.clients.set(userId, new Set());
    this.clients.get(userId).add(res);
    console.log(`📡 [SSE] + user ${userId}. Total: ${this.getTotalConnections()}`);
  }

  removeClient(userId, res) {
    const set = this.clients.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) this.clients.delete(userId);
    }
  }

  sendToUser(userId, eventType, data) {
    const set = this.clients.get(userId);
    if (!set || set.size === 0) return 0;

    const payload = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
    let sent = 0;
    set.forEach((res) => {
      try {
        res.write(`event: ${eventType}\n`);
        res.write(`data: ${payload}\n\n`);
        sent++;
      } catch (err) {
        set.delete(res);
      }
    });
    return sent;
  }

  sendToUsers(userIds, eventType, data) {
    let total = 0;
    userIds.forEach((id) => { total += this.sendToUser(id, eventType, data); });
    return total;
  }

  broadcast(eventType, data) {
    let total = 0;
    this.clients.forEach((set, userId) => {
      total += this.sendToUser(userId, eventType, data);
    });
    return total;
  }

  getTotalConnections() {
    let count = 0;
    this.clients.forEach((set) => { count += set.size; });
    return count;
  }

  getOnlineUserCount() { return this.clients.size; }
}

export const sseService = new SSEService();