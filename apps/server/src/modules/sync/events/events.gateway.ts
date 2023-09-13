import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { encodeStateAsUpdate, encodeStateVector } from 'yjs';

import { Metrics } from '../../../metrics/metrics';
import { DocID } from '../../../utils/doc';
import { DocManager } from '../../doc';

@WebSocketGateway({
  cors: process.env.NODE_ENV !== 'production',
  transports: ['websocket'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private connectionCount = 0;

  constructor(
    private readonly docManager: DocManager,
    private readonly metric: Metrics
  ) {}

  @WebSocketServer()
  server!: Server;

  handleConnection() {
    this.connectionCount++;
    this.metric.socketIOConnectionGauge(this.connectionCount, {});
  }

  handleDisconnect() {
    this.connectionCount--;
    this.metric.socketIOConnectionGauge(this.connectionCount, {});
  }

  @SubscribeMessage('client-handshake')
  async handleClientHandShake(
    @MessageBody() workspaceId: string,
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'client-handshake' });
    const endTimer = this.metric.socketIOEventTimer({
      event: 'client-handshake',
    });
    await client.join(workspaceId);
    endTimer();
  }

  @SubscribeMessage('client-leave')
  async handleClientLeave(
    @MessageBody() workspaceId: string,
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'client-leave' });
    const endTimer = this.metric.socketIOEventTimer({
      event: 'client-leave',
    });
    await client.leave(workspaceId);
    endTimer();
  }

  @SubscribeMessage('client-update')
  async handleClientUpdate(
    @MessageBody()
    {
      workspaceId,
      guid,
      update,
    }: {
      workspaceId: string;
      guid: string;
      update: string;
    },
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'client-update' });
    const endTimer = this.metric.socketIOEventTimer({ event: 'client-update' });
    const docId = new DocID(guid, workspaceId);
    client
      .to(docId.workspace)
      .emit('server-update', { workspaceId, guid, update });

    const buf = Buffer.from(update, 'base64');

    await this.docManager.push(docId.workspace, docId.id, buf);
    endTimer();
  }

  @SubscribeMessage('doc-load')
  async loadDoc(
    @MessageBody()
    {
      workspaceId,
      guid,
      stateVector,
    }: {
      workspaceId: string;
      guid: string;
      stateVector?: string;
    }
  ): Promise<{ missing: string; state?: string } | false> {
    this.metric.socketIOEventCounter(1, { event: 'doc-load' });
    const endTimer = this.metric.socketIOEventTimer({ event: 'doc-load' });

    const docId = new DocID(guid, workspaceId);
    const doc = await this.docManager.getLatest(docId.workspace, docId.id);

    if (!doc) {
      endTimer();
      return false;
    }

    const missing = Buffer.from(
      encodeStateAsUpdate(
        doc,
        stateVector ? Buffer.from(stateVector, 'base64') : undefined
      )
    ).toString('base64');
    const state = Buffer.from(encodeStateVector(doc)).toString('base64');

    endTimer();
    return {
      missing,
      state,
    };
  }

  @SubscribeMessage('awareness-init')
  async handleInitAwareness(
    @MessageBody() workspaceId: string,
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'awareness-init' });
    const endTimer = this.metric.socketIOEventTimer({
      event: 'init-awareness',
    });
    client.to(workspaceId).emit('new-client-awareness-init');
    endTimer();
  }

  @SubscribeMessage('awareness-update')
  async handleHelpGatheringAwareness(
    @MessageBody() message: { workspaceId: string; awarenessUpdate: string },
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'awareness-update' });
    const endTimer = this.metric.socketIOEventTimer({
      event: 'awareness-update',
    });
    client.to(message.workspaceId).emit('server-awareness-broadcast', {
      ...message,
    });

    endTimer();
    return 'ack';
  }
}
