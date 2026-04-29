// The "Gia" Pulse Core
import axios from 'axios';
import { createClient } from 'redis';

const ltaClient = axios.create({
  baseURL: 'https://datamall2.mytransport.sg/ltaodataservice',
  headers: { 'AccountKey': process.env.LTA_ACCOUNT_KEY }
});

const redis = createClient({ url: process.env.REDIS_URL });

async function sniffTransit() {
  const { data } = await ltaClient.get('/TrainServiceAlerts');
  const isHealthy = data.value.length === 0;
  
  await redis.set('lta:train_status', JSON.stringify({
    status: isHealthy ? 'Healthy' : 'Disrupted',
    lastUpdated: new Date().toISOString()
  }));
}
