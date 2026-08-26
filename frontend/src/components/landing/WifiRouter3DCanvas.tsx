import React, { useEffect, useRef, useState } from 'react';
import {
  Wifi,
  Laptop,
  Smartphone,
  Tv,
  Gamepad2,
  Cpu,
  Activity,
  Zap,
  Radio,
  Signal,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface DeviceNode {
  id: string;
  name: string;
  type: 'laptop' | 'phone' | 'tv' | 'game' | 'iot';
  ip: string;
  mac: string;
  band: '5GHz' | '2.4GHz' | 'Ethernet';
  signalDbm: number;
  speedMbps: number;
  downloadSpeed: string;
  uploadSpeed: string;
  angle: number; // in radians
  distance: number;
  speed: number;
  x: number;
  y: number;
  z: number;
}

interface SparkParticle {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  controlX: number;
  controlY: number;
  progress: number;
  speed: number;
  size: number;
  color: string;
  tailLength: number;
  burstOnEnd: boolean;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

export const WifiRouter3DCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<DeviceNode | null>(null);
  const [activeBandFilter, setActiveBandFilter] = useState<'ALL' | '5GHz' | '2.4GHz'>('ALL');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Initial Connected Devices
  const devicesRef = useRef<DeviceNode[]>([
    {
      id: 'dev_1',
      name: 'MacBook Pro M3',
      type: 'laptop',
      ip: '192.168.1.104',
      mac: 'F4:D4:88:5A:21:40',
      band: '5GHz',
      signalDbm: -42,
      speedMbps: 866,
      downloadSpeed: '94.2 MB/s',
      uploadSpeed: '28.5 MB/s',
      angle: 0.3,
      distance: 190,
      speed: 0.003,
      x: 0,
      y: 0,
      z: 0,
    },
    {
      id: 'dev_2',
      name: 'iPhone 16 Pro Max',
      type: 'phone',
      ip: '192.168.1.112',
      mac: 'BC:D0:74:91:E4:05',
      band: '5GHz',
      signalDbm: -48,
      speedMbps: 780,
      downloadSpeed: '65.8 MB/s',
      uploadSpeed: '18.2 MB/s',
      angle: 1.35,
      distance: 220,
      speed: -0.0025,
      x: 0,
      y: 0,
      z: 0,
    },
    {
      id: 'dev_3',
      name: 'Sony Bravia 4K TV',
      type: 'tv',
      ip: '192.168.1.120',
      mac: 'E0:28:6D:3F:1B:88',
      band: '5GHz',
      signalDbm: -55,
      speedMbps: 450,
      downloadSpeed: '42.0 MB/s',
      uploadSpeed: '8.4 MB/s',
      angle: 2.5,
      distance: 240,
      speed: 0.002,
      x: 0,
      y: 0,
      z: 0,
    },
    {
      id: 'dev_4',
      name: 'PlayStation 5 Pro',
      type: 'game',
      ip: '192.168.1.135',
      mac: '70:9E:29:44:8C:20',
      band: '5GHz',
      signalDbm: -38,
      speedMbps: 1200,
      downloadSpeed: '118.4 MB/s',
      uploadSpeed: '45.1 MB/s',
      angle: 3.6,
      distance: 180,
      speed: -0.0035,
      x: 0,
      y: 0,
      z: 0,
    },
    {
      id: 'dev_5',
      name: 'Samsung Galaxy S24 Ultra',
      type: 'phone',
      ip: '192.168.1.144',
      mac: '48:2C:A0:15:7E:9C',
      band: '2.4GHz',
      signalDbm: -58,
      speedMbps: 150,
      downloadSpeed: '16.4 MB/s',
      uploadSpeed: '5.2 MB/s',
      angle: 4.8,
      distance: 230,
      speed: 0.0028,
      x: 0,
      y: 0,
      z: 0,
    },
    {
      id: 'dev_6',
      name: 'Smart Home IoT Hub',
      type: 'iot',
      ip: '192.168.1.150',
      mac: '30:AE:A4:77:22:D1',
      band: '2.4GHz',
      signalDbm: -64,
      speedMbps: 72,
      downloadSpeed: '3.1 MB/s',
      uploadSpeed: '1.2 MB/s',
      angle: 5.7,
      distance: 210,
      speed: -0.0022,
      x: 0,
      y: 0,
      z: 0,
    },
  ]);

  const sparksRef = useRef<SparkParticle[]>([]);
  const burstsRef = useRef<BurstParticle[]>([]);
  const wavesRef = useRef<number[]>([0, 30, 60, 90]);

  // Handle Mouse Movement for Parallax 3D tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 30;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 30;
    setMousePos({ x, y });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Spawn sparks continuously
    const sparkInterval = setInterval(() => {
      const devices = devicesRef.current;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      devices.forEach((dev) => {
        if (activeBandFilter !== 'ALL' && dev.band !== activeBandFilter) return;

        // Create outgoing spark (Router -> Device)
        const is5G = dev.band === '5GHz';
        const color = is5G ? '#06B6D4' : '#10B981';

        // Curve control point
        const midX = (centerX + dev.x) / 2 + (Math.random() - 0.5) * 40;
        const midY = (centerY + dev.y) / 2 + (Math.random() - 0.5) * 40;

        sparksRef.current.push({
          startX: centerX,
          startY: centerY,
          targetX: dev.x,
          targetY: dev.y,
          controlX: midX,
          controlY: midY,
          progress: 0,
          speed: 0.018 + Math.random() * 0.015,
          size: 2.5 + Math.random() * 1.5,
          color,
          tailLength: 8,
          burstOnEnd: true,
        });

        // 30% chance for reverse spark (Device -> Router)
        if (Math.random() < 0.35) {
          sparksRef.current.push({
            startX: dev.x,
            startY: dev.y,
            targetX: centerX,
            targetY: centerY,
            controlX: midX,
            controlY: midY,
            progress: 0,
            speed: 0.02 + Math.random() * 0.012,
            size: 2,
            color: '#A855F7',
            tailLength: 6,
            burstOnEnd: false,
          });
        }
      });
    }, 180);

    // Main 60fps Render Loop
    const render = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Background Optical Energy Grid & Laser Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw Pulsing Wi-Fi Radio Waves (Concentric 3D perspective rings)
      wavesRef.current = wavesRef.current.map((radius) => {
        let nextRadius = radius + 0.8;
        if (nextRadius > 260) nextRadius = 0;

        const alpha = Math.max(0, 1 - nextRadius / 260) * 0.25;

        // 5GHz Cyan Ring
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, nextRadius, nextRadius * 0.65, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 2.4GHz Emerald Ring
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, nextRadius * 0.85, nextRadius * 0.55, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        return nextRadius;
      });

      // 3. Update & Draw Device Nodes
      const devices = devicesRef.current;
      devices.forEach((dev) => {
        // Orbit update
        dev.angle += dev.speed;
        dev.x = centerX + Math.cos(dev.angle) * dev.distance;
        dev.y = centerY + Math.sin(dev.angle) * (dev.distance * 0.65);

        const isFiltered = activeBandFilter !== 'ALL' && dev.band !== activeBandFilter;
        const opacity = isFiltered ? 0.2 : 1;

        // Draw Connection Laser Guide Line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.quadraticCurveTo(
          (centerX + dev.x) / 2,
          (centerY + dev.y) / 2,
          dev.x,
          dev.y
        );
        const grad = ctx.createLinearGradient(centerX, centerY, dev.x, dev.y);
        if (dev.band === '5GHz') {
          grad.addColorStop(0, `rgba(6, 182, 212, ${0.4 * opacity})`);
          grad.addColorStop(1, `rgba(168, 85, 247, ${0.2 * opacity})`);
        } else {
          grad.addColorStop(0, `rgba(16, 185, 129, ${0.4 * opacity})`);
          grad.addColorStop(1, `rgba(5, 150, 105, ${0.2 * opacity})`);
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();

        // Draw Node Halo Glow
        ctx.save();
        const glowColor = dev.band === '5GHz' ? 'rgba(6, 182, 212,' : 'rgba(16, 185, 129,';
        const nodeGlow = ctx.createRadialGradient(dev.x, dev.y, 2, dev.x, dev.y, 24);
        nodeGlow.addColorStop(0, `${glowColor} ${0.3 * opacity})`);
        nodeGlow.addColorStop(1, `${glowColor} 0)`);
        ctx.fillStyle = nodeGlow;
        ctx.beginPath();
        ctx.arc(dev.x, dev.y, 24, 0, Math.PI * 2);
        ctx.fill();

        // Node Inner Circle
        ctx.beginPath();
        ctx.arc(dev.x, dev.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = isFiltered ? '#E2E8F0' : '#FFFFFF';
        ctx.shadowColor = dev.band === '5GHz' ? '#06B6D4' : '#10B981';
        ctx.shadowBlur = isFiltered ? 0 : 10;
        ctx.fill();

        ctx.strokeStyle = dev.band === '5GHz' ? '#0891B2' : '#059669';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      // 4. Update & Draw Flying Sparks (Bézier curve interpolation)
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const spark = sparksRef.current[i];
        spark.progress += spark.speed;

        if (spark.progress >= 1) {
          if (spark.burstOnEnd) {
            // Spawn burst particles on impact
            for (let b = 0; b < 6; b++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 1 + Math.random() * 2.5;
              burstsRef.current.push({
                x: spark.targetX,
                y: spark.targetY,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                alpha: 1,
                color: spark.color,
                size: 1.5 + Math.random() * 1.5,
              });
            }
          }
          sparksRef.current.splice(i, 1);
          continue;
        }

        // Compute quadratic Bézier point (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
        const t = spark.progress;
        const currentX =
          (1 - t) * (1 - t) * spark.startX +
          2 * (1 - t) * t * spark.controlX +
          t * t * spark.targetX;
        const currentY =
          (1 - t) * (1 - t) * spark.startY +
          2 * (1 - t) * t * spark.controlY +
          t * t * spark.targetY;

        // Draw glowing spark point
        ctx.save();
        ctx.beginPath();
        ctx.arc(currentX, currentY, spark.size, 0, Math.PI * 2);
        ctx.fillStyle = spark.color;
        ctx.shadowColor = spark.color;
        ctx.shadowBlur = 12;
        ctx.fill();

        // Draw trailing spark glow
        ctx.beginPath();
        ctx.arc(currentX, currentY, spark.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `${spark.color}44`;
        ctx.fill();
        ctx.restore();
      }

      // 5. Update & Draw Impact Bursts
      for (let i = burstsRef.current.length - 1; i >= 0; i--) {
        const burst = burstsRef.current[i];
        burst.x += burst.vx;
        burst.y += burst.vy;
        burst.alpha -= 0.035;

        if (burst.alpha <= 0) {
          burstsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, burst.size, 0, Math.PI * 2);
        ctx.fillStyle = burst.color;
        ctx.globalAlpha = burst.alpha;
        ctx.shadowColor = burst.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(sparkInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeBandFilter]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[540px] rounded-3xl bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9] border border-[#E2E8F0] shadow-xl overflow-hidden select-none flex items-center justify-center"
    >
      {/* Background Interactive Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-auto">
        {/* Live Band Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1 bg-white/80 backdrop-blur-md border border-[#E2E8F0] rounded-xl shadow-sm">
          <button
            onClick={() => setActiveBandFilter('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeBandFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            All Bands (6)
          </button>
          <button
            onClick={() => setActiveBandFilter('5GHz')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all ${
              activeBandFilter === '5GHz'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-[#64748B] hover:text-cyan-600'
            }`}
          >
            <Zap className="w-3 h-3 text-cyan-300" />
            <span>5 GHz Ultra</span>
          </button>
          <button
            onClick={() => setActiveBandFilter('2.4GHz')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all ${
              activeBandFilter === '2.4GHz'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[#64748B] hover:text-emerald-600'
            }`}
          >
            <Radio className="w-3 h-3 text-emerald-300" />
            <span>2.4 GHz Long-Range</span>
          </button>
        </div>

        {/* Live Telemetry Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-50/90 border border-emerald-200 backdrop-blur-md rounded-xl text-emerald-800 text-xs font-semibold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Live Sparks: TR-069 Active Session</span>
        </div>
      </div>

      {/* 3D CENTRAL WI-FI ROUTER / ONT */}
      <div
        className="relative z-10 flex flex-col items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `perspective(1000px) rotateX(${-mousePos.y * 0.4}deg) rotateY(${mousePos.x * 0.4}deg)`,
        }}
      >
        {/* Glowing Holographic Halo */}
        <div className="absolute -inset-8 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-purple-500/20 rounded-full blur-2xl animate-pulse"></div>

        {/* Router Hardware Body Card */}
        <div className="relative w-52 p-4 rounded-2xl bg-gradient-to-b from-[#0F172A] to-[#1E293B] border-2 border-emerald-500/40 shadow-2xl text-white flex flex-col items-center">
          {/* Antennas */}
          <div className="absolute -top-7 left-5 w-2 h-8 bg-slate-700 rounded-t-full border border-slate-600 rotate-[-18deg] flex items-start justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shadow-sm shadow-emerald-400"></span>
          </div>
          <div className="absolute -top-8 left-16 w-2 h-9 bg-slate-700 rounded-t-full border border-slate-600 rotate-[-6deg] flex items-start justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 shadow-sm shadow-cyan-400"></span>
          </div>
          <div className="absolute -top-8 right-16 w-2 h-9 bg-slate-700 rounded-t-full border border-slate-600 rotate-[6deg] flex items-start justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 shadow-sm shadow-cyan-400"></span>
          </div>
          <div className="absolute -top-7 right-5 w-2 h-8 bg-slate-700 rounded-t-full border border-slate-600 rotate-[18deg] flex items-start justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shadow-sm shadow-emerald-400"></span>
          </div>

          {/* Brand Header */}
          <div className="w-full flex items-center justify-between pb-2 border-b border-slate-700/60 mb-2.5">
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[11px] font-extrabold tracking-wider text-emerald-400 uppercase">
                AI ISP ONT
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
              Wi-Fi 6 GPON
            </span>
          </div>

          {/* Center LED Display Panel */}
          <div className="w-full bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 mb-2.5 flex items-center justify-between">
            <div className="text-left">
              <div className="text-[10px] text-slate-400">Optical Rx Power</div>
              <div className="text-xs font-mono font-bold text-emerald-400">-18.40 dBm</div>
            </div>
            <div className="h-6 w-px bg-slate-700"></div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">Total Throughput</div>
              <div className="text-xs font-mono font-bold text-cyan-400">2.4 Gbps</div>
            </div>
          </div>

          {/* Live LED Indicators */}
          <div className="w-full grid grid-cols-6 gap-1 text-center">
            <div>
              <span className="block w-2 h-2 mx-auto rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
              <span className="text-[8px] text-slate-400">PWR</span>
            </div>
            <div>
              <span className="block w-2 h-2 mx-auto rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
              <span className="text-[8px] text-slate-400">PON</span>
            </div>
            <div>
              <span className="block w-2 h-2 mx-auto rounded-full bg-slate-600"></span>
              <span className="text-[8px] text-slate-400">LOS</span>
            </div>
            <div>
              <span className="block w-2 h-2 mx-auto rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse"></span>
              <span className="text-[8px] text-slate-400">5G</span>
            </div>
            <div>
              <span className="block w-2 h-2 mx-auto rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse"></span>
              <span className="text-[8px] text-slate-400">2.4G</span>
            </div>
            <div>
              <span className="block w-2 h-2 mx-auto rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
              <span className="text-[8px] text-slate-400">LAN</span>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DEVICE NODES (DOM OVERLAY) */}
      {devicesRef.current.map((dev) => {
        const isFiltered = activeBandFilter !== 'ALL' && dev.band !== activeBandFilter;
        return (
          <div
            key={dev.id}
            onMouseEnter={() => setHoveredNode(dev)}
            onMouseLeave={() => setHoveredNode(null)}
            className={`absolute z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${
              isFiltered ? 'opacity-20 pointer-events-none' : 'opacity-100'
            }`}
            style={{
              left: `${dev.x}px`,
              top: `${dev.y}px`,
            }}
          >
            {/* Device Icon Circle */}
            <div className="w-9 h-9 rounded-full bg-white border border-[#CBD5E1] shadow-md flex items-center justify-center text-[#334155] hover:scale-110 hover:border-emerald-500 hover:text-emerald-600 transition-all">
              {dev.type === 'laptop' && <Laptop className="w-4 h-4" />}
              {dev.type === 'phone' && <Smartphone className="w-4 h-4" />}
              {dev.type === 'tv' && <Tv className="w-4 h-4" />}
              {dev.type === 'game' && <Gamepad2 className="w-4 h-4" />}
              {dev.type === 'iot' && <Cpu className="w-4 h-4" />}
            </div>

            {/* Micro Badge */}
            <span
              className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 text-[8px] font-bold rounded-full text-white shadow-sm ${
                dev.band === '5GHz' ? 'bg-cyan-600' : 'bg-emerald-600'
              }`}
            >
              {dev.band}
            </span>
          </div>
        );
      })}

      {/* HOVER TOOLTIP CARD */}
      {hoveredNode && (
        <div
          className="absolute z-30 pointer-events-none w-56 p-3 bg-white/95 backdrop-blur-md border border-[#CBD5E1] rounded-2xl shadow-2xl text-left animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(Math.max(hoveredNode.x, 120), 400)}px`,
            top: `${hoveredNode.y - 70}px`,
          }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#F1F5F9] mb-1.5">
            <div className="font-bold text-xs text-[#0F172A] truncate">{hoveredNode.name}</div>
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                hoveredNode.band === '5GHz'
                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {hoveredNode.band}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] text-[#64748B]">
            <div>IP: <span className="font-mono text-[#0F172A]">{hoveredNode.ip}</span></div>
            <div>Signal: <span className="font-semibold text-emerald-600">{hoveredNode.signalDbm} dBm</span></div>
            <div>Link: <span className="font-semibold text-cyan-600">{hoveredNode.speedMbps} Mbps</span></div>
            <div>Traffic: <span className="font-semibold text-[#0F172A]">↓ {hoveredNode.downloadSpeed}</span></div>
          </div>
        </div>
      )}

      {/* Bottom Telemetry Legend */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[11px] text-[#64748B] pointer-events-none z-20">
        <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-sm shadow-cyan-400"></span>
            <span className="font-medium text-[#334155]">5 GHz High-Bandwidth Sparks</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400"></span>
            <span className="font-medium text-[#334155]">2.4 GHz Wide-Coverage Sparks</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-400"></span>
            <span className="font-medium text-[#334155]">Uplink Feedback</span>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-1 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E2E8F0] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 mr-1" />
          <span>Move mouse to tilt 3D perspective</span>
        </div>
      </div>
    </div>
  );
};
