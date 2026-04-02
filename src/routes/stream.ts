/**
 * Proxy Stream Router To connect Lavalink and Google Drive API
 */
import { Router } from 'express';
import { drive } from '../services/google-drive.js';

export const streamRouter = Router();

streamRouter.get('/:songId', async (req, res) => {
    const { songId } = req.params;
    const requestId = Math.random().toString(36).substring(7); // Track this specific request

    console.log(`[DEBUG][${requestId}] --- New Stream Request ---`);
    console.log(`[DEBUG][${requestId}] Song ID: ${songId}`);
    console.log(`[DEBUG][${requestId}] Headers from Lavalink:`, JSON.stringify(req.headers, null, 2));

    if (req.query.token !== process.env.STREAM_SECRET) {
        console.error(`[DEBUG][${requestId}] ❌ Unauthorized: Token mismatch.`);
        return res.status(403).send('Unauthorized');
    }

    try {
        console.log(`[DEBUG][${requestId}] Fetching metadata from Google Drive...`);
        const metadata = await drive.files.get({
            fileId: songId,
            fields: 'size, mimeType, name'
        });

        const fileSize = parseInt(metadata.data.size || "0");
        const mimeType = metadata.data.mimeType || 'audio/mpeg';
        const fileName = metadata.data.name || "Unknown";
        const range = req.headers.range;

        console.log(`[DEBUG][${requestId}] File: "${fileName}" | Size: ${fileSize} bytes | Type: ${mimeType}`);

        if (range) {
            console.log(`[DEBUG][${requestId}] Handling Range Request: ${range}`);
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            console.log(`[DEBUG][${requestId}] Requesting Chunk: ${start}-${end} (${chunksize} bytes)`);

            const driveResponse = await drive.files.get(
                { fileId: songId, alt: 'media' },
                { 
                    responseType: 'stream',
                    headers: { Range: `bytes=${start}-${end}` } 
                }
            );

            console.log(`[DEBUG][${requestId}] Google Drive Response Status: ${driveResponse.status}`);

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': mimeType,
            });

            driveResponse.data.pipe(res);
        } else {
            console.log(`[DEBUG][${requestId}] Handling Full Stream Request (No Range)`);
            const driveResponse = await drive.files.get(
                { fileId: songId, alt: 'media' },
                { responseType: 'stream' }
            );

            console.log(`[DEBUG][${requestId}] Google Drive Response Status: ${driveResponse.status}`);

            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes'
            });

            driveResponse.data.pipe(res);
        }

        // Monitoring the stream end
        res.on('finish', () => {
            console.log(`[DEBUG][${requestId}] ✅ Stream sent successfully to Lavalink.`);
        });

    } catch (error: any) {
        console.error(`[DEBUG][${requestId}] ❌ Stream Error:`, error.message);
        if (error.response) {
            console.error(`[DEBUG][${requestId}] Google API Error Data:`, error.response.data);
        }
        if (!res.headersSent) res.status(404).end();
    }
});