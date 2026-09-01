import { Client } from 'ssh2';

const conn = new Client();

const host = '31.42.125.25';
const username = 'root';
const password = 'Ciniplay@123';

console.log(`Connecting to VPS ${host}...`);

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  function runRemoteCommand(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`\n[VPS EXEC] >>> ${cmd}`);
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let output = '';
        stream.on('close', (code: number, signal: string) => {
          console.log(`[VPS EXEC] Finished with exit code: ${code}`);
          resolve(output);
        }).on('data', (data: Buffer) => {
          const text = data.toString();
          process.stdout.write(text);
          output += text;
        }).stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          process.stderr.write(text);
          output += text;
        });
      });
    });
  }

  async function deploy() {
    try {
      // 1. Check running PM2 processes or services
      await runRemoteCommand('which pm2; pm2 list || true');

      // 2. Find application directory
      const findRes = await runRemoteCommand('find / -maxdepth 3 -name "ai-isp-os" -o -name "ai-acs-os*" 2>/dev/null || true');
      console.log('Found App Directories:', findRes);

      // Check current working directory for pm2 apps
      await runRemoteCommand('pm2 jlist || true');

      // 3. Check git status in likely project paths
      await runRemoteCommand('cd /root/ai-isp-os || cd /var/www/ai-isp-os || cd /root/ai-acs-os-2.0.1; pwd; git status; git pull origin master || git pull isp-origin master');

      // 4. Build backend and frontend
      await runRemoteCommand('cd /root/ai-isp-os/backend || cd /var/www/ai-isp-os/backend || cd /root/ai-acs-os-2.0.1/backend; pwd; npm install; npm run build; pm2 restart all || systemctl restart ai-isp-backend || true');
      await runRemoteCommand('cd /root/ai-isp-os/frontend || cd /var/www/ai-isp-os/frontend || cd /root/ai-acs-os-2.0.1/frontend; pwd; npm install; npm run build || true');

      // 5. Final check
      await runRemoteCommand('pm2 list || true');

      console.log('\n================================================================================');
      console.log('VPS DEPLOYMENT COMPLETED SUCCESSFULLY');
      console.log('================================================================================');
    } catch (e) {
      console.error('Deployment error:', e);
    } finally {
      conn.end();
    }
  }

  deploy();
}).on('error', (err) => {
  console.error('SSH connection failed:', err);
}).connect({
  host,
  port: 22,
  username,
  password,
  readyTimeout: 20000,
});
