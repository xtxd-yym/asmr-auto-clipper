import * as fs from 'fs';
import * as NodeID3 from 'node-id3';

export interface AudioMetadata {
    title?: string;
    artist?: string;
    album?: string;
    albumArtist?: string;
    year?: string;
    track?: string;
    genre?: string;
    comment?: string;
    coverArt?: string; // Base64 data URL
}

/**
 * Read metadata from an audio file using node-id3
 */
export async function readMetadata(filePath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
        try {
            // Read ID3 tags from the file
            const tags = NodeID3.read(filePath);

            if (!tags) {
                return resolve({});
            }

            console.log('[Metadata] Read tags:', {
                title: tags.title,
                artist: tags.artist,
                album: tags.album,
                hasImage: !!tags.image
            });

            // Convert image to base64 data URL if exists
            let coverArt: string | undefined;
            if (tags.image) {
                const imageData = typeof tags.image === 'string'
                    ? Buffer.from(tags.image, 'binary')
                    : (tags.image as any).imageBuffer || tags.image;

                const mimeType = (tags.image as any).mime || 'image/jpeg';
                coverArt = `data:${mimeType};base64,${imageData.toString('base64')}`;
            }

            resolve({
                title: tags.title,
                artist: tags.artist,
                album: tags.album,
                albumArtist: tags.performerInfo,
                year: tags.year,
                track: tags.trackNumber,
                genre: tags.genre,
                comment: typeof tags.comment === 'string'
                    ? tags.comment
                    : tags.comment?.text,
                coverArt
            });
        } catch (err) {
            console.error('[Metadata] Error reading metadata:', err);
            reject(err);
        }
    });
}

/**
 * Write metadata to an audio file using node-id3
 * Uses a safe temporary file strategy to avoid file locking issues
 */
export async function writeMetadata(filePath: string, metadata: AudioMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            console.log('[Metadata] Writing metadata to:', filePath);
            console.log('[Metadata] Metadata to write:', {
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                hasCover: !!metadata.coverArt
            });

            // Create temporary file path
            const tempPath = filePath + '.tmp';

            // Step 1: Copy original file to temp location
            try {
                console.log('[Metadata] Copying to temp file:', tempPath);
                fs.copyFileSync(filePath, tempPath);
            } catch (copyErr) {
                console.error('[Metadata] Error copying file:', copyErr);
                reject(new Error(`Failed to create temporary file: ${copyErr}`));
                return;
            }

            // Prepare ID3 tags object
            const tags: any = {};

            if (metadata.title) tags.title = metadata.title;
            if (metadata.artist) tags.artist = metadata.artist;
            if (metadata.album) tags.album = metadata.album;
            if (metadata.albumArtist) tags.performerInfo = metadata.albumArtist;
            if (metadata.year) tags.year = metadata.year;
            if (metadata.track) tags.trackNumber = metadata.track;
            if (metadata.genre) tags.genre = metadata.genre;
            if (metadata.comment) {
                tags.comment = {
                    language: 'eng',
                    text: metadata.comment
                };
            }

            // Add cover art if provided, or remove it if not
            if (metadata.coverArt) {
                try {
                    // Extract base64 data and mime type from data URL
                    const matches = metadata.coverArt.match(/^data:([^;]+);base64,(.+)$/);
                    if (matches) {
                        const mimeType = matches[1];
                        const base64Data = matches[2];
                        const imageBuffer = Buffer.from(base64Data, 'base64');

                        tags.image = {
                            mime: mimeType,
                            type: {
                                id: 3,
                                name: 'front cover'
                            },
                            description: 'Cover',
                            imageBuffer: imageBuffer
                        };
                        console.log('[Metadata] Added cover art, size:', imageBuffer.length);
                    }
                } catch (err) {
                    console.error('[Metadata] Error processing cover art:', err);
                    // Continue without cover art if there's an error
                }
            } else {
                // Explicitly remove cover art by setting to null
                tags.image = null;
                console.log('[Metadata] Removing cover art');
            }

            console.log('[Metadata] Tags to write:', Object.keys(tags));

            // Step 2: Write tags to temporary file
            try {
                const result = NodeID3.update(tags, tempPath);
                console.log('[Metadata] Update temp file result:', result);

                if (result instanceof Error) {
                    // Clean up temp file
                    if (fs.existsSync(tempPath)) {
                        fs.unlinkSync(tempPath);
                    }
                    console.error('[Metadata] Error writing metadata to temp file:', result);
                    reject(result);
                    return;
                }

                // Step 3: Replace original file with modified temp file
                try {
                    console.log('[Metadata] Replacing original file with temp file');

                    // Delete original file first
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }

                    // Rename temp file to original filename
                    fs.renameSync(tempPath, filePath);

                    console.log('[Metadata] Metadata written successfully');

                    // Verify the write by reading back
                    setTimeout(() => {
                        const verifyTags = NodeID3.read(filePath);
                        console.log('[Metadata] Verification - read back:', {
                            title: verifyTags?.title,
                            artist: verifyTags?.artist,
                            album: verifyTags?.album
                        });
                        resolve();
                    }, 100);
                } catch (replaceErr) {
                    console.error('[Metadata] Error replacing original file:', replaceErr);

                    // Try to clean up temp file
                    if (fs.existsSync(tempPath)) {
                        fs.unlinkSync(tempPath);
                    }

                    reject(new Error(`Failed to replace original file: ${replaceErr}`));
                }
            } catch (updateErr) {
                console.error('[Metadata] Exception during update:', updateErr);

                // Clean up temp file
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }

                reject(updateErr);
            }
        } catch (err) {
            console.error('[Metadata] Error writing metadata:', err);
            reject(err);
        }
    });
}
