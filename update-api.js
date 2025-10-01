// Node.js server for update checking
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Update information
const updateInfo = {
  version: '1.1.0',
  downloadUrl: 'https://your-server.com/downloads/hfl-app-v1.1.0.apk',
  forceUpdate: false,
  releaseNotes: '• Yangi o\'yinlar qo\'shildi\n• Bug fixes\n• Performance improvements'
};

app.get('/api/check-update', (req, res) => {
  const clientVersion = req.query.version || '1.0.0';
  
  // Check if update is needed
  const needsUpdate = compareVersions(updateInfo.version, clientVersion) > 0;
  
  if (needsUpdate) {
    res.json(updateInfo);
  } else {
    res.json({ needsUpdate: false });
  }
});

function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

app.listen(PORT, () => {
  console.log(`Update server running on port ${PORT}`);
});

