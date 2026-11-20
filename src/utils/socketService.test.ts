import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SimulatedSocket,
  createApprovalSocketPayload,
} from './socketService.ts';

test('SimulatedSocket registers listeners and receives emitted data', () => {
  const socket = new SimulatedSocket();
  let receivedData: any = null;

  const unsubscribe = socket.on('approval:new', (data) => {
    receivedData = data;
  });

  const payload = createApprovalSocketPayload(
    'approval:new',
    'leave',
    'req_123',
    'Maya Putri',
    'Cuti Sakit 2 Hari',
    'Marketing',
    'Manajer',
    '2 Hari'
  );

  socket.emit('approval:new', payload);

  assert.notEqual(receivedData, null);
  assert.equal(receivedData.applicantName, 'Maya Putri');
  assert.equal(receivedData.itemType, 'leave');
  assert.equal(receivedData.currentRoleTarget, 'Manajer');

  // Test cleanup
  unsubscribe();
  receivedData = null;
  socket.emit('approval:new', { test: true });
  assert.equal(receivedData, null);
});

test('SimulatedSocket manages room subscriptions', () => {
  const socket = new SimulatedSocket();
  assert.equal(socket.isSubscribedTo('room:approvals'), true);

  socket.join('room:vip_executives');
  assert.equal(socket.isSubscribedTo('room:vip_executives'), true);

  socket.leave('room:approvals');
  assert.equal(socket.isSubscribedTo('room:approvals'), false);
});

test('SimulatedSocket handles connect and disconnect states', () => {
  const socket = new SimulatedSocket();
  assert.equal(socket.connected, true);

  let disconnected = false;
  socket.on('disconnect', () => {
    disconnected = true;
  });

  socket.disconnect();
  assert.equal(socket.connected, false);
  assert.equal(socket.status, 'disconnected');
  assert.equal(disconnected, true);

  // Emitting while disconnected should be suppressed
  let callCount = 0;
  socket.on('test:event', () => {
    callCount++;
  });
  socket.emit('test:event');
  assert.equal(callCount, 0);

  // Reconnect
  socket.connect();
  assert.equal(socket.connected, true);
  assert.equal(socket.status, 'connected');
});
