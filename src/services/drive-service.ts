import { google } from 'googleapis';
import path from 'path';

// Path to your service account JSON file
const KEYFILEPATH = path.join(process.cwd(), 'dj-angel-bot.json');

// Define the scopes needed (readonly for music streaming)
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

export const drive = google.drive({ version: 'v3', auth });