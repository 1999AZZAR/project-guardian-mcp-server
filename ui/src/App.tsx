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
  const fgRef = useRef<any>(null);

  useEffect(() => {
    fetch(`/api/graph/${view}`)
      .then((res) => res.json())
      .then((json) => {
        const degrees: Record<string, number> = {};
        const links = json.relations.map((r: any) => {
          degrees[r.from] = (degrees[r.from] || 0) + 1;
          degrees[r.to] = (degrees[r.to] || 0) + 1;
          return {
            source: r.from,
            target: r.to,
            label: r.relationType
          };
        });
        
        const nodes = json.entities.map((e: any) => {
          const obsCount = e.observations?.length || 0;
          const linkCount = degrees[e.name] || 0;
          // Scale node size based on interconnectedness and data density
          const val = Math.max(1, Math.sqrt(obsCount + linkCount));
          
          return {
            id: e.name,
            name: e.name,
            group: e.entityType,
            observations: e.observations || [],
            val
          };
        });
        
        setData({ nodes, links });
      })
      .catch((err) => console.error('Failed to load graph:', err));
  }, [view]);

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
              <div className="metric-value">{data.nodes.length}</div>
              <div className="metric-label">Entities</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{data.links.length}</div>
              <div className="metric-label">Relations</div>
            </div>
          </div>
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
             const isConnected = selectedNode && (
                link.source === selectedNode.id || link.target === selectedNode.id ||
                link.source.id === selectedNode.id || link.target.id === selectedNode.id
             );
             return isConnected ? 'rgba(0, 255, 0, 0.9)' : 'rgba(0, 255, 0, 0.35)';
          }}
          linkWidth={(link: any) => {
             const isConnected = selectedNode && (
                link.source === selectedNode.id || link.target === selectedNode.id ||
                link.source.id === selectedNode.id || link.target.id === selectedNode.id
             );
             return isConnected ? 2 : 1;
          }}
          linkDirectionalParticles={2}
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
            // Calculate neon color based on group
            let hash = 0;
            for (let i = 0; i < node.group.length; i++) {
              hash = node.group.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            const isSelected = node.id === selectedNode?.id;
            const color = isSelected ? '#FFFFFF' : `hsl(${hue}, 100%, 60%)`;
            
            const size = Math.max(2, node.val * 3);

            // Draw glowing circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0; // reset
            
            // Draw text label on canvas if zoomed in enough or if node is selected
            if (globalScale > 1.5 || isSelected) {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px VT323, monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(0, 255, 0, 0.8)';
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
            <h2 className="node-title">{selectedNode.name}</h2>
            <button className="close-btn" onClick={() => setSelectedNode(null)}>
              [X]
            </button>
          </div>
          
          <span className="node-badge">CLASS: {selectedNode.group}</span>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
             <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                LINKS: {data.links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id || (l.source as any).id === selectedNode.id || (l.target as any).id === selectedNode.id).length}
             </span>
             <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                OBSERVATIONS: {selectedNode.observations.length}
             </span>
          </div>

          <h3 className="section-title">Surveillance Logs</h3>
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
