require('dotenv').config();
if (process.env.MONGODB_TEST_URI) {
  process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
}

const request = require('supertest');
const mongoose = require('mongoose');
const { io: Client } = require('socket.io-client');
const app = require('./server'); // This now exports `server` (the HTTP server)
const User = require('./src/models/User');
const Board = require('./src/models/Board');

// We need the server to be listening for socket connections
let httpServer;
let port;

async function runSocketTests() {
  console.log('--- STARTING SOCKET VERIFICATION ---');

  httpServer = app.server.listen(0, () => {
    port = httpServer.address().port;
  });

  await new Promise(r => setTimeout(r, 1500));

  try {
    const testEmails = ['sock1@ex.com', 'sock2@ex.com', 'sock3@ex.com'];
    await User.deleteMany({ email: { $in: testEmails } });
    await Board.deleteMany({ name: 'Socket Board A' });
    await Board.deleteMany({ name: 'Socket Board B' });

    const registerUser = async (name, email) => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name, email, password: 'password123' });
      return { user: res.body.data.user, token: res.body.data.token };
    };

    const user1 = await registerUser('User1', 'sock1@ex.com');
    const user2 = await registerUser('User2', 'sock2@ex.com');
    const user3 = await registerUser('User3', 'sock3@ex.com'); // non-member

    const boardARes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'Socket Board A', description: 'Testing sockets' })
      .expect(201);
    const boardAId = boardARes.body.data.board._id;

    await request(app)
      .post(`/api/boards/${boardAId}/members`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ email: 'sock2@ex.com', role: 'member' })
      .expect(200);

    const boardBRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${user2.token}`)
      .send({ name: 'Socket Board B' })
      .expect(201);
    const boardBId = boardBRes.body.data.board._id;

    const createClient = (token) => {
      return new Promise((resolve, reject) => {
        const socket = Client(`http://localhost:${port}`, {
          auth: token ? { token } : undefined,
          autoConnect: true
        });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', (err) => resolve({ error: err.message, socket }));
      });
    };

    // 1. Unauthenticated connection rejected
    const unauthClient = await createClient(null);
    if (!unauthClient.error) throw new Error('Unauthenticated socket should be rejected');
    console.log('Test 1: Unauthenticated socket connection rejected - SUCCESS');

    // 2. Invalid/expired JWT rejected
    const invalidClient = await createClient('invalid.token.string');
    if (!invalidClient.error) throw new Error('Invalid JWT should be rejected');
    console.log('Test 2: Invalid/expired JWT rejected - SUCCESS');

    // 3. Authenticated member can connect
    const client1 = await createClient(user1.token);
    if (client1.error) throw new Error(`Valid JWT should connect, but got error: ${client1.error}`);
    console.log('Test 3: Authenticated member can connect - SUCCESS');

    // 4. Authorized member can join their board & 9. Presence appears
    let presencePromise = new Promise(res => {
      client1.on('presence_update', (users) => res(users));
    });
    client1.emit('join_board', boardAId);
    let users = await presencePromise;
    if (users.length !== 1 || users[0].id !== user1.user._id) {
      throw new Error('Presence not updated correctly on join');
    }
    console.log('Test 4 & 9: Authorized member joins, presence appears - SUCCESS');

    // 5. Non-member cannot join the board
    const client3 = await createClient(user3.token);
    let errorPromise = new Promise(res => {
      client3.on('error', (err) => res(err.message));
    });
    client3.emit('join_board', boardAId);
    let errMsg = await errorPromise;
    if (errMsg !== 'Unauthorized to join this board') throw new Error('Non-member join not rejected properly');
    console.log('Test 5: Non-member cannot join the board - SUCCESS');

    // 6. Board A events NOT received by Board B users
    const client2 = await createClient(user2.token);
    let bPresencePromise = new Promise(res => {
      client2.on('presence_update', (users) => res(users));
    });
    client2.emit('join_board', boardBId);
    await bPresencePromise; // Wait for join to finish

    let eventReceivedByB = false;
    client2.on('task_created', () => { eventReceivedByB = true; });

    let taskPromise = new Promise(res => {
      client1.on('task_created', (data) => res(data));
    });

    // 7. Successful task mutation emits correct event
    const colRes = await request(app)
      .get(`/api/boards/${boardAId}/columns`)
      .set('Authorization', `Bearer ${user1.token}`);
    const colId = colRes.body.data.columns[0]._id;

    await request(app)
      .post(`/api/boards/${boardAId}/tasks`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ column: colId, title: 'Socket Task' })
      .expect(201);
    
    const taskData = await taskPromise;
    if (!taskData || !taskData.task || taskData.task.title !== 'Socket Task') {
      throw new Error('task_created event missing or invalid');
    }
    console.log('Test 7: Successful task mutation emits the correct event - SUCCESS');

    await new Promise(r => setTimeout(r, 500)); // wait to ensure client2 didn't get it
    if (eventReceivedByB) throw new Error('Event leaked to another board');
    console.log('Test 6: Board A events are NOT received by board B users - SUCCESS');

    // 8. Failed task mutation does NOT emit a success event
    let failedEventEmitted = false;
    client1.on('task_created', () => { failedEventEmitted = true; });
    await request(app)
      .post(`/api/boards/${boardAId}/tasks`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ column: 'invalid_id', title: 'Fail Task' })
      .expect(400);
    
    await new Promise(r => setTimeout(r, 500));
    if (failedEventEmitted) throw new Error('Failed mutation incorrectly emitted event');
    console.log('Test 8: Failed task mutation does NOT emit a success event - SUCCESS');

    // 11. Multiple connections for same user
    const client1_2 = await createClient(user1.token);
    client1_2.emit('join_board', boardAId);
    // wait a moment
    await new Promise(r => setTimeout(r, 500));
    
    let disconnectPresencePromise = new Promise(res => {
      client2.on('presence_update', (users) => res(users)); // actually client2 is on board B
      client1.on('presence_update', (users) => res(users));
    });
    
    // Disconnect one connection for user1
    client1_2.disconnect();
    // we should NOT see a presence_update for user 1 leaving, because client1 is still connected.
    let timeoutPromise = new Promise(res => setTimeout(() => res('timeout'), 1000));
    let raceResult = await Promise.race([disconnectPresencePromise, timeoutPromise]);
    if (raceResult !== 'timeout') throw new Error('Presence incorrectly removed when user still has active connection');
    console.log('Test 11: Multiple connections for the same user are handled correctly - SUCCESS');

    // 10. Presence is removed after disconnect
    let finalPresencePromise = new Promise(res => {
      // client1 is the only one left on board A, but wait, who will receive the update?
      // let's have user 2 join board A so they can see user 1 leave
      client2.emit('join_board', boardAId);
      client2.on('presence_update', (u) => {
        if (!u.find(x => x.id === user1.user._id)) {
          res('left');
        }
      });
    });
    
    await new Promise(r => setTimeout(r, 500));
    client1.disconnect(); // user 1 fully leaves
    let leaveResult = await Promise.race([finalPresencePromise, new Promise(r => setTimeout(() => r('timeout'), 2000))]);
    if (leaveResult !== 'left') throw new Error('Presence not updated when user fully disconnects');
    console.log('Test 10: Presence is removed after disconnect - SUCCESS');
    
    // Cleanup
    client2.disconnect();
    client3.error && client3.socket && client3.socket.disconnect();
    
    console.log('--- ALL SOCKET TESTS PASSED ---');
  } catch (error) {
    console.error('TEST FAILED:', error.message || error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
    httpServer.close();
  }
}

runSocketTests();
