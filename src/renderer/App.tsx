import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import FormatConverter from './pages/FormatConverter';
import FrameCapture from './pages/FrameCapture';
import MetadataEditor from './pages/MetadataEditor';
import SmartEdit from './pages/SmartEdit';
import ManualEdit from './pages/ManualEdit';
import Settings from './pages/Settings';

export type PageType = 'converter' | 'frame-capture' | 'metadata-editor' | 'smart-edit' | 'manual-edit' | 'settings';

function App() {
    const [currentPage, setCurrentPage] = useState<PageType>('converter');

    const renderPage = () => {
        switch (currentPage) {
            case 'converter':
                return <FormatConverter />;
            case 'frame-capture':
                return <FrameCapture />;
            case 'metadata-editor':
                return <MetadataEditor />;
            case 'smart-edit':
                return <SmartEdit />;
            case 'manual-edit':
                return <ManualEdit />;
            case 'settings':
                return <Settings />;
            default:
                return (
                    <div className="coming-soon">
                        <h2>🚧 Coming Soon</h2>
                        <p>This feature is under development</p>
                    </div>
                );
        }
    };

    return (
        <div className="app">
            <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
            <main className="main-content">
                {renderPage()}
            </main>
        </div>
    );
}

export default App;
