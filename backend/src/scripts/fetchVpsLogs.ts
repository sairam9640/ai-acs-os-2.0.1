import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('Querying MongoDB session logs on VPS...');
  
  const cmd = `cd /var/www/ai-isp-os/backend && node -e '
const mongoose = require("mongoose");
async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/ai_isp_os_prod");
  const dev = await mongoose.connection.db.collection("devices").findOne({ serialNumber: "BC62D21470F0" });
  console.log("=== LANDEVICE KEYS IN RAWPARAMETERS ===");
  const keys = Object.keys(dev.rawParameters || {});
  const lanKeys = keys.filter(k => k.startsWith("InternetGatewayDevice.LANDevice.1."));
  console.log("Total LANDevice.1 keys:", lanKeys.length);
  lanKeys.forEach(k => console.log(\` - \${k} = \${JSON.stringify(dev.rawParameters[k])}\`));
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
