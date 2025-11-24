import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ReferenceLine
} from 'recharts';

const Icon = ({ path, color = "currentColor", size = 24, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    {path}
  </svg>
);

const Icons = {
  Activity: (props) => <Icon path={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />} {...props} />,
  Wind: (props) => <Icon path={<><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></>} {...props} />,
  TrendingUp: (props) => <Icon path={<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />} {...props} />,
  TrendingDown: (props) => <Icon path={<polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />} {...props} />,
  AlertTriangle: (props) => <Icon path={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} {...props} />,
  Play: (props) => <Icon path={<polygon points="5 3 19 12 5 21 5 3" />} {...props} />,
  Pause: (props) => <Icon path={<><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>} {...props} />,
  Rewind: (props) => <Icon path={<><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></>} {...props} />
};

const API_URL = "https://temperaturedashboard.onrender.com";

const OBJECT_RANGES = [
  { name: "Ice Gel Bag",            start: "692217a74bf378bf90fcc039", end: "69222f454bf378bf90fcc294" },
  { name: "Frozen Onion",           start: "6922a6742ac4169f239852e4", end: "6922beb22ac4169f2398554f" },
  { name: "Frozen Unpeeled Potato", start: "6922cb2123a56a4d029c8b61", end: "6922da9a23a56a4d029c8cec" },
  { name: "Peeled Potato",          start: "6923044a53ea1203f6c35c11", end: "6923264953ea1203f6c35f75" },
  { name: "Frozen Tomato",          start: "69232a4913e11f2f97a58d13", end: "6923535613e11f2f97a5912b" }
];


const MOCK_DATA = [
  { _id: "692217a74bf378bf90fcc040", timestamp: "2025-11-22T20:00:00Z", sensors: [{address: "0x5a", ambient_temp: 29, object_temp: 5}, {address: "0x5b", ambient_temp: 29.2, object_temp: 4.8}, {address: "0x5c", ambient_temp: 29.1, object_temp: 4.9}, {address: "0x5d", ambient_temp: 29.3, object_temp: 4.7}] },
  { _id: "692217a74bf378bf90fcc050", timestamp: "2025-11-22T20:05:00Z", sensors: [{address: "0x5a", ambient_temp: 28.5, object_temp: 8}, {address: "0x5b", ambient_temp: 28.8, object_temp: 7.9}, {address: "0x5c", ambient_temp: 28.6, object_temp: 7.8}, {address: "0x5d", ambient_temp: 28.9, object_temp: 7.7}] },
  { _id: "692217a74bf378bf90fcc060", timestamp: "2025-11-22T20:10:00Z", sensors: [{address: "0x5a", ambient_temp: 28.0, object_temp: 12}, {address: "0x5b", ambient_temp: 28.4, object_temp: 11.9}, {address: "0x5c", ambient_temp: 28.2, object_temp: 11.8}, {address: "0x5d", ambient_temp: 28.5, object_temp: 11.7}] }
];

const styles = {
  container: { fontFamily: "'Manrope', sans-serif", backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: '100vh', width: '100%', padding: '20px', boxSizing: 'border-box', overflowX: 'hidden' },
  neonText: { color: '#38bdf8', textShadow: '0 0 10px rgba(56, 189, 248, 0.5)' },
  glassCard: { background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)' },
  sensorValue: { fontSize: '2rem', fontWeight: '700', fontFamily: 'monospace' },
  orbContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', position: 'relative' }
};

const Dashboard = () => {
  const [rawData, setRawData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [playbackIndex, setPlaybackIndex] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedItem, setSelectedItem] = useState(OBJECT_RANGES[0].name);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("Connecting...");
  const playbackRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`✅ Loaded ${data.length} records.`);
          setRawData(data);
          setDataSource("Live Data");
          processByItem(data, OBJECT_RANGES[0].name);
        } else {
          console.warn("⚠️ Backend empty.");
          setRawData(MOCK_DATA);
          setDataSource("Mock Data (DB Empty)");
          processByItem(MOCK_DATA, OBJECT_RANGES[0].name);
        }
      } catch (e) {
        console.error("❌ Fetch failed.", e);
        setRawData(MOCK_DATA);
        setDataSource("Mock Data (Offline)");
        processByItem(MOCK_DATA, OBJECT_RANGES[0].name);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const processByItem = (docs, itemName) => {
    const range = OBJECT_RANGES.find(r => r.name === itemName);
    if (!range) return;

    const filtered = docs
      .filter(doc => doc._id >= range.start && doc._id <= range.end)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (filtered.length === 0) {
      setProcessedData([]);
      setPlaybackIndex(0);
      return;
    }


    const withAverages = filtered.map((doc) => {
      const sensors = doc.sensors || [];
      const validSensors = sensors.filter(s => s.ambient_temp !== undefined && s.object_temp !== undefined);
      
      const avgAmb = validSensors.reduce((sum, s) => sum + s.ambient_temp, 0) / (validSensors.length || 1);
      const avgObj = validSensors.reduce((sum, s) => sum + s.object_temp, 0) / (validSensors.length || 1);

      const ambients = validSensors.map(s => s.ambient_temp);
      const maxAmb = ambients.length > 0 ? Math.max(...ambients) : 0;
      const minAmb = ambients.length > 0 ? Math.min(...ambients) : 0;
      const gradient = isFinite(maxAmb - minAmb) ? maxAmb - minAmb : 0;

      const sensorMap = {
        front: sensors.find(s => s.address === "0x5a") || {},
        back: sensors.find(s => s.address === "0x5b") || {},
        left: sensors.find(s => s.address === "0x5c") || {},
        right: sensors.find(s => s.address === "0x5d") || {}
      };

      return { ...doc, enhanced: { avgAmb, avgObj, gradient, sensorMap } };
    });

    //Rate calc
    const enhancedData = withAverages.map((doc, idx, arr) => {
      let rate = 0;
      if (idx > 0) {
        const prev = arr[idx - 1];
        const timeDiff = (new Date(doc.timestamp) - new Date(prev.timestamp)) / 60000; 
        if (timeDiff > 0) rate = (doc.enhanced.avgObj - prev.enhanced.avgObj) / timeDiff;
      }
      return { ...doc, enhanced: { ...doc.enhanced, rate: isFinite(rate) ? rate : 0 } };
    });

    setProcessedData(enhancedData);
    setPlaybackIndex(Math.max(0, enhancedData.length - 1)); 
  };

  useEffect(() => {
    if (isPlaying) {
      playbackRef.current = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev >= processedData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100); 
    } else {
      clearInterval(playbackRef.current);
    }
    return () => clearInterval(playbackRef.current);
  }, [isPlaying, processedData]);

  const currentFrame = processedData[playbackIndex] || null;
  
  const analytics = useMemo(() => {
    if (!currentFrame) return { stabilityScore: 0, gradient: 0, rate: 0 };
    
    const sensorMap = currentFrame.enhanced.sensorMap;
    const ambients = [
      sensorMap.front.ambient_temp, sensorMap.back.ambient_temp, 
      sensorMap.left.ambient_temp, sensorMap.right.ambient_temp
    ].filter(v => v !== undefined && v !== null);

    const avg = currentFrame.enhanced.avgAmb;
    const variance = ambients.length > 0 ? ambients.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / ambients.length : 0;
    const stabilityScore = Math.max(0, 100 - (variance * 20)).toFixed(1);

    return {
      stabilityScore,
      gradient: currentFrame.enhanced.gradient,
      rate: currentFrame.enhanced.rate
    };
  }, [currentFrame]);

  const getOrbColor = (temp) => {
    if (temp < 10) return ['#3b82f6', '#0ea5e9']; 
    if (temp < 20) return ['#22c55e', '#84cc16']; 
    return ['#ef4444', '#f97316']; 
  };

  const orbColors = currentFrame ? getOrbColor(currentFrame.enhanced.avgObj) : ['#555', '#777'];

  if (loading) return <div style={styles.container}>Loading Scientific Module...</div>;

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.3); opacity: 0; } }
          @keyframes orb-breathe { 0% { transform: scale(1); box-shadow: 0 0 30px ${orbColors[0]}; } 50% { transform: scale(1.05); box-shadow: 0 0 60px ${orbColors[1]}; } 100% { transform: scale(1); box-shadow: 0 0 30px ${orbColors[0]}; } }
          .orb-core { width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, ${orbColors[1]}, ${orbColors[0]}); animation: orb-breathe 3s infinite ease-in-out; position: relative; z-index: 2; }
          .orb-ring { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 160px; height: 160px; border-radius: 50%; border: 2px solid ${orbColors[0]}; opacity: 0.3; animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
        `}
      </style>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div>
          <h1 style={{margin: 0, fontSize: '2.5rem', ...styles.neonText, display: 'flex', alignItems: 'center'}}>
            <Icons.Activity style={{marginRight: '12px'}} color="#38bdf8"/>
            Temperature Sensing Dashboard
          </h1>
          <div style={{display: 'flex', alignItems: 'center', marginTop: '5px'}}>
            <p style={{color: '#94a3b8', margin: '0 10px 0 5px'}}>Object:</p>
            <select 
              value={selectedItem} 
              onChange={(e) => {
                setSelectedItem(e.target.value);
                processByItem(rawData, e.target.value);
              }}
              style={{background: '#1e293b', color: '#fff', border: '1px solid #475569', padding: '5px 10px', borderRadius: '4px'}}
            >
              {OBJECT_RANGES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
            <span style={{marginLeft: '15px', fontSize: '0.8rem', color: dataSource.includes("Mock") ? '#ef4444' : '#22c55e'}}>● {dataSource}</span>
          </div>
        </div>
        
        <div style={{...styles.glassCard, display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 20px'}}>
          <button onClick={() => setPlaybackIndex(0)} style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer'}}><Icons.Rewind size={20}/></button>
          <button onClick={() => setIsPlaying(!isPlaying)} style={{background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {isPlaying ? <Icons.Pause size={20}/> : <Icons.Play size={20} style={{marginLeft: '2px'}}/>}
          </button>
          <input type="range" min="0" max={Math.max(0, processedData.length - 1)} value={playbackIndex} onChange={(e) => { setPlaybackIndex(parseInt(e.target.value)); setIsPlaying(false); }} style={{width: '200px', accentColor: '#3b82f6'}} />
          <span style={{fontFamily: 'monospace', minWidth: '80px'}}>{currentFrame ? new Date(currentFrame.timestamp).toLocaleTimeString() : '--:--'}</span>
        </div>
      </div>

      {processedData.length === 0 ? (
        <div style={{...styles.glassCard, textAlign: 'center', padding: '40px', color: '#ef4444'}}>
          <h2>No Data Found for "{selectedItem}"</h2>
        </div>
      ) : (
        <>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 300px 1fr', gap: '20px', marginBottom: '20px'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                <SensorWidget label="Front Wall" value={currentFrame?.enhanced.sensorMap.front.ambient_temp} color="#c084fc" />
                <SensorWidget label="Back Wall" value={currentFrame?.enhanced.sensorMap.back.ambient_temp} color="#818cf8" />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                <SensorWidget label="Left Wall" value={currentFrame?.enhanced.sensorMap.left.ambient_temp} color="#34d399" />
                <SensorWidget label="Right Wall" value={currentFrame?.enhanced.sensorMap.right.ambient_temp} color="#fbbf24" />
              </div>
              <div style={styles.glassCard}>
                <h3 style={{color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center'}}>
                  <Icons.Wind size={16} style={{marginRight: '8px'}}/> Spatial Gradient
                </h3>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                  <div><div style={styles.sensorValue}>{(analytics.gradient || 0).toFixed(2)} °C</div><div style={{fontSize: '0.8rem', color: '#94a3b8'}}>Max Delta</div></div>
                  <div style={{height: '4px', width: '50%', background: 'linear-gradient(90deg, #34d399 0%, #ef4444 100%)', borderRadius: '2px', marginBottom: '10px'}} />
                </div>
              </div>
            </div>

            <div style={{...styles.glassCard, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
              <h2 style={{color: '#fff', letterSpacing: '2px', fontSize: '1rem', opacity: 0.8}}>OBJECT CORE</h2>
              <div style={styles.orbContainer}><div className="orb-ring"></div><div className="orb-core"></div></div>
              <div style={{marginTop: '-20px', position: 'relative', zIndex: 3}}>
                <div style={{fontSize: '3.5rem', fontWeight: '800', fontFamily: 'monospace', textShadow: '0 0 20px rgba(0,0,0,0.5)'}}>{currentFrame?.enhanced.avgObj.toFixed(1)}°C</div>
                <div style={{display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem'}}>
                  {analytics.rate > 0 ? <Icons.TrendingUp size={16} color="#ef4444"/> : <Icons.TrendingDown size={16} color="#34d399"/>}
                  <span style={{marginLeft: '6px', color: analytics.rate > 0 ? '#fca5a5' : '#86efac'}}>{analytics.rate > 0 ? '+' : ''}{Number(analytics.rate).toFixed(2)} °C/min</span>
                </div>
              </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div style={styles.glassCard}>
                <h3 style={{color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '15px', display: 'flex', alignItems: 'center'}}>
                  <Icons.AlertTriangle size={16} style={{marginRight: '8px'}}/> Stability Index
                </h3>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                  <div style={{position: 'relative', width: '80px', height: '80px'}}>
                    <svg width="80" height="80" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#334155" strokeWidth="4" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#38bdf8" strokeWidth="4" strokeDasharray={`${analytics.stabilityScore}, 100`} />
                    </svg>
                    <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold'}}>{analytics.stabilityScore}%</div>
                  </div>
                  <div style={{fontSize: '0.9rem', color: '#cbd5e1'}}>Variance is {analytics.stabilityScore > 80 ? 'Low (Stable)' : 'High (Unstable)'}.</div>
                </div>
              </div>
              

              <div style={{...styles.glassCard, borderColor: parseFloat(analytics.rate) > 0.5 ? '#ef4444' : 'transparent'}}>
                <h3 style={{color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase'}}>Anomaly Detection</h3>
                {parseFloat(analytics.rate) > 0.5 ? <div style={{color: '#fca5a5', fontSize: '0.9rem', marginTop: '5px'}}>⚠️ Rapid Warming!</div> : <div style={{color: '#86efac', fontSize: '0.9rem', marginTop: '5px'}}>✓ No Anomalies</div>}
              </div>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px'}}>
            <div style={styles.glassCard}>
              <h3 style={{marginBottom: '20px', color: '#e2e8f0'}}>Temperature Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={processedData}>
                  <defs><linearGradient id="colorObj" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString()} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #475569', color: '#fff'}} itemStyle={{color: '#fff'}} />
                  <Legend />
                  {currentFrame && <ReferenceLine x={currentFrame.timestamp} stroke="#facc15" strokeDasharray="3 3" />}
                  <Area type="monotone" dataKey="enhanced.avgObj" name="Object Core" stroke="#38bdf8" fillOpacity={1} fill="url(#colorObj)" strokeWidth={3} />
                  <Line type="monotone" dataKey="enhanced.avgAmb" name="Avg Ambient" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={styles.glassCard}>
              <h3 style={{marginBottom: '20px', color: '#e2e8f0'}}>Sensor Divergence</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={processedData}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
                  {currentFrame && <ReferenceLine x={currentFrame.timestamp} stroke="#facc15" />}
                  <Line type="monotone" dataKey="enhanced.gradient" name="Max Delta" stroke="#f472b6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SensorWidget = ({ label, value, color }) => (
  <div style={{background: 'rgba(30, 41, 59, 0.4)', border: `1px solid ${color}40`, padding: '15px', borderRadius: '12px', borderLeft: `4px solid ${color}`}}>
    <div style={{color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '5px'}}>{label}</div>
    <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#fff'}}>
      {value !== undefined && value !== null ? value.toFixed(1) : '--'} <span style={{fontSize: '0.9rem', color: '#64748b'}}>°C</span>
    </div>
  </div>
);

export default Dashboard;