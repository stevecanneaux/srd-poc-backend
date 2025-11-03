import { useState } from 'react';
import VehiclesManager from './components/VehiclesManager';
import JobsManager from './components/JobsManager';
import PolicySettings from './components/PolicySettings';
import OptimizerRunner from './components/OptimizerRunner';
import ResultsTable from './components/ResultsTable';
import MapDisplay from './components/MapDisplay';
import AdminPromptModal from './components/AdminPromptModal';
import FooterControls from './components/FooterControls';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'jobs' | 'policies' | 'results' | 'map'>('vehicles');
  const [optimizerData, setOptimizerData] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [missingVehicles, setMissingVehicles] = useState<any[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">SRD Dispatch Control Panel</h1>
        <div className="flex space-x-4">
          <button onClick={() => setActiveTab('vehicles')} className={`px-4 py-2 rounded ${activeTab === 'vehicles' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Vehicles</button>
          <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 rounded ${activeTab === 'jobs' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Jobs</button>
          <button onClick={() => setActiveTab('policies')} className={`px-4 py-2 rounded ${activeTab === 'policies' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Policies</button>
          <button onClick={() => setActiveTab('results')} className={`px-4 py-2 rounded ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Results</button>
          <button onClick={() => setActiveTab('map')} className={`px-4 py-2 rounded ${activeTab === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Map</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'vehicles' && <VehiclesManager />}
        {activeTab === 'jobs' && <JobsManager />}
        {activeTab === 'policies' && <PolicySettings />}
        {activeTab === 'results' && (
          <OptimizerRunner
            onRunComplete={(data) => setOptimizerData(data)}
            onMissingVehicles={(vehicles) => {
              setMissingVehicles(vehicles);
              setShowPrompt(true);
            }}
          />
        )}
        {activeTab === 'map' && <MapDisplay optimizerData={optimizerData} />}
      </main>

      {/* Footer Controls */}
      <FooterControls />

      {/* Admin Prompt Modal */}
      {showPrompt && (
        <AdminPromptModal
          missingVehicles={missingVehicles}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  );
}
