/**
 * Handles Google Drive API Authentications
 */

import { google } from 'googleapis';
import { join } from "path";

const KEYFILEPATH = join(process.cwd(), 'dj-angel-bot.json');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

export const drive = google.drive({ version: 'v3', auth });