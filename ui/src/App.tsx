import { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './App.css';

interface Node {
  id: string;
  name: string;
  group: string;
  observations: string[];
  val: number;
  x?: number;
  y?: number;
  isObservation?: boolean;
  parentId?: string;
}

interface Link {
  source: string;
  target: string;
  label: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

function App() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [view, setView] = useState<'project' | 'central'>('central');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showObservations, setShowObservations] = useState(false);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    fetch(`/api/graph/${view}`)
      .then((res) => res.json())
      .then((json) => {
        const degrees: Record<string, number> = {};
        const baseLinks: Link[] = json.relations.map((r: any) => {
          degrees[r.from] = (degrees[r.from] || 0) + 1;
          degrees[r.to] = (degrees[r.to] || 0) + 1;
          return {
            source: r.from,
            target: r.to,
            label: r.relationType
          };
        });
        
        const entityNodes: Node[] = json.entities.map((e: any) => {
          const obsCount = e.observations?.length || 0;
          const linkCount = degrees[e.name] || 0;
          const val = Math.max(1, Math.sqrt(obsCount + linkCount));
          return {
            id: e.name,
            name: e.name,
            group: e.entityType,
            observations: e.observations || [],
            val
          };
        });

        // Build observation orbs: one node per observation, linked to parent entity
        const obsNodes: Node[] = [];
        const obsLinks: Link[] = [];
        if (showObservations) {
          json.entities.forEach((e: any) => {
            (e.observations || []).forEach((obs: string, idx: number) => {
              const obsId = `${e.name}::obs::${idx}`;
              const short = obs.length > 48 ? obs.slice(0, 48) + '…' : obs;
              obsNodes.push({
                id: obsId,
                name: short,
                group: 'observation',
                observations: [obs],
                val: 0.7,
                isObservation: true,
                parentId: e.name
              });
              obsLinks.push({
                source: e.name,
                target: obsId,
                label: 'has_observation'
              });
            });
          });
        }
        
        setData({ nodes: [...entityNodes, ...obsNodes], links: [...baseLinks, ...obsLinks] });
      })
      .catch((err) => console.error('Failed to load graph:', err));
  }, [view, showObservations]);

  return (
    <div className="app-container">
      {/* Left Sidebar (Global Config & Metrics) */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="brand-title">Project Guardian</h1>
          
          <div className="view-selector">
            <label>Knowledge Base</label>
            <select 
              className="custom-select"
              value={view} 
              onChange={(e) => {
                setView(e.target.value as 'project' | 'central');
                setSelectedNode(null);
              }}
            >
              <option value="central">Central Aggregation</option>
              <option value="project">Local Repository</option>
            </select>
          </div>

          <div className="metrics-row">
            <div className="metric-card">
              <div className="metric-value">{data.nodes.filter(n => !n.isObservation).length}</div>
              <div className="metric-label">Entities</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{data.nodes.filter(n => n.isObservation).length}</div>
              <div className="metric-label">Orbs</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{data.links.length}</div>
              <div className="metric-label">Links</div>
            </div>
          </div>

          <label className="obs-toggle" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={showObservations} onChange={e => setShowObservations(e.target.checked)} />
            Show observation orbs
          </label>
        </div>
        
        <div className="sidebar-body">
          <div style={{ marginBottom: 20 }}>
            <input 
              type="text" 
              className="search-input" 
              placeholder="SEARCH ENTITIES..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery.trim() === '' ? (
            <div className="empty-state">
              <p>SYSTEM STATUS: ONLINE</p>
              <p style={{ marginTop: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                AWAITING COMMAND INPUT...
              </p>
            </div>
          ) : (
            <div className="search-results">
              {data.nodes
                .filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(node => (
                  <div 
                    key={node.id} 
                    className="search-result-item"
                    onClick={() => {
                      setSelectedNode(node);
                      if (fgRef.current && node.x !== undefined && node.y !== undefined) {
                        fgRef.current.centerAt(node.x, node.y, 1000);
                        fgRef.current.zoom(4, 1000);
                      }
                    }}
                  >
                    &gt; {node.name}
                  </div>
                ))}
              {data.nodes.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p style={{ color: 'var(--text-secondary)' }}>[NO MATCHES FOUND]</p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Graph Area */}
      <main className="graph-container">
        <ForceGraph2D
          ref={fgRef}
          graphData={data}
          nodeRelSize={4}
          nodeVal="val"
          nodeLabel="id"
          onNodeClick={(node: any) => setSelectedNode(node)}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkLabel="label"
          linkColor={(link: any) => {
             const isObs = link.label === 'has_observation';
             const isConnected = selectedNode && (
                link.source === selectedNode.id || link.target === selectedNode.id ||
                link.source.id === selectedNode.id || link.target.id === selectedNode.id ||
                (selectedNode.isObservation && link.target === selectedNode.id) ||
                (selectedNode.parentId && (link.source === selectedNode.parentId || link.target === selectedNode.parentId))
             );
             if (isObs) return isConnected ? 'rgba(0, 255, 255, 0.9)' : 'rgba(0, 255, 255, 0.25)';
             return isConnected ? 'rgba(0, 255, 0, 0.9)' : 'rgba(0, 255, 0, 0.35)';
          }}
          linkWidth={(link: any) => {
             const isObs = link.label === 'has_observation';
             const isConnected = selectedNode && (
                link.source === selectedNode.id || link.target === selectedNode.id ||
                link.source.id === selectedNode.id || link.target.id === selectedNode.id
             );
             if (isObs) return isConnected ? 1.5 : 0.8;
             return isConnected ? 2 : 1;
          }}
          linkDirectionalParticles={(link: any) => link.label === 'has_observation' ? 1 : 2}
          linkDirectionalParticleWidth={(link: any) => {
             const isConnected = selectedNode && (
                link.source === selectedNode.id || link.target === selectedNode.id ||
                link.source.id === selectedNode.id || link.target.id === selectedNode.id
             );
             return isConnected ? 4 : 2;
          }}
          linkDirectionalParticleSpeed={0.005}
          backgroundColor="transparent"
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const isSelected = node.id === selectedNode?.id;
            const isObs = !!node.isObservation;
            let color: string;
            let size: number;
            if (isObs) {
              color = isSelected ? '#FFFFFF' : 'rgba(0, 255, 255, 0.95)';
              size = Math.max(1.5, node.val * 2.2);
              // outer glow
              ctx.beginPath();
              ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
              ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
              ctx.fill();
              // core orb - hollow style with inner fill
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
              ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(20, 40, 40, 0.9)';
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.2;
              ctx.shadowColor = color;
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.stroke();
              ctx.shadowBlur = 0;
              // inner dot
              ctx.beginPath();
              ctx.arc(node.x, node.y, size * 0.35, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();
            } else {
              let hash = 0;
              for (let i = 0; i < node.group.length; i++) {
                hash = node.group.charCodeAt(i) + ((hash << 5) - hash);
              }
              const hue = Math.abs(hash) % 360;
              color = isSelected ? '#FFFFFF' : `hsl(${hue}, 100%, 60%)`;
              size = Math.max(2, node.val * 3);
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.shadowColor = color;
              ctx.shadowBlur = 10;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
            
            if (globalScale > 1.5 || isSelected) {
              const label = node.name;
              const fontSize = isObs ? 9 / globalScale : 12 / globalScale;
              ctx.font = `${fontSize}px VT323, monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = isSelected ? '#FFFFFF' : isObs ? 'rgba(0, 255, 255, 0.85)' : 'rgba(0, 255, 0, 0.8)';
              ctx.fillText(label, node.x, node.y + size + (4 / globalScale));
            }
          }}
        />
        <div className="graph-overlay-hint">
          SCROLL TO ZOOM • DRAG TO PAN • CLICK NODE FOR DETAILS
        </div>
      </main>

      {/* Right Details Panel (Popup) */}
      {selectedNode && (
        <aside className="right-panel">
          <div className="node-header">
            <h2 className="node-title" style={{ wordBreak: 'break-word' }}>{selectedNode.name}</h2>
            <button className="close-btn" onClick={() => setSelectedNode(null)}>
              [X]
            </button>
          </div>
          
          <span className="node-badge">CLASS: {selectedNode.group}{selectedNode.isObservation ? ' • ORB' : ''}</span>
          {selectedNode.isObservation && selectedNode.parentId && (
            <div style={{ fontSize: '0.85rem', color: 'rgba(0,255,255,0.8)', marginBottom: 10 }}>
              PARENT: {selectedNode.parentId} <button style={{ marginLeft: 6, background: 'transparent', border: '1px solid rgba(0,255,255,0.4)', color: 'rgba(0,255,255,0.9)', cursor: 'pointer', padding: '1px 6px', fontFamily: 'VT323' }} onClick={() => {
                const parent = data.nodes.find(n => n.id === selectedNode.parentId);
                if (parent) {
                  setSelectedNode(parent);
                  if (fgRef.current && parent.x !== undefined) {
                    fgRef.current.centerAt(parent.x, parent.y, 800);
                    fgRef.current.zoom(3.5, 800);
                  }
                }
              }}>[GO TO PARENT]</button>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
             <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                LINKS: {data.links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id || (l.source as any).id === selectedNode.id || (l.target as any).id === selectedNode.id).length}
             </span>
             {!selectedNode.isObservation && (
               <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  OBSERVATIONS: {selectedNode.observations.length}
               </span>
             )}
          </div>

          <h3 className="section-title">{selectedNode.isObservation ? 'Orb Payload' : 'Surveillance Logs'}</h3>
          {selectedNode.observations.length > 0 ? (
            <ul className="observations-list">
              {selectedNode.observations.map((obs, i) => (
                <li key={i} className="observation-item">{obs}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              [NO DATA FOUND]
            </p>
          )}
        </aside>
      )}
    </div>
  );
}

export default App;
