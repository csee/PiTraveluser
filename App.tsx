import React, { useState, useEffect } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import { getUserData } from './services/data';
import { User } from './types';

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data
    const data = getUserData();
    setUsers(data);
    setLoading(false);
  }, []);

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden relative font-sans">
      {/* Background/Canvas Layer */}
      <div className="absolute inset-0 z-0">
        {!loading && <ParticleCanvas users={users} />}
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center p-6">
        <header className="mt-8 pointer-events-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#12C4FF] drop-shadow-sm tracking-wide">
            圆周旅迹首日1650用户
          </h1>
        </header>
        
        {/* Footer removed */}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default App;