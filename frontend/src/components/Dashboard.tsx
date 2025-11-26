import Sidebar from './Sidebar';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onNavigate={onNavigate} currentPath="dashboard" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <h1 className="mb-8 text-gray-900">대시보드</h1>
          
          <div className="bg-white shadow-md p-12 text-center" style={{ borderRadius: '0px' }}>
            <p className="text-gray-400">대시보드 내용이 비어있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
