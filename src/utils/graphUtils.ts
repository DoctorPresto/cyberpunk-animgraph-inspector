export interface NodeInfo {
  id: string;
  data: any;
}

export interface Connection {
  source: string;
  target: string;
  socket: string;
}

/**
 * Extract all unique nodes by HandleId from the JSON structure
 */
export function extractAllNodes(nodesToInit: any[]): {
  nodeRegistry: Map<string, any>;
  nodeDataMap: Map<string, any>;
} {
  const nodeRegistry = new Map<string, any>();
  const nodeDataMap = new Map<string, any>();
  
  const processNode = (nodeEntry: any) => {
    if (!nodeEntry || typeof nodeEntry !== 'object') return;
    
    if (nodeEntry.HandleId && nodeEntry.Data) {
      const handleId = nodeEntry.HandleId;
      const nodeData = nodeEntry.Data;
      
      // Store in registry
      nodeRegistry.set(handleId, nodeData);
      nodeDataMap.set(handleId, nodeData);
      
      console.log(`Registered node: ${handleId} (${nodeData.$type || 'Unknown'})`);
      
      // Recursively process nested nodes
      traverseForNodes(nodeData, processNode);
    }
  };
  
  // Process all top-level nodes
  nodesToInit.forEach(processNode);
  
  return { nodeRegistry, nodeDataMap };
}

/**
 * Recursively traverse an object looking for nested nodes
 */
function traverseForNodes(obj: any, processNode: (node: any) => void) {
  if (!obj || typeof obj !== 'object') return;
  
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (item && typeof item === 'object' && (item as any).HandleId && (item as any).Data) {
        processNode(item);
      } else {
        traverseForNodes(item, processNode);
      }
    });
  } else {
    for (const [, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        if ((value as any).HandleId && (value as any).Data) {
          processNode(value);
        } else {
          traverseForNodes(value, processNode);
        }
      }
    }
  }
}

/**
 * Extract all connections between nodes based on HandleId and HandleRefId references
 */
export function extractAllConnections(nodeRegistry: Map<string, any>): {
  connections: Connection[];
  connectionValues: Record<string, any>;
} {
  const connections: Connection[] = [];
  const connectionValues: Record<string, any> = {};
  
  for (const [nodeId, nodeData] of nodeRegistry) {
    const nodeConnections = extractNodeConnections(nodeData, nodeId, nodeRegistry);
    connections.push(...nodeConnections);
    
    // Build connection values map
    nodeConnections.forEach(conn => {
      const connectionKey = `${conn.target}-${conn.socket}`;
      const sourceNodeData = nodeRegistry.get(conn.source);
      if (sourceNodeData) {
        connectionValues[connectionKey] = extractOutputValue(sourceNodeData);
      }
    });
  }
  
  console.log(`Extracted ${connections.length} total connections`);
  return { connections, connectionValues };
}

/**
 * Extract connections for a single node
 */
function extractNodeConnections(nodeData: any, nodeId: string, nodeRegistry: Map<string, any>): Connection[] {
  const connections: Connection[] = [];
  
  const findConnections = (obj: any, path: string[] = []) => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      
      if (value && typeof value === 'object') {
        // Pattern 1: Direct HandleRefId reference
        if ((value as any).HandleRefId) {
          const sourceId = (value as any).HandleRefId;
          if (nodeRegistry.has(sourceId)) {
            connections.push({
              source: sourceId,
              target: nodeId,
              socket: key
            });
            console.log(`HandleRefId connection: ${sourceId} -> ${nodeId} via ${key}`);
          }
        }
        // Pattern 2: Direct HandleId reference (for nested node definitions)
        else if ((value as any).HandleId && nodeRegistry.has((value as any).HandleId)) {
          const sourceId = (value as any).HandleId;
          connections.push({
            source: sourceId,
            target: nodeId,
            socket: key
          });
          console.log(`HandleId connection: ${sourceId} -> ${nodeId} via ${key}`);
        }
        // Pattern 3: Nested node reference pattern: { node: { HandleId: "..." } }
        else if ((value as any).node && typeof (value as any).node === 'object') {
          if ((value as any).node.HandleRefId) {
            const sourceId = (value as any).node.HandleRefId;
            if (nodeRegistry.has(sourceId)) {
              connections.push({
                source: sourceId,
                target: nodeId,
                socket: key
              });
              console.log(`Nested HandleRefId connection: ${sourceId} -> ${nodeId} via ${key}`);
            }
          } else if ((value as any).node.HandleId && nodeRegistry.has((value as any).node.HandleId)) {
            const sourceId = (value as any).node.HandleId;
            connections.push({
              source: sourceId,
              target: nodeId,
              socket: key
            });
            console.log(`Nested HandleId connection: ${sourceId} -> ${nodeId} via ${key}`);
          }
        }
        // Pattern 4: Array of connections
        else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item && typeof item === 'object') {
              if ((item as any).HandleRefId) {
                const sourceId = (item as any).HandleRefId;
                if (nodeRegistry.has(sourceId)) {
                  connections.push({
                    source: sourceId,
                    target: nodeId,
                    socket: `${key}[${index}]`
                  });
                  console.log(`Array HandleRefId connection: ${sourceId} -> ${nodeId} via ${key}[${index}]`);
                }
              } else if ((item as any).HandleId && nodeRegistry.has((item as any).HandleId)) {
                const sourceId = (item as any).HandleId;
                connections.push({
                  source: sourceId,
                  target: nodeId,
                  socket: `${key}[${index}]`
                });
                console.log(`Array HandleId connection: ${sourceId} -> ${nodeId} via ${key}[${index}]`);
              } else if ((item as any).node && typeof (item as any).node === 'object') {
                if ((item as any).node.HandleRefId) {
                  const sourceId = (item as any).node.HandleRefId;
                  if (nodeRegistry.has(sourceId)) {
                    connections.push({
                      source: sourceId,
                      target: nodeId,
                      socket: `${key}[${index}]`
                    });
                    console.log(`Array nested HandleRefId connection: ${sourceId} -> ${nodeId} via ${key}[${index}]`);
                  }
                } else if ((item as any).node.HandleId && nodeRegistry.has((item as any).node.HandleId)) {
                  const sourceId = (item as any).node.HandleId;
                  connections.push({
                    source: sourceId,
                    target: nodeId,
                    socket: `${key}[${index}]`
                  });
                  console.log(`Array nested HandleId connection: ${sourceId} -> ${nodeId} via ${key}[${index}]`);
                }
              }
            }
          });
        }
        // Recursively search deeper
        else {
          findConnections(value, currentPath);
        }
      }
    }
  };
  
  findConnections(nodeData);
  return connections;
}

