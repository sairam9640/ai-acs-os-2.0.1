import React, { useEffect, useRef, useState } from 'react';
import { Radio, Zap, Activity, Wifi, Server, ShieldCheck, Sparkles } from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  type: 'CORE_OLT' | 'SPLITTER' | 'FAT_BOX' | 'SUBSCRIBER_ONT' | 'GATEWAY';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  powerDbm?: string;
  status: 'ONLINE' | 'ACTIVE' | 'OPTIMAL';
}

interface PulsePacket {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
  size: number;
}

export const FiberNetwork3DCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [activeTelemetry, setActiveTelemetry] = useState({
    activePhotons: 48,
    opticalLoss: '17.4 dB',
    cpeLatency: '8.4 ms',
    throughput: '984.2 Mbps',
  });

  const nodesRef = useRef<NetworkNode[]>([]);
  const pulsesRef = useRef<PulsePacket[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      initNetwork();
    };

    window.addEventListener('resize', handleResize);

    const initNetwork = () => {
      const centerX = width / 2;
      const centerY = height / 2;

      const nodes: NetworkNode[] = [
        { id: 'n1', name: 'Core OLT 100G', type: 'CORE_OLT', x: centerX, y: centerY, vx: 0, vy: 0, radius: 16, color: '#0284c7', powerDbm: '+4.5 dBm', status: 'OPTIMAL' },
        { id: 'n2', name: 'Feeder Splitter 1:8', type: 'SPLITTER', x: centerX - width * 0.25, y: centerY - height * 0.22, vx: 0.1, vy: -0.05, radius: 11, color: '#06b6d4', powerDbm: '-7.2 dBm', status: 'ACTIVE' },
        { id: 'n3', name: 'Metro Ring FAT-01', type: 'FAT_BOX', x: centerX + width * 0.26, y: centerY - height * 0.20, vx: -0.08, vy: 0.06, radius: 10, color: '#10b981', powerDbm: '-19.4 dBm', status: 'ONLINE' },
        { id: 'n4', name: 'South FAT-02', type: 'FAT_BOX', x: centerX - width * 0.22, y: centerY + height * 0.24, vx: 0.05, vy: 0.08, radius: 10, color: '#8b5cf6', powerDbm: '-18.8 dBm', status: 'ONLINE' },
        { id: 'n5', name: 'East Premise FAT-03', type: 'FAT_BOX', x: centerX + width * 0.24, y: centerY + height * 0.22, vx: -0.06, vy: -0.05, radius: 10, color: '#ec4899', powerDbm: '-19.2 dBm', status: 'ONLINE' },
        { id: 'n6', name: 'Titanium-2122A ONT', type: 'SUBSCRIBER_ONT', x: centerX - width * 0.38, y: centerY - height * 0.10, vx: 0.04, vy: 0.03, radius: 8, color: '#10b981', powerDbm: '-19.5 dBm', status: 'OPTIMAL' },
        { id: 'n7', name: 'Wi-Fi 6 Mesh ONT', type: 'SUBSCRIBER_ONT', x: centerX + width * 0.38, y: centerY - height * 0.08, vx: -0.04, vy: 0.05, radius: 8, color: '#10b981', powerDbm: '-18.9 dBm', status: 'OPTIMAL' },
        { id: 'n8', name: 'Enterprise Gateway ONT', type: 'SUBSCRIBER_ONT', x: centerX - width * 0.36, y: centerY + height * 0.30, vx: 0.03, vy: -0.04, radius: 8, color: '#10b981', powerDbm: '-19.1 dBm', status: 'OPTIMAL' },
        { id: 'n9', name: 'Smart Home ONT', type: 'SUBSCRIBER_ONT', x: centerX + width * 0.37, y: centerY + height * 0.28, vx: -0.05, vy: -0.02, radius: 8, color: '#10b981', powerDbm: '-19.8 dBm', status: 'OPTIMAL' },
      ];

      nodesRef.current = nodes;

      // Initialize Photon Pulses
      const pulses: PulsePacket[] = [];
      const connections = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 5], [2, 6], [3, 7], [4, 8],
        [1, 2], [3, 4],
      ];

      for (let i = 0; i < 18; i++) {
        const pair = connections[i % connections.length];
        pulses.push({
          fromNode: pair[0],
          toNode: pair[1],
          progress: Math.random(),
          speed: 0.006 + Math.random() * 0.008,
          color: i % 2 === 0 ? '#38bdf8' : '#34d399',
          size: 2.5 + Math.random() * 2,
        });
      }
      pulsesRef.current = pulses;
    };

    initNetwork();

    // Mouse Interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found: NetworkNode | null = null;
      for (const node of nodesRef.current) {
        const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
        if (dist <= node.radius + 10) {
          found = node;
          break;
        }
      }
      setHoveredNode(found);
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let angle = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Background Subtle Holographic Grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
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

      // Draw Connections & Glowing Laser Beams
      const nodes = nodesRef.current;
      const connections = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 5], [2, 6], [3, 7], [4, 8],
        [1, 2], [3, 4],
      ];

      for (const [i1, i2] of connections) {
        const n1 = nodes[i1];
        const n2 = nodes[i2];
        if (!n1 || !n2) continue;

        const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
        grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.35)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0.25)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = i1 === 0 ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      }

      // Render Moving Optical Pulses (Photons)
      for (const pulse of pulsesRef.current) {
        pulse.progress += pulse.speed;
        if (pulse.progress >= 1) {
          pulse.progress = 0;
        }

        const n1 = nodes[pulse.fromNode];
        const n2 = nodes[pulse.toNode];
        if (!n1 || !n2) continue;

        const px = n1.x + (n2.x - n1.x) * pulse.progress;
        const py = n1.y + (n2.y - n1.y) * pulse.progress;

        ctx.save();
        ctx.shadowColor = pulse.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, pulse.size, 0, Math.PI * 2);
        ctx.fill();

        // Photon glow ring
        ctx.strokeStyle = pulse.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, pulse.size + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Network Nodes
      angle += 0.02;
      for (const node of nodes) {
        // Floating motion
        node.x += node.vx;
        node.y += node.vy;

        // Soft boundaries
        if (node.x < 40 || node.x > width - 40) node.vx *= -1;
        if (node.y < 40 || node.y > height - 40) node.vy *= -1;

        // Outer Aura
        ctx.save();
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core Ring
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Center Pulsing Dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Node Label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.x, node.y + node.radius + 14);

        if (node.powerDbm) {
          ctx.fillStyle = '#38bdf8';
          ctx.font = '9px monospace';
          ctx.fillText(node.powerDbm, node.x, node.y + node.radius + 25);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-[450px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-sky-500/20 shadow-2xl overflow-hidden group">
      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />

      {/* Floating HUD Telemetry Overlay */}
      <div className="absolute top-4 left-4 p-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-sky-500/30 text-white shadow-lg pointer-events-none space-y-1">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
            Optical Mesh Digital Twin
          </span>
        </div>
        <p className="text-xs font-mono text-slate-300">Live TR-069 & PON Path Simulation</p>
      </div>

      <div className="absolute bottom-4 right-4 p-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-emerald-500/30 text-white shadow-lg pointer-events-none grid grid-cols-2 gap-3 text-xs font-mono">
        <div>
          <span className="text-[10px] text-slate-400 block">Avg Loss</span>
          <span className="font-bold text-emerald-400">{activeTelemetry.opticalLoss}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">RPC Latency</span>
          <span className="font-bold text-sky-400">{activeTelemetry.cpeLatency}</span>
        </div>
      </div>

      {/* Hovered Node Tooltip */}
      {hoveredNode && (
        <div
          className="absolute z-20 p-3 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-sky-400 shadow-2xl text-white pointer-events-none text-xs font-mono space-y-1 transform -translate-x-1/2 -translate-y-full mt-[-10px]"
          style={{ left: hoveredNode.x, top: hoveredNode.y }}
        >
          <div className="flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold text-sky-300">{hoveredNode.name}</span>
          </div>
          <p className="text-[11px] text-slate-300">Type: {hoveredNode.type}</p>
          <p className="text-[11px] text-emerald-400">Power: {hoveredNode.powerDbm || 'N/A'}</p>
          <p className="text-[10px] text-slate-400 uppercase">Status: {hoveredNode.status}</p>
        </div>
      )}
    </div>
  );
};
