import { useState, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
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
  isCluster?: boolean;
  parentId?: string;
  clusterCount?: number;
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
  const [searchMode, setSearchMode] = useState<'keyword'|'vector'|'hybrid'>('hybrid');
  const [searchResults, setSearchResults] = useState<Node[] | null>(null);
  const [showObservations, setShowObservations] = useState(false);
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const fgRef = useRef<any>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    // Phase 2 streaming: for central view use cursor pagination 500/page via /api/graph/stream, else single fetch for project
    const load = async () => {
      try {
        let json: any;
        if (view === 'central') {
          let allEntities: any[] = [];
          let allRelations: any[] = [];
          let cursor: string | undefined = undefined;
          do {
            const url = cursor ? `/api/graph/stream?cursor=${encodeURIComponent(cursor)}&limit=500` : `/api/graph/stream?limit=500`;
            const res = await fetch(url, { signal: ctrl.signal });
            const page = await res.json();
            allEntities = allEntities.concat(page.entities || []);
            allRelations = allRelations.concat(page.relations || []);
            cursor = page.nextCursor || undefined;
            if (ctrl.signal.aborted) break;
            // incremental render for large graphs
            json = { entities: allEntities, relations: allRelations };
            if (cursor) {
              // still more — render partial to keep UI responsive
              const degrees: Record<string, number> = {};
              const baseLinks: any[] = json.relations.map((r: any) => {
                degrees[r.from] = (degrees[r.from] || 0) + 1;
                degrees[r.to] = (degrees[r.to] || 0) + 1;
                return { source: r.from, target: r.to, label: r.relationType };
              });
              const entityNodes: any[] = json.entities.map((e: any) => ({
                id: e.name, name: e.name, group: e.entityType, observations: e.observations || [], val: Math.max(1, Math.sqrt((e.observations?.length || 0) + (degrees[e.name] || 0)))
              }));
              // deck.gl hint: >1k nodes will auto-disable physics (see ForceGraph props)
              setData({ nodes: entityNodes, links: baseLinks });
            }
          } while (cursor);
          json = { entities: allEntities, relations: allRelations };
        } else {
          const res = await fetch(`/api/graph/${view}`, { signal: ctrl.signal });
          json = await res.json();
        }
        if (ctrl.signal.aborted) return;
        // full render below

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

        // Build observation orbs: clustered by entity, expandable
        const obsNodes: Node[] = [];
        const obsLinks: Link[] = [];
        if (showObservations) {
          json.entities.forEach((e: any) => {
            const obsArr: string[] = e.observations || [];
            if (obsArr.length === 0) return;
            const isExpanded = expandedEntities.has(e.name);
            if (isExpanded) {
              obsArr.forEach((obs: string, idx: number) => {
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
                obsLinks.push({ source: e.name, target: obsId, label: 'has_observation' });
              });
            } else {
              // collapsed cluster orb
              const clusterId = `${e.name}::obsCluster`;
              const clusterSize = Math.min(3.5, 1.4 + Math.log2(obsArr.length + 1) * 0.6);
              obsNodes.push({
                id: clusterId,
                name: `${obsArr.length} obs`,
                group: 'observation',
                observations: obsArr,
                val: clusterSize,
                isObservation: true,
                isCluster: true,
                parentId: e.name,
                clusterCount: obsArr.length
              });
              obsLinks.push({ source: e.name, target: clusterId, label: 'has_observation' });
            }
          });
        }
        
        setData({ nodes: [...entityNodes, ...obsNodes], links: [...baseLinks, ...obsLinks] });
      } catch (err) {
        if (!(err as any)?.name?.includes('Abort')) console.error('Failed to load graph:', err);
      }
    };
    load();
    return () => ctrl.abort();
  }, [view, showObservations, expandedEntities]);

  // Hybrid search: call /api/search when query >=2 chars
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(q)}&mode=${searchMode}&limit=20`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(json => {
        const nodes: Node[] = (json.entities || []).map((e: any) => ({
          id: e.name,
          name: e.name,
          group: e.entityType,
          observations: e.observations || [],
          val: Math.max(1, Math.sqrt((e.observations?.length || 0))),
        }));
        setSearchResults(nodes);
      })
      .catch(() => setSearchResults(null));
    return () => ctrl.abort();
  }, [searchQuery, searchMode]);

  // Reset expanded when toggling off or switching view to avoid stale clusters
  useEffect(() => {
    if (!showObservations) setExpandedEntities(new Set());
  }, [showObservations, view]);

  const [isMobile, setIsMobile] = useState(false);
  // LOD: auto-collapse orbs when graph >300 nodes to keep 60fps
  const [mobileDismissed, setMobileDismissed] = useState(false);

  useEffect(() => {
    if (data.nodes.length > 300 && (showObservations || expandedEntities.size > 0)) {
      // auto-collapse to clusters to keep under 300
      if (expandedEntities.size > 0) setExpandedEntities(new Set());
      // keep showObservations as is, but clusters still <300; if still >300, disable orbs entirely
      if (data.nodes.length > 400 && showObservations) setShowObservations(false);
    }
  }, [data.nodes.length, showObservations, expandedEntities.size]);

  useEffect(() => {
    const check = () => {
      const small = window.innerWidth < 1024 || window.innerHeight < 600;
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const ua = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsMobile(small && (touch || ua) || window.innerWidth < 768);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const entityCount = data.nodes.filter(n => !n.isObservation).length;
  const baseFiltered = data.nodes
    .filter(n => !n.isObservation)
    .filter(n => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return n.name.toLowerCase().includes(q) || n.group.toLowerCase().includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const filteredNodes = searchResults !== null ? searchResults : baseFiltered;

  return (
    <div className="app-container">
      {isMobile && !mobileDismissed && (
        <div className="mobile-warning-overlay">
          <div className="mobile-warning-card">
            <div className="mobile-warning-icon">⚠️</div>
            <h2>DESKTOP ONLY</h2>
            <p>Project Guardian is optimized for desktop.</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 8 }}>
              For the best experience, open on a screen &gt; 1024px.<br/>
              Mobile rendering is disabled to preserve graph readability.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
              <button className="custom-select" style={{ padding: '8px 18px', cursor: 'pointer' }} onClick={() => setMobileDismissed(true)}>
                CONTINUE ANYWAY
              </button>
              <button className="custom-select" style={{ padding: '8px 18px', cursor: 'pointer', background: 'var(--bg-canvas)', color: 'var(--text-secondary)' }} onClick={() => window.location.reload()}>
                RELOAD
              </button>
            </div>
            <p style={{ marginTop: 16, fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
              TIP: Rotate to landscape or use desktop mode.
            </p>
          </div>
        </div>
      )}
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
            Show observation orbs {showObservations && `(${data.nodes.filter(n => n.isCluster).length} clusters / ${data.nodes.filter(n => n.isObservation && !n.isCluster).length} orbs)`}
          </label>
          {showObservations && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="custom-select" style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => {
                // expand all
                const all = new Set<string>();
                data.nodes.filter(n => !n.isObservation).forEach(n => {
                  if ((n.observations?.length || 0) > 0) all.add(n.id);
                });
                // also need to fetch from current data? use displayed nodes' parents
                // fallback: collect from data
                setExpandedEntities(all);
              }}>Expand all</button>
              <button className="custom-select" style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => setExpandedEntities(new Set())}>Collapse all</button>
            </div>
          )}
        </div>
        
        <div className="sidebar-body">
          <div style={{ marginBottom: 12 }}>
            <input 
              type="text" 
              className="search-input" 
              placeholder="SEARCH ENTITIES..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <select className="custom-select" value={searchMode} onChange={e => setSearchMode(e.target.value as any)} style={{ flex: 1, fontSize: '0.8rem', padding: '6px 8px' }}>
                <option value="hybrid">HYBRID (FTS+VECTOR)</option>
                <option value="keyword">KEYWORD (FTS)</option>
                <option value="vector">VECTOR</option>
              </select>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>{filteredNodes.length} / {entityCount} ENTITIES {searchResults !== null ? `• ${searchMode.toUpperCase()}` : ''}</span>
              <span>{entityCount === 0 ? 'LOADING...' : searchResults !== null ? 'HYBRID RANKED' : 'SORTED A-Z'}</span>
            </div>
          </div>

          {entityCount === 0 ? (
            <div className="empty-state">
              <p>SYSTEM STATUS: ONLINE</p>
              <p style={{ marginTop: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                LOADING KNOWLEDGE GRAPH...
              </p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>[NO MATCHES FOUND]</p>
          ) : (
            <div className="search-results" style={{ paddingRight: 4 }}>
              {filteredNodes.length <= 50 ? (
                <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                  {filteredNodes.map(node => {
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <div
                        key={node.id}
                        className="search-result-item"
                        style={{
                          borderColor: isSelected ? 'var(--accent-color)' : 'transparent',
                          color: isSelected ? 'var(--text-primary)' : undefined,
                          background: isSelected ? 'rgba(0, 255, 0, 0.08)' : undefined
                        }}
                        onClick={() => {
                          setSelectedNode(node);
                          if (fgRef.current && node.x !== undefined && node.y !== undefined) {
                            fgRef.current.centerAt(node.x, node.y, 1000);
                            fgRef.current.zoom(4, 1000);
                          } else if (fgRef.current) {
                            fgRef.current.zoomToFit(600);
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>&gt; {node.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '1px 4px', flexShrink: 0 }}>{node.group}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {node.observations.length} obs • {data.links.filter(l => l.source === node.id || l.target === node.id || (l.source as any).id === node.id || (l.target as any).id === node.id).length} links
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <List height={420} itemCount={filteredNodes.length} itemSize={56} width="100%" style={{ overflowX: 'hidden' }}>
                  {({ index, style }: { index: number; style: React.CSSProperties }) => {
                    const node = filteredNodes[index];
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <div style={{ ...style, paddingRight: 6, boxSizing: 'border-box' }}>
                        <div
                          className="search-result-item"
                          style={{
                            borderColor: isSelected ? 'var(--accent-color)' : 'transparent',
                            color: isSelected ? 'var(--text-primary)' : undefined,
                            background: isSelected ? 'rgba(0, 255, 0, 0.08)' : undefined,
                            height: 52
                          }}
                          onClick={() => {
                            setSelectedNode(node);
                            if (fgRef.current && node.x !== undefined && node.y !== undefined) {
                              fgRef.current.centerAt(node.x, node.y, 1000);
                              fgRef.current.zoom(4, 1000);
                            } else if (fgRef.current) {
                              fgRef.current.zoomToFit(600);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>&gt; {node.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '1px 4px', flexShrink: 0 }}>{node.group}</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {node.observations.length} obs
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </List>
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
          cooldownTicks={data.nodes.length > 1000 ? 0 : 100}
          d3AlphaDecay={data.nodes.length > 1000 ? 1 : 0.0228}
          d3VelocityDecay={data.nodes.length > 1000 ? 1 : 0.4}
          warmupTicks={data.nodes.length > 1000 ? 0 : 0}
          nodeRelSize={4}
          nodeVal="val"
          nodeLabel={(node: any) => node.isCluster ? `${node.parentId} — ${node.clusterCount} observations (click to expand)` : node.id}
          onNodeClick={(node: any) => {
            if (node.isCluster && node.parentId) {
              setExpandedEntities(prev => {
                const next = new Set(prev);
                if (next.has(node.parentId)) next.delete(node.parentId);
                else next.add(node.parentId);
                return next;
              });
            }
            setSelectedNode(node);
          }}
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
            const isCluster = !!node.isCluster;
            let color: string;
            let size: number;
            if (isCluster) {
              color = isSelected ? '#FFFFFF' : 'rgba(255, 200, 0, 0.95)';
              size = Math.max(4, node.val * 3.2);
              // cluster: amber stacked orbs effect
              ctx.beginPath();
              ctx.arc(node.x + 2, node.y + 1, size * 0.9, 0, 2 * Math.PI, false);
              ctx.fillStyle = 'rgba(255, 200, 0, 0.12)';
              ctx.fill();
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
              ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(40, 30, 0, 0.95)';
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.8;
              ctx.shadowColor = color;
              ctx.shadowBlur = 12;
              ctx.fill();
              ctx.stroke();
              ctx.shadowBlur = 0;
              // count inside
              ctx.fillStyle = color;
              ctx.font = `bold ${Math.max(8, size * 1.1)}px VT323, monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(node.clusterCount || ''), node.x, node.y);
            } else if (isObs) {
              color = isSelected ? '#FFFFFF' : 'rgba(0, 255, 255, 0.95)';
              size = Math.max(1.5, node.val * 2.2);
              ctx.beginPath();
              ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
              ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
              ctx.fill();
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
              if (!isCluster) {
                const label = node.name;
                const fontSize = isObs ? 9 / globalScale : 12 / globalScale;
                ctx.font = `${fontSize}px VT323, monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = isSelected ? '#FFFFFF' : isObs ? 'rgba(0, 255, 255, 0.85)' : 'rgba(0, 255, 0, 0.8)';
                ctx.fillText(label, node.x, node.y + size + (4 / globalScale));
              } else if (isSelected) {
                ctx.font = `9px VT323, monospace`;
                ctx.fillStyle = 'rgba(255,200,0,0.9)';
                ctx.textAlign = 'center';
                ctx.fillText('CLICK TO EXPAND', node.x, node.y + size + 6);
              }
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
          
          <span className="node-badge">CLASS: {selectedNode.group}{selectedNode.isCluster ? ' • CLUSTER' : selectedNode.isObservation ? ' • ORB' : ''}</span>
          {selectedNode.isObservation && selectedNode.parentId && (
            <div style={{ fontSize: '0.85rem', color: selectedNode.isCluster ? 'rgba(255,200,0,0.9)' : 'rgba(0,255,255,0.8)', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span>PARENT: {selectedNode.parentId}</span>
              <button style={{ background: 'transparent', border: '1px solid rgba(0,255,255,0.4)', color: 'rgba(0,255,255,0.9)', cursor: 'pointer', padding: '1px 6px', fontFamily: 'VT323' }} onClick={() => {
                const parent = data.nodes.find(n => n.id === selectedNode.parentId);
                if (parent) {
                  setSelectedNode(parent);
                  if (fgRef.current && parent.x !== undefined) {
                    fgRef.current.centerAt(parent.x, parent.y, 800);
                    fgRef.current.zoom(3.5, 800);
                  }
                }
              }}>[GO TO PARENT]</button>
              {selectedNode.isCluster && (
                <button style={{ background: 'rgba(255,200,0,0.15)', border: '1px solid rgba(255,200,0,0.6)', color: 'rgba(255,200,0,1)', cursor: 'pointer', padding: '1px 8px', fontFamily: 'VT323' }} onClick={() => {
                  setExpandedEntities(prev => {
                    const next = new Set(prev);
                    next.add(selectedNode.parentId!);
                    return next;
                  });
                  // keep cluster selected? switch to parent for context
                }}>[EXPAND {selectedNode.clusterCount} ORBS]</button>
              )}
            </div>
          )}
          {!selectedNode.isObservation && selectedNode.observations.length > 0 && showObservations && (
            <div style={{ marginBottom: 10 }}>
              {expandedEntities.has(selectedNode.id) ? (
                <button style={{ background: 'rgba(255,200,0,0.12)', border: '1px solid rgba(255,200,0,0.5)', color: 'rgba(255,200,0,0.9)', cursor: 'pointer', padding: '4px 10px', fontFamily: 'VT323', fontSize: '0.85rem' }} onClick={() => setExpandedEntities(prev => { const n=new Set(prev); n.delete(selectedNode.id); return n; })}>[COLLAPSE {selectedNode.observations.length} ORBS → CLUSTER]</button>
              ) : (
                <button style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.4)', color: 'rgba(0,255,255,0.9)', cursor: 'pointer', padding: '4px 10px', fontFamily: 'VT323', fontSize: '0.85rem' }} onClick={() => setExpandedEntities(prev => { const n=new Set(prev); n.add(selectedNode.id); return n; })}>[EXPAND → {selectedNode.observations.length} ORBS]</button>
              )}
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
