import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { AnimNode } from './components/AnimNode';
import { NodeInspector } from './components/NodeInspector';
import { extractAllNodesAndConnections, getColor } from './utils/graphUtils';
import { arrangeLayout, simpleGridLayout } from './utils/layout';

// Electron file handling
declare global {
  interface Window {
    electronAPI?: {
      onFileSelected: (callback: (filePath: string) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

const nodeTypes = {
  animNode: AnimNode,
};

function FlowComponent() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeRegistry, setNodeRegistry] = useState<Map<string, any>>(new Map());
  const [connectionValues, setConnectionValues] = useState<Record<string, any>>({});
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [filteredNodeTypes, setFilteredNodeTypes] = useState<Set<string>>(new Set());
  const [availableNodeTypes, setAvailableNodeTypes] = useState<string[]>([]);
  
  const { fitView } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setInspectorVisible(true);
  }, []);

  const onPaneClick = useCallback(() => {
    // Don't clear selection when clicking on pane - keep inspector persistent
  }, []);

  const toggleInspector = useCallback(() => {
    setInspectorVisible(!inspectorVisible);
  }, [inspectorVisible]);

  // Handle Electron file selection
  useEffect(() => {
    if (window.electronAPI) {
      const handleElectronFile = async (filePath: string) => {
        try {
          const response = await fetch(`file://${filePath}`);
          const text = await response.text();
          const data = JSON.parse(text);
          await loadGraph(data);
        } catch (err) {
          const errorMessage = `Error loading file: ${(err as Error).message}`;
          console.error(errorMessage, err);
          setError(errorMessage);
        }
      };

      window.electronAPI.onFileSelected(handleElectronFile);

      return () => {
        window.electronAPI?.removeAllListeners('file-selected');
      };
    }
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file);
  };

  const processFile = async (file: File) => {
    setError(null);
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        console.log('Loaded JSON data:', data);
        await loadGraph(data);
      } catch (err) {
        const errorMessage = `Error processing file: ${(err as Error).message}`;
        console.error(errorMessage, err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const loadGraph = async (graphData: any): Promise<void> => {
    try {
      // Clear everything first
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      
      const nodesInit = graphData?.Data?.RootChunk?.nodesToInit;
      if (!nodesInit) {
        throw new Error("Invalid AnimGraph JSON: 'nodesToInit' not found.");
      }
      
      // Step 1 & 2: Extract all unique nodes and connections
      const { nodeRegistry, nodeDataMap, connections } = extractAllNodesAndConnections(nodesInit);
      setNodeRegistry(nodeRegistry);
      setConnectionValues({}); // connectionValues not implemented but reserved for inspector
      
      console.log(`Found ${nodeRegistry.size} unique nodes`);
      console.log(`Found ${connections.length} connections`);
      
      // Step 3: Create visual nodes
      const visualNodes = createVisualNodes(nodeRegistry, nodeDataMap);
      
      // Step 4: Create visual edges
      const visualEdges = createVisualEdges(connections);
      
      // Set everything
      setNodes(visualNodes);
      setEdges(visualEdges);
      
      // Extract unique node types for filtering
      const nodeTypes = Array.from(new Set(visualNodes.map(node => node.data.nodeType))).sort();
      setAvailableNodeTypes(nodeTypes);
      setFilteredNodeTypes(new Set()); // Reset filter
      
      console.log(`Created ${visualNodes.length} visual nodes and ${visualEdges.length} edges`);
      
      // Auto-arrange layout
      setTimeout(() => {
        handleArrange();
      }, 100);
      
    } catch (e) {
      console.error("Error during graph data loading:", e);
      throw e;
    }
  };

  const createVisualNodes = (nodeRegistry: Map<string, any>, _nodeDataMap: Map<string, any>): Node[] => {
    const visualNodes: Node[] = [];
    let nodeIndex = 0;
    
    for (const [nodeId, nodeData] of nodeRegistry) {
      const nodeType = nodeData.$type || 'Unknown';
      const cleanType = nodeType.replace('animAnimNode_', '');
      const color = getColor(cleanType);
      
      // Get input sockets for this node type
      const inputSockets = getInputSocketsForNodeType(cleanType, nodeData);
      
      // Create label
      let label = cleanType;
      if (nodeType === 'animAnimNode_State' && nodeData.name) {
        const stateName = typeof nodeData.name === 'object' ? nodeData.name.$value : nodeData.name;
        label = `State: ${stateName}`;
      }
      
      const position = {
        x: (nodeIndex % 5) * 450,
        y: Math.floor(nodeIndex / 5) * 300
      };
      nodeIndex++;
      
      const visualNode: Node = {
        id: nodeId,
        type: 'animNode',
        position,
        data: {
          label,
          nodeType: cleanType,
          color,
          inputSockets,
          fullNodeData: nodeData
        }
      };
      
      visualNodes.push(visualNode);
    }
    
    return visualNodes;
  };

  const getInputSocketsForNodeType = (nodeType: string, nodeData: any): string[] => {
    const sockets: string[] = [];
    
    switch (nodeType) {
      case 'Root':
        sockets.push('outputNode');
        break;
      case 'Output':
        sockets.push('node');
        break;
      case 'Blend2':
        sockets.push('firstInputNode', 'secondInputNode', 'weightNode');
        break;
      case 'BlendAdditive':
        sockets.push('inputNode', 'addedInputNode', 'weightNode');
        break;
      case 'BlendOverride':
        sockets.push('inputNode', 'overrideInputNode', 'weightNode');
        break;
      case 'BlendMultiple':
        sockets.push('weightNode');
        if (nodeData.inputNodes && Array.isArray(nodeData.inputNodes)) {
          nodeData.inputNodes.forEach((_: any, index: number) => {
            sockets.push(`inputNodes[${index}]`);
          });
        }
        break;
      case 'Switch':
        sockets.push('weightNode');
        if (nodeData.inputNodes && Array.isArray(nodeData.inputNodes)) {
          nodeData.inputNodes.forEach((_: any, index: number) => {
            sockets.push(`inputNodes[${index}]`);
          });
        }
        break;
      case 'StateMachine':
        if (nodeData.states && Array.isArray(nodeData.states)) {
          nodeData.states.forEach((_: any, index: number) => {
            sockets.push(`states[${index}]`);
          });
        }
        if (nodeData.transitions && Array.isArray(nodeData.transitions)) {
          nodeData.transitions.forEach((_: any, index: number) => {
            sockets.push(`transitions[${index}]`);
          });
        }
        break;
      default:
        sockets.push('inputLink');
        break;
    }
    
    return sockets;
  };

  const createVisualEdges = (connections: Array<{source: string, target: string, socket: string}>): Edge[] => {
    const edges: Edge[] = [];
    
    connections.forEach((connection, index) => {
      const edge: Edge = {
        id: `edge-${index}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: 'output',
        targetHandle: connection.socket,
        type: 'smoothstep',
        style: { stroke: '#ff6b6b', strokeWidth: 3 },
      };
      edges.push(edge);
    });
    
    return edges;
  };

  const handleArrange = useCallback(async () => {
    if (nodes.length === 0) return;
    
    try {
      console.log('Arranging layout for', nodes.length, 'nodes');
      
      let layoutedNodes: Node[];
      try {
        layoutedNodes = await arrangeLayout(nodes, edges);
        
        const hasValidPositions = layoutedNodes.every(node => 
          node.position && 
          typeof node.position.x === 'number' && 
          typeof node.position.y === 'number' &&
          !isNaN(node.position.x) && 
          !isNaN(node.position.y)
        );
        
        if (!hasValidPositions) {
          throw new Error('Invalid positions from dagre layout');
        }
        
      } catch (layoutError) {
        console.warn('Dagre layout failed, using grid layout:', layoutError);
        layoutedNodes = simpleGridLayout(nodes);
      }
      
      setNodes(layoutedNodes);
      
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 });
      }, 300);
      
      console.log('Layout arrangement completed');
    } catch (err) {
      console.error('Error arranging layout:', err);
      setError(`Error arranging layout: ${(err as Error).message}`);
    }
  }, [nodes, edges, setNodes, fitView]);

  const handleSearchById = useCallback((handleId: string) => {
    const targetNode = nodes.find(node => node.id === handleId);
    if (targetNode) {
      fitView({ nodes: [targetNode], padding: 0.3, duration: 800, maxZoom: 1.2 });
      setSelectedNode(targetNode);
      setInspectorVisible(true);
    } else {
      setError(`Node with HandleID "${handleId}" not found`);
      setTimeout(() => setError(null), 3000);
    }
  }, [nodes, fitView]);

  const handleTypeFilter = useCallback((selectedTypes: string[]) => {
    setFilteredNodeTypes(selectedTypes.length === 0 ? new Set() : new Set(selectedTypes));
  }, []);

  const displayNodes = filteredNodeTypes.size > 0 
    ? nodes.filter(node => filteredNodeTypes.has(node.data.nodeType))
    : nodes;

  const displayEdges = filteredNodeTypes.size > 0
    ? edges.filter(edge => {
        const sourceVisible = displayNodes.some(node => node.id === edge.source);
        const targetVisible = displayNodes.some(node => node.id === edge.target);
        return sourceVisible && targetVisible;
      })
    : edges;

  return (
    <div className="app-container">
      <div className="header">
        <h1>AnimGraph Inspector</h1>
        <input 
          type="file" 
          id="file-input" 
          accept=".json, .animgraph.json" 
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <button 
          className="arrange-button" 
          onClick={handleArrange} 
          disabled={isLoading || nodes.length === 0}
        >
          Arrange Nodes
        </button>
        <button 
          className={`inspector-toggle ${inspectorVisible ? 'active' : ''}`}
          onClick={toggleInspector}
          title={inspectorVisible ? 'Hide Inspector' : 'Show Inspector'}
        >
          {inspectorVisible ? '📋 Hide Inspector' : '📋 Show Inspector'}
        </button>
        {nodes.length > 0 && (
          <span className="node-count">
            Nodes: {displayNodes.length}/{nodes.length} | Edges: {displayEdges.length}/{edges.length}
          </span>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="loading-message">
          Loading graph...
        </div>
      )}
      
      <div className="main-content">
        <div className="flow-container">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          >
            <Controls />
            <MiniMap 
              nodeColor={(node) => node.data?.color || '#ccc'}
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>
        
        {inspectorVisible && (
          <NodeInspector
            selectedNode={selectedNode}
            nodeRegistry={nodeRegistry}
            connectionValues={connectionValues}
            onClose={() => setInspectorVisible(false)}
            onSearchById={handleSearchById}
            onTypeFilter={handleTypeFilter}
            availableNodeTypes={availableNodeTypes}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowComponent />
    </ReactFlowProvider>
  );
}