/**
 * Extract the output value from a node for display in connected properties
 */
function extractOutputValue(nodeData: any): any {
  if (!nodeData || typeof nodeData !== 'object') {
    return null;
  }

  const nodeType = nodeData.$type || '';

  // Extract meaningful output values based on node type
  switch (nodeType) {
    case 'animAnimNode_FloatConstant':
      return { type: 'float', value: nodeData.value };
    
    case 'animAnimNode_BoolConstant':
      return { type: 'bool', value: nodeData.value };
    
    case 'animAnimNode_IntConstant':
      return { type: 'int', value: nodeData.value };
    
    case 'animAnimNode_VectorConstant':
      return { type: 'vector', value: nodeData.value };
    
    case 'animAnimNode_FloatInput':
      const floatInputName = nodeData.name && nodeData.name.$value ? nodeData.name.$value : nodeData.name;
      return { type: 'float', value: `Input: ${floatInputName || 'Unknown'}` };
    
    case 'animAnimNode_BoolInput':
      const boolInputName = nodeData.name && nodeData.name.$value ? nodeData.name.$value : nodeData.name;
      return { type: 'bool', value: `Input: ${boolInputName || 'Unknown'}` };
    
    case 'animAnimNode_SkAnim':
      const animName = nodeData.animation && nodeData.animation.$value ? nodeData.animation.$value : nodeData.animation;
      return { type: 'pose', value: `Animation: ${animName || 'Unknown'}` };
    
    case 'animAnimNode_FloatVariable':
      const floatVarName = nodeData.variableName && nodeData.variableName.$value ? nodeData.variableName.$value : nodeData.variableName;
      return { type: 'float', value: `Variable: ${floatVarName || 'Unknown'}` };
    
    case 'animAnimNode_State':
      const stateName = nodeData.name && nodeData.name.$value ? nodeData.name.$value : nodeData.name;
      return { type: 'pose', value: `State: ${stateName || 'Unknown'}` };
    
    case 'animAnimNode_StateMachine':
      return { type: 'pose', value: 'State Machine Output' };
    
    default:
      // For pose nodes, return pose type
      if (nodeType.includes('Blend') || nodeType.includes('Mix') || nodeType.includes('State')) {
        return { type: 'pose', value: 'Pose Output' };
      }
      // For value nodes, try to determine type from name
      if (nodeType.includes('Float')) {
        return { type: 'float', value: 'Float Output' };
      }
      if (nodeType.includes('Bool')) {
        return { type: 'bool', value: 'Bool Output' };
      }
      
      return { type: 'unknown', value: 'Output' };
  }
}

// Color mapping for different node types
export const COLOR_MAP: Record<string, string> = {
  "Root": "#e74c3c",
  "Output": "#e67e22", 
  "SkAnim": "#3498db",
  "MixerSlot": "#9b59b6", 
  "SharedMetaPose": "#1abc9c",
  "FacialSharedMetaPose": "#16a085",
  "FacialMixerSlot": "#8e44ad",
  "ReferencePoseTerminator": "#95a5a6", 
  "IdentityPoseTerminator": "#7f8c8d",
  "StateMachine": "#f39c12",
  "State": "#f1c40f", 
  "BlendFromPose": "#2ecc71",
  "BlendAdditive": "#27ae60",
  "BlendOverride": "#2980b9",
  "FloatConstant": "#e74c3c", 
  "FloatInput": "#c0392b",
  "FloatRandom": "#d35400",
  "BoolConstant": "#8e44ad",
  "BoolInput": "#9b59b6",
  "BoolToFloatConverter": "#a569bd",
  "IntConstant": "#d35400",
  "Blend2": "#27ae60",
  "Switch": "#34495e",
  "GraphSlot": "#2c3e50",
  "Default": "#7f8c8d"
};

export const getColor = (nodeType: string): string => COLOR_MAP[nodeType] || COLOR_MAP["Default"];