import dagre from 'dagre';
import { Node, Edge } from 'reactflow';

export async function arrangeLayout(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Configure the layout with better spacing
  dagreGraph.setGraph({ 
    rankdir: 'LR', // Left to Right
    nodesep: 100,  // Horizontal spacing between nodes in same rank
    ranksep: 300,  // Vertical spacing between ranks (levels)
    marginx: 100,
    marginy: 100,
    align: 'UL'    // Align to upper left
  });

  // Calculate actual node dimensions based on content
  const getNodeDimensions = (node: Node) => {
    const baseWidth = 450;
    const baseHeight = 180;
    
    // Count socket properties and regular properties
    const nodeData = node.data.nodeData || {};
    let socketPropertyCount = 0;
    let regularPropertyCount = 0;
    
    for (const [key, value] of Object.entries(nodeData)) {
      if (key.startsWith('$') || key === 'HandleId') continue;
      
      if (isNodeReference(value)) {
        socketPropertyCount++;
      } else {
        regularPropertyCount++;
      }
    }
    
    // Calculate height based on content
    const socketPropertiesHeight = socketPropertyCount > 0 ? (socketPropertyCount * 44 + 40) : 0; // 44px per property + section header
    const regularPropertiesHeight = regularPropertyCount > 0 ? (regularPropertyCount * 44 + 40) : 0; // 44px per property + section header
    const outputSectionHeight = 60; // Output section
    
    const totalHeight = baseHeight + socketPropertiesHeight + regularPropertiesHeight + outputSectionHeight;
    const width = Math.max(baseWidth, Math.min(700, baseWidth + Math.max(socketPropertyCount, regularPropertyCount) * 20));
    
    return { width, height: totalHeight };
  };

  function isNodeReference(value: any): boolean {
    return (
      typeof value === 'object' && 
      value !== null && 
      'node' in value && 
      value.node &&
      (value.node.HandleId || value.node.HandleRefId)
    );
  }

  // Separate connected and disconnected nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id));
  const disconnectedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));

  // Layout connected nodes with dagre
  const layoutedConnectedNodes: Node[] = [];
  
  if (connectedNodes.length > 0) {
    // Add connected nodes to dagre graph
    connectedNodes.forEach((node) => {
      const dimensions = getNodeDimensions(node);
      dagreGraph.setNode(node.id, dimensions);
    });

    // Add edges to dagre graph
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate layout for connected nodes
    dagre.layout(dagreGraph);

    // Apply positions to connected nodes
    connectedNodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      
      if (nodeWithPosition) {
        layoutedConnectedNodes.push({
          ...node,
          position: {
            x: nodeWithPosition.x - nodeWithPosition.width / 2,
            y: nodeWithPosition.y - nodeWithPosition.height / 2,
          },
        });
      } else {
        layoutedConnectedNodes.push({
          ...node,
          position: { x: 0, y: 0 }
        });
      }
    });
  }

  // Layout disconnected nodes in a separate area
  const layoutedDisconnectedNodes: Node[] = [];
  
  if (disconnectedNodes.length > 0) {
    // Find the bounds of connected nodes to position disconnected nodes separately
    let maxX = 0;
    let maxY = 0;
    
    if (layoutedConnectedNodes.length > 0) {
      layoutedConnectedNodes.forEach(node => {
        const dimensions = getNodeDimensions(node);
        maxX = Math.max(maxX, node.position.x + dimensions.width);
        maxY = Math.max(maxY, node.position.y + dimensions.height);
      });
    }
    
    // Position disconnected nodes in a grid to the right of connected nodes
    const startX = maxX + 400; // Gap from connected nodes
    const startY = 0;
    const cols = Math.ceil(Math.sqrt(disconnectedNodes.length));
    const nodeSpacing = 500;
    
    disconnectedNodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      layoutedDisconnectedNodes.push({
        ...node,
        position: {
          x: startX + (col * nodeSpacing),
          y: startY + (row * nodeSpacing),
        },
      });
    });
  }

  const allLayoutedNodes = [...layoutedConnectedNodes, ...layoutedDisconnectedNodes];
  
  console.log(`Layout completed: ${layoutedConnectedNodes.length} connected nodes, ${layoutedDisconnectedNodes.length} disconnected nodes`);
  return allLayoutedNodes;
}

// Alternative simple grid layout as fallback
export function simpleGridLayout(nodes: Node[]): Node[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const nodeWidth = 450;
  const nodeHeight = 180;
  const spacing = 200;
  
  return nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    return {
      ...node,
      position: {
        x: col * (nodeWidth + spacing),
        y: row * (nodeHeight + spacing),
      },
    };
  });
}