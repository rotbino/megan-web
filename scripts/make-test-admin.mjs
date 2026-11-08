#!/usr/bin/env node
/** ادمین تست برای تست E2E پشتیبانی — فقط محیط توسعه */
import { MongoClient } from '/home/z/my-project/repos/megan-back/node_modules/mongodb/lib/index.js';
import { effectiveDbUrl } from '/home/z/my-project/repos/megan-back/scripts/lib/profile.mjs';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const salt = randomBytes(16).toString('base64url');
const key = (await scryptAsync('TestAdmin@123'.normalize('NFKC'), salt, 64));
const hash = `scrypt:${salt}:${key.toString('base64')}`;

const url = effectiveDbUrl();
const client = await MongoClient.connect(url);
const db = client.db();
const res = await db.collection('AdminUser').updateOne(
  { username: 'test-support-admin' },
  { $set: { username: 'test-support-admin', password_hash: hash, name: 'پشتیبان تست', role: 'ADMIN', is_active: true, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
  { upsert: true },
);
console.log('test admin ready:', JSON.stringify(res));
await client.close();
