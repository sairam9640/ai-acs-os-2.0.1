import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('Querying MongoDB session logs on VPS...');
  
  const cmd = `cd /var/www/ai-isp-os/backend && node -e '
const mongoose = require("mongoose");
async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/ai_isp_os_prod");
  const dev = await mongoose.connection.db.collection("devices").findOne({ serialNumber: "BC62D21470F0" });
  
  const res = await mongoose.connection.db.collection("devicecommands").updateMany(
    { deviceId: dev._id, action: "GetParameterValues", status: { $in: ["queued", "pending", "sending"] } },
    { $set: { status: "canceled", errorMessage: "Cancelled legacy GPV query containing non-existent slot paths.", completedAt: new Date() } }
  );
  console.log("Cancelled legacy GPV commands:", res.modifiedCount);

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
