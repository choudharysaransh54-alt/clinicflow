const io = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected');
  
  // Join Patient 1
  socket.emit('patient:join', { name: 'P1', reason: 'R1' }, (res1) => {
    console.log('Joined P1:', res1.success);
    
    // Join Patient 2
    socket.emit('patient:join', { name: 'P2', reason: 'R2' }, (res2) => {
      console.log('Joined P2:', res2.success);
      
      // Call Next (P1)
      socket.emit('queue:callNext', null, (callRes1) => {
        console.log('Called P1:', callRes1.success);
        
        // Complete P1
        socket.emit('patient:complete', { ticketId: callRes1.patient.ticketId }, (compRes) => {
          console.log('Completed P1:', compRes.success);
          
          // Call Next (P2)
          socket.emit('queue:callNext', null, (callRes2) => {
            console.log('Called P2:', callRes2.success, callRes2.message);
            process.exit(0);
          });
        });
      });
    });
  });
});
