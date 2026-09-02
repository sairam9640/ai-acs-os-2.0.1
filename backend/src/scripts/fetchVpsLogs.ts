import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('Querying MongoDB session logs on VPS...');
  
  const cmd = `cd /var/www/ai-isp-os/backend && node -e '
const mongoose = require("mongoose");
async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/ai_isp_os_prod");
  const dev = await mongoose.connection.db.collection("devices").findOne({ serialNumber: "BC62D21470F0" });
  
  console.log("=== ALL DELETE_WAN_CONFIG COMMANDS ===");
  const delCmds = await mongoose.connection.db.collection("devicecommands")
    .find({ action: { $in: ["DELETE_WAN_CONFIG", "DeleteObject"] } })
    .sort({ queuedAt: -1, createdAt: -1 })
    .limit(5)
    .toArray();
  delCmds.forEach(c => {
    console.log("ID: " + c._id + " | Action: " + c.action + " | Status: " + c.status + " | Serial: " + c.serialNumber);
    console.log("  Error: " + (c.errorMessage || c.faultString || "none"));
    console.log("  FaultCode: " + c.faultCode);
    console.log("  Params: " + JSON.stringify(c.parameters));
  });

  console.log("=== CWMP FAULT & DELETE LOGS ===");
  const logs = await mongoose.connection.db.collection("cwmpsessionlogs")
    .find({ $or: [{ rpcMethod: "DeleteObject" }, { rpcMethod: "Fault" }, { rawXml: /Fault/i }, { rawXml: /DeleteObject/i }] })
    .sort({ timestamp: -1 })
    .limit(10)
    .toArray();
  logs.forEach(l => {
    console.log("--- Log [" + l.direction + "] " + l.rpcMethod + " (" + l.timestamp + ") ---");
    if (l.rawXml) console.log(l.rawXml);
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
