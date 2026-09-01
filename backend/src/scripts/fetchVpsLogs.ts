import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('Querying MongoDB session logs on VPS...');
  
  const cmd = `pm2 logs ai-isp-os-backend --lines 60 --nostream`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', () => {
      console.log(out);
      conn.end();
    }).on('data', (d: Buffer) => out += d.toString()).stderr.on('data', (d: Buffer) => out += d.toString());
  });
}).connect({ host: '31.42.125.25', port: 22, username: 'root', password: 'Ciniplay@123' });
