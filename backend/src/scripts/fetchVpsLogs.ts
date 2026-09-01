import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('Querying MongoDB session logs on VPS...');
  
  const cmd = `cd /var/www/ai-isp-os/backend && node -e '
const mongoose = require("mongoose");
async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/ai_isp_os_prod");
  const logs = await mongoose.connection.db.collection("cwmpsessionlogs").find({
    timestamp: { $gte: new Date("2026-09-01T18:20:00Z") }
  }).sort({ timestamp: 1 }).toArray();
  console.log("=== CWMP SESSION LOGS AT 23:51 ===");
  logs.forEach(l => {
    console.log(\`[\${l.timestamp ? new Date(l.timestamp).toISOString() : "NO_TIME"}] \${l.direction} | RPC: \${l.rpcMethod} | CWMP ID: \${l.cwmpId}\`);
    if (l.rawXml) console.log(l.rawXml.substring(0, 600) + "\\n");
  });
  await mongoose.disconnect();
}
run().catch(console.error);
'`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', () => {
      console.log(out);
      conn.end();
    }).on('data', (d: Buffer) => out += d.toString()).stderr.on('data', (d: Buffer) => out += d.toString());
  });
}).connect({ host: '31.42.125.25', port: 22, username: 'root', password: 'Ciniplay@123' });
