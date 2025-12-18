import { PageType } from '../App';
import './Sidebar.css';

interface SidebarProps {
    currentPage: PageType;
    onPageChange: (page: PageType) => void;
}

const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
    const menuItems = [
        { id: 'converter' as PageType, icon: '📁', label: 'Format Converter' },
        { id: 'smart-edit' as PageType, icon: '✂️', label: 'Smart Edit' },
        { id: 'manual-edit' as PageType, icon: '🎵', label: 'Manual Edit' },
        { id: 'ai-tools' as PageType, icon: '🤖', label: 'AI Tools' },
        { id: 'settings' as PageType, icon: '⚙️', label: 'Settings' },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2>🎬 Media Toolkit</h2>
            </div>
            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                        onClick={() => onPageChange(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default Sidebar;
