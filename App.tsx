import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameState } from './types';
import { multisynq } from './services/multisynqService';
import { GameScene } from './components/GameScene';
import { MULTISYNQ_API_KEY, APP_NAME, APP_VERSION, CAR_COLORS } from './constants';

const App = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [playerName, setPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CAR_COLORS[0]);
  const [speed, setSpeed] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoin = async () => {
    if (!playerName.trim()) return;
    
    setGameState(GameState.CONNECTING);
    setLoadingMsg('ESTABLISHING UPLINK...');

    try {
      await multisynq.connect(playerName, selectedColor);
      setLoadingMsg('SYNCING WORLD STATE...');
      
      setTimeout(() => {
        setGameState(GameState.RACING);
      }, 1500);
    } catch (err) {
      setGameState(GameState.LOBBY);
      setErrorMsg('CONNECTION FAILED. TRY AGAIN.');
      console.error(err);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      
      {/* 3D Viewport */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${gameState === GameState.LOBBY ? 'opacity-40 blur-sm' : 'opacity-100'}`}>
        <Canvas shadows dpr={[1, 2]}>
          <GameScene 
            setSpeedDisplay={setSpeed} 
            gameStatus={gameState} 
            playerName={playerName}
            playerColor={selectedColor}
          />
        </Canvas>
      </div>

      {/* --- UI LAYER --- */}

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center pointer-events-none">
         <div className="flex flex-col">
            <h1 className="text-4xl text-white font-display italic font-black tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
              {APP_NAME}
            </h1>
            <span className="text-xs text-red-500 font-mono tracking-widest">MULTISYNQ PROTOCOL ENABLED</span>
         </div>
         <div className="flex items-center gap-4">
             <div className="bg-black/50 backdrop-blur-md px-4 py-2 border border-white/10 rounded-full">
               <span className="text-xs text-gray-400">NETWORK: </span>
               <span className={`text-xs font-bold tracking-wider ${gameState === GameState.RACING ? 'text-green-400' : 'text-yellow-500'}`}>
                  {gameState === GameState.RACING ? 'LIVE' : 'STANDBY'}
               </span>
             </div>
         </div>
      </div>

      {/* LOBBY SCREEN */}
      {gameState === GameState.LOBBY && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-t from-black via-transparent to-black/80">
          <div className="w-full max-w-md p-8 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)]">
            <h2 className="text-2xl text-white font-display mb-6 text-center tracking-widest">DRIVER LOGIN</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs text-gray-400 mb-2 tracking-widest">CALLSIGN</label>
                <input 
                  type="text" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                  placeholder="ENTER NAME"
                  className="w-full bg-black/50 border border-white/20 text-white p-4 rounded text-center text-xl font-bold tracking-widest focus:outline-none focus:border-red-500 transition-colors placeholder-gray-700"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2 tracking-widest">VEHICLE CLASS</label>
                <div className="flex justify-center gap-2">
                   {CAR_COLORS.map(c => (
                     <button 
                       key={c}
                       onClick={() => setSelectedColor(c)}
                       className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === c ? 'border-white scale-110 shadow-[0_0_10px_white]' : 'border-transparent'}`}
                       style={{ backgroundColor: c }}
                     />
                   ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1 tracking-widest">API KEY</label>
                <div className="w-full bg-black/80 border border-white/10 text-gray-600 p-2 rounded font-mono text-[10px] truncate">
                  {MULTISYNQ_API_KEY}
                </div>
              </div>

              {errorMsg && <div className="text-red-500 text-sm text-center font-bold animate-pulse">{errorMsg}</div>}

              <button 
                onClick={handleJoin}
                disabled={!playerName}
                className={`w-full py-4 mt-2 text-black font-bold text-lg tracking-widest rounded transition-all transform hover:scale-105 ${playerName ? 'bg-white hover:bg-red-600 hover:text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'bg-gray-800 cursor-not-allowed text-gray-600'}`}
              >
                JOIN SESSION
              </button>
            </div>
            
             <p className="mt-6 text-[10px] text-gray-500 text-center uppercase">
                Open this URL on another device to race
             </p>
          </div>
        </div>
      )}

      {/* LOADING SCREEN */}
      {gameState === GameState.CONNECTING && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95">
           <div className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
             <div className="h-full bg-red-500 animate-loading-bar"></div>
           </div>
           <h2 className="mt-4 text-xl text-white font-display animate-pulse tracking-widest">{loadingMsg}</h2>
           <style>{`
             @keyframes loading-bar {
               0% { width: 0%; transform: translateX(-100%); }
               100% { width: 100%; transform: translateX(0%); }
             }
             .animate-loading-bar {
               animation: loading-bar 1.5s infinite linear;
             }
           `}</style>
        </div>
      )}

      {/* HUD - ACTIVE GAME */}
      {gameState === GameState.RACING && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          
          {/* Speedometer */}
          <div className="absolute bottom-6 right-6 flex flex-col items-end">
             <div className="flex items-baseline gap-2">
                <span className="text-9xl font-display font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                  {speed}
                </span>
                <span className="text-2xl text-red-500 font-bold">KM/H</span>
             </div>
             <div className="w-80 h-3 bg-gray-900/80 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-teal-400 via-yellow-400 to-red-600 transition-all duration-75 ease-out"
                  style={{ width: `${Math.min((speed / 200) * 100, 100)}%` }}
                />
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;