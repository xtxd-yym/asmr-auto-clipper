import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Alert,
} from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<DocumentPickerResponse[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  const handlePickFiles = async () => {
    try {
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.video],
      });
      setSelectedFiles(results);
      addLog(`Selected ${results.length} files.`);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        Alert.alert('Error', 'Unknown Error: ' + JSON.stringify(err));
      }
    }
  };

  const handleStartConvert = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    addLog('🚀 Batch conversion started...');

    for (const file of selectedFiles) {
      await processFile(file);
    }

    setIsProcessing(false);
    addLog('🎉 All tasks finished!');
    Alert.alert('Done', 'All files processed.');
  };

  const processFile = async (file: DocumentPickerResponse) => {
    addLog(`➡️ Processing: ${file.name}`);

    // Android Content URIs require special handling usually, 
    // but FFmpegKit often handles them directly. 
    // If input is file:// it works out of box.
    const inputUri = file.uri;

    // Output to DocumentDirectoryPath
    const safeName = file.name?.replace(/\.[^/.]+$/, "") || "output";
    const outputFileName = `${safeName}.mp3`;
    const outputPath = `${RNFS.DocumentDirectoryPath}/${outputFileName}`;

    addLog(`   Target: ${outputPath}`);

    // Check if exists
    if (await RNFS.exists(outputPath)) {
      await RNFS.unlink(outputPath);
    }

    // Command: -vn (no video) -acodec libmp3lame -q:a 0 (best VBR) -ac 2 (stereo)
    const command = `-i "${inputUri}" -vn -acodec libmp3lame -q:a 0 -ac 2 "${outputPath}"`;

    try {
      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        addLog(`   ✅ Success! Saved to Documents.`);
      } else {
        const failLogs = await session.getLogs();
        const lastError = failLogs[failLogs.length - 1]?.getMessage();
        addLog(`   ❌ Failed: ${lastError}`);
      }
    } catch (e) {
      addLog(`   ❌ Exception: ${e}`);
    }
  };

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#222' : '#F3F3F3',
    flex: 1,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <Text style={styles.title}>ASMR Clipper</Text>
        <Text style={styles.subtitle}>Mobile Edition</Text>
      </View>

      <View style={styles.container}>
        {/* Controls */}
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.button, styles.pickButton]}
            onPress={handlePickFiles}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>📂 Select Videos ({selectedFiles.length})</Text>
          </TouchableOpacity>

          <View style={styles.fileList}>
            <Text style={styles.label}>Selected Files:</Text>
            {selectedFiles.length === 0 ? (
              <Text style={styles.placeholderText}>None</Text>
            ) : (
              <Text numberOfLines={3} style={styles.fileText}>
                {selectedFiles.map(f => f.name).join(', ')}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              styles.actionButton,
              (selectedFiles.length === 0 || isProcessing) && styles.disabledButton
            ]}
            onPress={handleStartConvert}
            disabled={selectedFiles.length === 0 || isProcessing}
          >
            <Text style={styles.buttonText}>
              {isProcessing ? 'Processing...' : '🚀 Start Conversion'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logs */}
        <View style={[styles.card, styles.logCard]}>
          <Text style={styles.label}>Logs:</Text>
          <ScrollView style={styles.logScroll}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: '#6200EE',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    color: '#E0E0E0',
    marginTop: 4,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  logCard: {
    flex: 1,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickButton: {
    backgroundColor: '#03DAC6',
  },
  actionButton: {
    backgroundColor: '#6200EE',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  fileList: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
    minHeight: 40,
    justifyContent: 'center',
  },
  fileText: {
    color: '#555',
  },
  placeholderText: {
    color: '#999',
    fontStyle: 'italic',
  },
  logScroll: {
    marginTop: 8,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
    color: '#333',
  },
});

export default App;
