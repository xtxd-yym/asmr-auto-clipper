// Global type definitions for Electron IPC
declare global {
    interface Window {
        electronAPI: {
            // File operations
            selectFile: () => Promise<string | null>;
            selectVideoFile: () => Promise<string | null>;

            // Format conversion
            convertFormat: (config: {
                inputPath: string;
                outputFormat: string;
                quality: number;
            }) => Promise<{
                success: boolean;
                data?: any;
                error?: string;
            }>;
            getConverterProgress: () => Promise<{
                stage: string;
                percentage: number;
                total: number;
            }>;

            // Media editing
            trimMedia: (config: {
                inputPath: string;
                outputPath: string;
                startTime: number;
                endTime: number;
                lossless?: boolean;
            }) => Promise<{
                success: boolean;
                data?: any;
                error?: string;
            }>;

            concatMedia: (config: {
                inputPaths: string[];
                outputPath: string;
                outputFormat: string;
            }) => Promise<{
                success: boolean;
                data?: any;
                error?: string;
            }>;

            // Frame Capture
            saveFrame: (frameData: ArrayBuffer, outputPath: string) => Promise<boolean>;
            selectSavePath: (suggestedName: string) => Promise<string | null>;

            // Metadata Editor
            selectAudioFile: () => Promise<string | null>;
            selectImageFile: () => Promise<string | null>;
            readMetadata: (filePath: string) => Promise<{
                title?: string;
                artist?: string;
                album?: string;
                albumArtist?: string;
                year?: string;
                track?: string;
                genre?: string;
                comment?: string;
                coverArt?: string;
            }>;
            writeMetadata: (filePath: string, metadata: any) => Promise<void>;
            readImageAsBase64: (imagePath: string) => Promise<string>;

            // Media info
            getMediaDuration: (filePath: string) => Promise<number>;
        };
    }
}

export { };
