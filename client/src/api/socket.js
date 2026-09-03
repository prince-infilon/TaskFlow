import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') 
  : 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We'll connect manually when we have a token
  withCredentials: true
});

export const connectSocket = (token) => {
  socket.auth = { token };
  socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
