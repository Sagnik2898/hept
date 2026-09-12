import localtunnel from 'localtunnel';
import https from 'https';

const PORT = parseInt(process.env.PORT, 10) || 5050;

function fetchPassword() {
  return new Promise((resolve) => {
    const req = https.get('https://api.ipify.org', { timeout: 2500 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.trim()));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function startTunnel() {
  console.log('\n=============================================================');
  console.log('       HEPATOGUARD - PUBLIC TUNNEL CONNECTION SERVICE       ');
  console.log('=============================================================');
  console.log(`Connecting local server (http://localhost:${PORT}) to public tunnel...\n`);

  try {
    const tunnel = await localtunnel({ port: PORT });

    console.log(`🚀 PUBLIC URL: ${tunnel.url}`);
    console.log(`🌐 Web Dashboard:        ${tunnel.url}`);
    console.log(`📡 REST API Base:        ${tunnel.url}/api`);
    console.log(`🩺 Health Endpoint:      ${tunnel.url}/api/health`);
    console.log(`🤖 ML Predict Endpoint:  ${tunnel.url}/api/ml/predict`);
    console.log(`📄 PDF Report Download:  ${tunnel.url}/api/reports/download-pdf`);
    console.log('-------------------------------------------------------------');

    fetchPassword().then(ip => {
      if (ip) {
        console.log(`🔑 Friendly Reminder Password (if prompted in browser): ${ip}`);
        console.log('   (First-time browser visitors can enter this IP to view)');
      }
    });

    console.log('Tunnel is active and listening. Keep this process running.\n');

    tunnel.on('close', () => {
      console.log('Tunnel connection lost. Reconnecting in 3 seconds...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
    });

    // Keep-alive heartbeat to prevent Node.js event loop from exiting
    setInterval(() => {}, 30000);

  } catch (err) {
    console.error('Failed to establish tunnel:', err.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
