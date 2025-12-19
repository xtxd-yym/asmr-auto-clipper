// Global type definitions for Electron IPC
declare global {
    interface Window {
        electronAPI: {
            // File operations
            selectFile: () => Promise<string | null>;

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

            // Media info
            getMediaDuration: (filePath: string) => Promise<number>;
        };
    }
}

export { };
