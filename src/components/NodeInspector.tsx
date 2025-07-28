import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node } from 'reactflow';
import { SearchControls } from './SearchControls';

// Helper function to get connected node information
function getConnectedNodeInfo(nodeId: string, nodeRegistry: Map<string, any>) {
  const nodeData = nodeRegistry.get(nodeId);
  if (!nodeData) return { name: 'Unknown Node', type: 'Unknown' };
  
  const nodeType = nodeData.$type ? nodeData.$type.replace('animAnimNode_', '') : 'Unknown';
  
  // Try to get a meaningful name for the node
  let nodeName = nodeType;
  
  // For State nodes, use the state name
  if (nodeData.name) {
    const name = nodeData.name.$value || nodeData.name;
    if (name && name !== 'None') {
      nodeName = `${nodeType}: ${name}`;
    }
  }
  
  // For animation nodes, use the animation name
  if (nodeData.animation) {
    const animName = nodeData.animation.$value || nodeData.animation;
    if (animName && animName !== 'None') {
      nodeName = `${nodeType}: ${animName}`;
    }
  }
  
  return { name: nodeName, type: nodeType };
}

interface NodeInspectorProps {
  selectedNode: Node | null;
  nodeRegistry: Map<string, any>;
  connectionValues: Record<string, any>;
  onClose: () => void;
  onSearchById: (handleId: string) => void;
  onTypeFilter: (selectedTypes: string[]) => void;
  availableNodeTypes: string[];
  isLoading: boolean;
}

interface PropertyDisplayProps {
  propertyKey: string;
  propertyValue: any;
  isConnection: boolean;
  connectedValue?: any;
  connectedNodeId?: string | null;
  nodeRegistry: Map<string, any>;
  onJumpToNode?: (nodeId: string) => void;
  parentPath?: string;
}

function PropertyDisplay({ 
  propertyKey, 
  propertyValue, 
  isConnection, 
  connectedValue, 
  connectedNodeId,
  nodeRegistry,
  onJumpToNode,
  parentPath = ''
}: PropertyDisplayProps) {
  const currentPath = parentPath ? `${parentPath}.${propertyKey}` : propertyKey;
  const [collapsedArrays, setCollapsedArrays] = useState<Set<string>>(new Set());

  const toggleArrayCollapse = useCallback((path: string) => {
    setCollapsedArrays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "null";
    }
    
    // Handle special value objects - extract $value if present
    if (typeof value === 'object' && value.$value !== undefined) {
      return String(value.$value);
    }
    
    return String(value);
  };

  const shouldShowProperty = (key: string): boolean => {
    // Skip internal properties
    if (key.startsWith('$')) {
      return false;
    }
    
    // Skip properties that are purely structural/internal
    if (key === 'HandleId' || key === 'id') {
      return false;
    }
    
    return true;
  };

  const isNestedObject = (value: any): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    
    // Don't treat connection objects as nested objects
    if (value.HandleRefId || value.HandleId || (value.node && (value.node.HandleRefId || value.node.HandleId))) {
      return false;
    }
    
    // Check if it has meaningful nested properties (excluding $type and other internal props)
    const meaningfulKeys = Object.keys(value).filter(shouldShowProperty);
    return meaningfulKeys.length > 0;
  };

  const isNestedArray = (value: any): boolean => {
    return Array.isArray(value) && value.length > 0;
  };

  const isCollapsibleObject = (value: any): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    
    // Don't treat simple value objects as collapsible
    if (value.$value !== undefined && Object.keys(value).length <= 2) {
      return false;
    }
    
    // Check if it has meaningful nested properties
    const meaningfulKeys = Object.keys(value).filter(shouldShowProperty);
    return meaningfulKeys.length > 0;
  };


  const getNodeIdFromReference = (value: any): string | null => {
    if (!value || typeof value !== 'object') return null;
    
    if (value.HandleRefId) return value.HandleRefId;
    if (value.HandleId) return value.HandleId;
    if (value.node && typeof value.node === 'object') {
      return (value.node as any).HandleRefId || (value.node as any).HandleId || null;
    }
    
    return null;
  };
  const getConnectedNodeInfo = (nodeId: string) => {
    const nodeData = nodeRegistry.get(nodeId);
    if (!nodeData) return { name: 'Unknown Node', type: 'Unknown' };
    
    const nodeType = nodeData.$type ? nodeData.$type.replace('animAnimNode_', '') : 'Unknown';
    
    // Try to get a meaningful name for the node
    let nodeName = nodeType;
    
    // For State nodes, use the state name
    if (nodeData.name) {
      const name = nodeData.name.$value || nodeData.name;
      if (name && name !== 'None') {
        nodeName = `${nodeType}: ${name}`;
      }
    }
    
    // For animation nodes, use the animation name
    if (nodeData.animation) {
      const animName = nodeData.animation.$value || nodeData.animation;
      if (animName && animName !== 'None') {
        nodeName = `${nodeType}: ${animName}`;
      }
    }
    
    return { name: nodeName, type: nodeType };
  };

  const handleJumpToNode = (nodeId: string) => {
    if (onJumpToNode) {
      onJumpToNode(nodeId);
    }
  };

  const getAllConnectedNodeIds = (value: any): string[] => {
    const nodeIds: string[] = [];
    
    if (typeof value === 'object' && value !== null) {
      if (value.HandleRefId) {
        nodeIds.push(value.HandleRefId);
      }
      if (value.HandleId) {
        nodeIds.push(value.HandleId);
      }
      if (value.node && (value.node.HandleRefId || value.node.HandleId)) {
        nodeIds.push(value.node.HandleRefId || value.node.HandleId);
      }
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item && typeof item === 'object') {
            if (item.HandleRefId) nodeIds.push(item.HandleRefId);
            if (item.HandleId) nodeIds.push(item.HandleId);
            if (item.node && (item.node.HandleRefId || item.node.HandleId)) {
              nodeIds.push(item.node.HandleRefId || item.node.HandleId);
            }
          }
        });
      }
    }
    
    return nodeIds.filter(id => nodeRegistry.has(id));
  };
  
  const renderNestedProperties = (obj: any, parentKey: string, currentDepth: number, basePath: string = ''): JSX.Element => {
    if (currentDepth > 5) {
      // Prevent infinite recursion
      return <span className="nested-direct-value">[Max depth reached]</span>;
    }

    if (isNestedArray(obj)) {
      const arrayPath = basePath ? `${basePath}.${parentKey}` : parentKey;
      const isCollapsed = collapsedArrays.has(arrayPath);
      
      return (
        <div className="nested-array" style={{ marginLeft: `${Math.min(currentDepth * 15, 60)}px` }}>
          <div className="array-header">
            <button 
              className="array-collapse-button"
              onClick={() => toggleArrayCollapse(arrayPath)}
              title={isCollapsed ? 'Expand array' : 'Collapse array'}
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          </div>
          {!isCollapsed && obj.map((item: any, index: number) => {
            // Check if this item is a node reference
            const nodeId = getNodeIdFromReference(item);
            const isNodeRef = nodeId && nodeRegistry.has(nodeId);
            
            if (isNodeRef) {
              const nodeInfo = getConnectedNodeInfo(nodeId);
              return (
                <div key={`${parentKey}-${index}`} className="nested-property-item connected">
                  <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                    [{index}]:
                  </div>
                  <div className="nested-property-value">
                    <div className="connection-info">
                      <span className="connected-label">Connected Node:</span>
                      <div className="connected-data">
                        <div className="connected-node-header">
                          <div className="connected-node-name">{nodeInfo.name}</div>
                          <div className="connected-node-id">ID: {nodeId}</div>
                          <button 
                            className="jump-to-node-button"
                            onClick={() => handleJumpToNode(nodeId)}
                            title={`Jump to node ${nodeId}`}
                          >
                            🔗 Jump
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            // For primitive values in arrays
            else if (typeof item !== 'object' || item === null) {
              return (
                <div key={`${parentKey}-${index}`} className="nested-property-item">
                  <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                    [{index}]:
                  </div>
                  <div className="nested-property-value">
                    <span className="nested-direct-value">{formatValue(item)}</span>
                  </div>
                </div>
              );
            }

            // For objects in arrays
            const needsNesting = isNestedObject(item) || isNestedArray(item) || isCollapsibleObject(item);
            
            if (needsNesting) {
              return (
                <div key={`${parentKey}-${index}`} className="nested-array-item">
                  <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                    [{index}]:
                  </div>
                  <div className="nested-property-value">
                    {renderNestedProperties(item, `${parentKey}-${index}`, currentDepth + 1, arrayPath)}
                  </div>
                </div>
              );
            } else {
              // Object with no meaningful properties, show its $value if available
              const displayValue = item.$value !== undefined ? item.$value : formatValue(item);
              return (
                <div key={`${parentKey}-${index}`} className="nested-property-item">
                  <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                    [{index}]:
                  </div>
                  <div className="nested-property-value">
                    <span className="nested-direct-value">{displayValue}</span>
                  </div>
                </div>
              );
            }
          })}
        </div>
      );
    }

    // Handle collapsible objects (dictionaries)
    if (isCollapsibleObject(obj)) {
      const objectPath = basePath ? `${basePath}.${parentKey}` : parentKey;
      const isCollapsed = collapsedArrays.has(objectPath);
      
      const properties = [];
      for (const [key, value] of Object.entries(obj)) {
        if (shouldShowProperty(key)) {
          properties.push({ key, value });
        }
      }
      
      return (
        <div className="nested-object-collapsible" style={{ marginLeft: `${Math.min(currentDepth * 15, 60)}px` }}>
          <div className="array-header">
            <button 
              className="array-collapse-button"
              onClick={() => toggleArrayCollapse(objectPath)}
              title={isCollapsed ? 'Expand object' : 'Collapse object'}
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          </div>
          {!isCollapsed && (
            <div className="nested-properties" style={{ marginLeft: `${Math.min(currentDepth * 15, 60)}px` }}>
              {properties.map(({ key, value }, index) => {
                const nodeId = getNodeIdFromReference(value);
                const isNodeRef = nodeId && nodeRegistry.has(nodeId);
                
                if (isNodeRef) {
                  const nodeInfo = getConnectedNodeInfo(nodeId);
                  return (
                    <div key={`${parentKey}-${key}-${index}`} className="nested-property-item connected">
                      <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                        {key}:
                      </div>
                      <div className="nested-property-value">
                        <div className="connection-info">
                          <span className="connected-label">Connected Node:</span>
                          <div className="connected-data">
                            <div className="connected-node-header">
                              <div className="connected-node-name">{nodeInfo.name}</div>
                              <div className="connected-node-id">ID: {nodeId}</div>
                              <button 
                                className="jump-to-node-button"
                                onClick={() => handleJumpToNode(nodeId)}
                                title={`Jump to node ${nodeId}`}
                              >
                                🔗 Jump
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Check if this value needs further nesting
                const needsNesting = (isNestedObject(value) || isNestedArray(value) || isCollapsibleObject(value)) && 
                                    !(typeof value === 'object' && value !== null && (value as any).$value !== undefined && Object.keys(value as object).filter(shouldShowProperty).length <= 1);
                
                return (
                  <div key={`${parentKey}-${key}-${index}`} className="nested-property-item">
                    <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                      {key}:
                    </div>
                    <div className="nested-property-value">
                      {needsNesting ? (
                        <div className="nested-object">
                          {renderNestedProperties(value, `${parentKey}-${key}`, currentDepth + 1, objectPath)}
                        </div>
                      ) : (
                        <span className="nested-direct-value">{formatValue(value)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    // Handle objects
    const properties = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (shouldShowProperty(key)) {
        properties.push({ key, value });
      }
    }
    
    if (properties.length === 0) {
      // If no meaningful properties, try to show $value
      if (obj.$value !== undefined) {
        return <span className="nested-direct-value">{String(obj.$value)}</span>;
      }
      return <span className="nested-direct-value">[No displayable properties]</span>;
    }
    
    return (
      <div className="nested-properties" style={{ marginLeft: `${Math.min(currentDepth * 15, 60)}px` }}>
        {properties.map(({ key, value }, index) => {
          const nodeId = getNodeIdFromReference(value);
          const isNodeRef = nodeId && nodeRegistry.has(nodeId);
          
          if (isNodeRef) {
            const nodeInfo = getConnectedNodeInfo(nodeId);
            return (
              <div key={`${parentKey}-${key}-${index}`} className="nested-property-item connected">
                <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                  {key}:
                </div>
                <div className="nested-property-value">
                  <div className="connection-info">
                    <span className="connected-label">Connected Node:</span>
                    <div className="connected-data">
                      <div className="connected-node-header">
                        <div className="connected-node-name">{nodeInfo.name}</div>
                        <div className="connected-node-id">ID: {nodeId}</div>
                        <button 
                          className="jump-to-node-button"
                          onClick={() => handleJumpToNode(nodeId)}
                          title={`Jump to node ${nodeId}`}
                        >
                          🔗 Jump
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          
          // Check if this value needs further nesting
          const needsNesting = (isNestedObject(value) || isNestedArray(value) || isCollapsibleObject(value)) && 
                              !(typeof value === 'object' && value !== null && (value as any).$value !== undefined && Object.keys(value as object).filter(shouldShowProperty).length <= 1);
          
          return (
            <div key={`${parentKey}-${key}-${index}`} className="nested-property-item">
              <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                {key}:
              </div>
              <div className="nested-property-value">
                {needsNesting ? (
                  <div className="nested-object">
                    {renderNestedProperties(value, `${parentKey}-${key}`, currentDepth + 1, basePath)}
                  </div>
                ) : (
                  <span className="nested-direct-value">{formatValue(value)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const isNestedObj = !isConnection && (isNestedObject(propertyValue) || isNestedArray(propertyValue) || isCollapsibleObject(propertyValue));

  return (
    <div className={`property-item ${isConnection ? 'connected' : ''} ${isNestedObj ? 'has-nested' : ''}`}>
      <div className="property-key">{propertyKey}:</div>
      <div className={`property-value ${isConnection ? 'connected-value' : ''}`}>
        {isConnection && connectedValue && connectedNodeId && (
          <div className="connection-info">
            <span className="connected-label">Connected to:</span>
            <div className="connected-data">
              <div className="connected-node-header">
                <div className="connected-node-name">{getConnectedNodeInfo(connectedNodeId).name}</div>
                <div className="connected-node-id">ID: {connectedNodeId}</div>
                <button 
                  className="jump-to-node-button"
                  onClick={() => handleJumpToNode(connectedNodeId)}
                  title={`Jump to node ${connectedNodeId}`}
                >
                  🔗 Jump
                </button>
              </div>
              <div className="connected-node-value">
                {connectedValue.value ? `Value: ${connectedValue.value}` : `Type: ${connectedValue.type || 'unknown'}`}
              </div>
            </div>
          </div>
        )}
        {isConnection && !connectedValue && (
          <div className="connection-info">
            <span className="unconnected-label">Socket connections:</span>
            {(() => {
              const allConnectedIds = getAllConnectedNodeIds(propertyValue);
              if (allConnectedIds.length === 0) {
                return <div className="no-connections">No connections</div>;
              }
              return (
                <div className="multiple-connections">
                  {allConnectedIds.map((nodeId) => (
                    <div key={nodeId} className="connection-item">
                      <div className="connection-node-info">
                        <div className="connection-node-name">{getConnectedNodeInfo(nodeId).name}</div>
                        <div className="connection-node-id">ID: {nodeId}</div>
                      </div>
                      <button 
                        className="jump-to-node-button"
                        onClick={() => handleJumpToNode(nodeId)}
                        title={`Jump to node ${nodeId}`}
                      >
                        🔗 Jump
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
        {!isConnection && !isNestedObj && (
          <span className="direct-value">{formatValue(propertyValue)}</span>
        )}
        {!isConnection && isNestedObj && (
          <div className="nested-container">
            {renderNestedProperties(propertyValue, propertyKey, 0, currentPath)}
          </div>
        )}
      </div>
    </div>
  );
}

export function NodeInspector({ 
  selectedNode, 
  nodeRegistry,
  connectionValues,
  onClose,
  onSearchById,
  onTypeFilter,
  availableNodeTypes,
  isLoading
}: NodeInspectorProps) {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [size, setSize] = useState({ width: 400, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const inspectorRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start dragging if clicking on the header itself, not the buttons
    const target = e.target as HTMLElement;
    if (target.classList.contains('collapse-button') || 
        target.classList.contains('close-button') ||
        target.closest('.collapse-button') ||
        target.closest('.close-button')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const rect = inspectorRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep inspector within viewport bounds
    const maxX = window.innerWidth - 300; // min width of inspector
    const maxY = window.innerHeight - 200; // min height of inspector
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset]);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    const maxWidth = Math.min(800, window.innerWidth - position.x - 20);
    const maxHeight = Math.min(window.innerHeight * 0.9, window.innerHeight - position.y - 20);
    
    const newWidth = Math.max(300, Math.min(maxWidth, resizeStart.width + deltaX));
    const newHeight = Math.max(200, Math.min(maxHeight, resizeStart.height + deltaY));
    
    setSize({ width: newWidth, height: newHeight });
  }, [isResizing, resizeStart, position.y]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  }, [size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    } else if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection while resizing
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nw-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, isResizing, handleMouseMove, handleResizeMouseMove, handleMouseUp]);

  if (!selectedNode) {
    return (
      <div 
        ref={inspectorRef}
        className={`node-inspector floating ${isCollapsed ? 'collapsed' : ''}`}
        style={{ 
          left: position.x, 
          top: position.y,
          width: size.width,
          height: isCollapsed ? 'auto' : size.height
        }}
      >
        <div 
          className="inspector-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <h3>Node Inspector</h3>
          <div className="inspector-controls">
            <button 
              className="collapse-button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▲' : '▼'}
            </button>
            <button 
              className="close-button" 
              onClick={onClose}
              title="Close Inspector"
            >
              ×
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="inspector-content">
            <div className="inspector-search-section">
              <SearchControls
                onSearchById={onSearchById}
                onTypeFilter={onTypeFilter}
                availableNodeTypes={availableNodeTypes}
                isLoading={isLoading}
              />
            </div>
            
            <div className="no-selection">
              <p>Select a node to view its properties</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const nodeData = nodeRegistry.get(selectedNode.id);
  
  if (!nodeData) {
    return (
      <div 
        ref={inspectorRef}
        className={`node-inspector floating ${isCollapsed ? 'collapsed' : ''}`}
        style={{ 
          left: position.x, 
          top: position.y,
          width: size.width,
          height: isCollapsed ? 'auto' : size.height
        }}
      >
        <div 
          className="inspector-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <h3>Node Inspector</h3>
          <div className="inspector-controls">
            <button 
              className="collapse-button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▲' : '▼'}
            </button>
            <button 
              className="close-button" 
              onClick={onClose}
              title="Close Inspector"
            >
              ×
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="inspector-content">
            <div className="inspector-search-section">
              <SearchControls
                onSearchById={onSearchById}
                onTypeFilter={onTypeFilter}
                availableNodeTypes={availableNodeTypes}
                isLoading={isLoading}
              />
            </div>
            
            <div className="error">
              <p>Node data not found</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const getConnectedValue = (propertyName: string): any => {
    const connectionKey = `${selectedNode.id}-${propertyName}`;
    return connectionValues[connectionKey];
  };

  const getConnectedNodeId = (_propertyName: string, value: any): string | null => {
    // Extract the connected node ID from the property value
    if (typeof value === 'object' && value !== null) {
      if (value.HandleRefId) {
        return value.HandleRefId;
      }
      if (value.HandleId) {
        return value.HandleId;
      }
      if (value.node && (value.node.HandleRefId || value.node.HandleId)) {
        return value.node.HandleRefId || value.node.HandleId;
      }
      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0];
        if (firstItem && typeof firstItem === 'object') {
          return firstItem.HandleRefId || firstItem.HandleId || 
                 (firstItem.node && (firstItem.node.HandleRefId || firstItem.node.HandleId));
        }
      }
    }
    return null;
  };

  const isConnectionProperty = (_propertyName: string, value: any): boolean => {
    // Check if this property represents a connection to another node
    if (typeof value === 'object' && value !== null) {
      if (value.HandleRefId || value.HandleId) {
        return true;
      }
      if (value.node && (value.node.HandleRefId || value.node.HandleId)) {
        return true;
      }
      if (Array.isArray(value)) {
        return value.some(item => 
          item && typeof item === 'object' && (item.HandleRefId || item.HandleId)
        );
      }
    }
    return false;
  };

  const shouldShowProperty = (key: string, _value: any): boolean => {
    // Skip internal properties
    if (key.startsWith('$')) {
      return false;
    }
    
    // Skip properties that are purely structural/internal
    if (key === 'HandleId' || key === 'id') {
      return false;
    }
    
    return true;
  };

  const renderProperties = (nodeData: any) => {
    if (!nodeData || typeof nodeData !== 'object') {
      return <div className="no-properties">No properties available</div>;
    }

    const properties = [];
    for (const [key, value] of Object.entries(nodeData)) {
      if (shouldShowProperty(key, value)) {
        properties.push({ key, value });
      }
    }

    if (properties.length === 0) {
      return <div className="no-properties">No displayable properties</div>;
    }

    return (
      <div className="properties-list">
        {properties.map(({ key, value }) => {
          const isConnection = isConnectionProperty(key, value);
          const connectedValue = isConnection ? getConnectedValue(key) : undefined;
          const connectedNodeId = isConnection ? getConnectedNodeId(key, value) : undefined;

          return (
            <PropertyDisplay
              key={key}
              propertyKey={key}
              propertyValue={value}
              isConnection={isConnection}
              connectedValue={connectedValue}
              connectedNodeId={connectedNodeId || undefined}
              nodeRegistry={nodeRegistry}
              onJumpToNode={handleJumpToNode}
            />
          );
        })}
      </div>
    );
  };

  const handleJumpToNode = (nodeId: string) => {
    onSearchById(nodeId);
  };

  const renderOutputConnections = () => {
    if (!selectedNode) return null;

    // Find all nodes that have this node as an input
    const outputConnections: Array<{
      targetNodeId: string;
      targetNodeData: any;
      socketName: string;
    }> = [];

    // Search through all nodes to find connections TO this node
    for (const [nodeId, nodeData] of nodeRegistry) {
      if (nodeId === selectedNode.id) continue; // Skip self

      // Check all properties of this node for connections to our selected node
      const findConnectionsInObject = (obj: any, path: string[] = []) => {
        if (!obj || typeof obj !== 'object') return;

        for (const [key, value] of Object.entries(obj)) {
          const currentPath = [...path, key];
          
          if (typeof value === 'object' && value !== null) {
            // Direct HandleRefId reference
            if ((value as any).HandleRefId === selectedNode.id) {
              outputConnections.push({
                targetNodeId: nodeId,
                targetNodeData: nodeData,
                socketName: key
              });
            }
            // Direct HandleId reference
            else if ((value as any).HandleId === selectedNode.id) {
              outputConnections.push({
                targetNodeId: nodeId,
                targetNodeData: nodeData,
                socketName: key
              });
            }
            // Nested node reference pattern
            else if ((value as any).node && typeof (value as any).node === 'object') {
              if ((value as any).node.HandleRefId === selectedNode.id || (value as any).node.HandleId === selectedNode.id) {
                outputConnections.push({
                  targetNodeId: nodeId,
                  targetNodeData: nodeData,
                  socketName: key
                });
              }
            }
            // Array of connections
            else if (Array.isArray(value)) {
              value.forEach((item, index) => {
                if (item && typeof item === 'object') {
                  if (item.HandleRefId === selectedNode.id || item.HandleId === selectedNode.id) {
                    outputConnections.push({
                      targetNodeId: nodeId,
                      targetNodeData: nodeData,
                      socketName: `${key}[${index}]`
                    });
                  } else if (item.node && typeof item.node === 'object') {
                    if (item.node.HandleRefId === selectedNode.id || item.node.HandleId === selectedNode.id) {
                      outputConnections.push({
                        targetNodeId: nodeId,
                        targetNodeData: nodeData,
                        socketName: `${key}[${index}]`
                      });
                    }
                  }
                }
              });
            }
            // Recursively search deeper
            else {
              findConnectionsInObject(value, currentPath);
            }
          }
        }
      };

      findConnectionsInObject(nodeData);
    }

    if (outputConnections.length === 0) {
      return (
        <div className="no-connections">
          This node's output is not connected to any other nodes
        </div>
      );
    }

    return (
      <div className="output-connections-list">
        {outputConnections.map((connection, index) => {
          const { targetNodeId, socketName } = connection;
          const nodeInfo = getConnectedNodeInfo(targetNodeId, nodeRegistry);
          
          return (
            <div key={`${targetNodeId}-${socketName}-${index}`} className="output-connection-item">
              <div className="output-connection-info">
                <div className="output-connection-header">
                  <div className="output-connection-node-name">{nodeInfo.name}</div>
                  <div className="output-connection-node-id">ID: {targetNodeId}</div>
                </div>
                <div className="output-connection-socket">
                  Connected to socket: <span className="socket-name">{socketName}</span>
                </div>
              </div>
              <button 
                className="jump-to-node-button"
                onClick={() => handleJumpToNode(targetNodeId)}
                title={`Jump to node ${targetNodeId}`}
              >
                🔗 Jump
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      ref={inspectorRef}
      className={`node-inspector floating ${isCollapsed ? 'collapsed' : ''}`}
      style={{ 
        left: position.x, 
        top: position.y,
        width: size.width,
        height: isCollapsed ? 'auto' : size.height
      }}
    >
      <div 
        className="inspector-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <h3>Node Inspector</h3>
        <div className="inspector-controls">
          <button 
            className="collapse-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
          <button 
            className="close-button" 
            onClick={onClose}
            title="Close Inspector"
          >
            ×
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="inspector-content">
          <div className="inspector-search-section">
            <SearchControls
              onSearchById={onSearchById}
              onTypeFilter={onTypeFilter}
              availableNodeTypes={availableNodeTypes}
              isLoading={isLoading}
            />
          </div>
          
          <div className="node-info">
            <div className="info-row">
              <span className="info-label">ID:</span>
              <span className="info-value">{selectedNode.id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Type:</span>
              <span className="info-value">{selectedNode.data.nodeType}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Input Sockets:</span>
              <span className="info-value">{selectedNode.data.inputSockets.length}</span>
            </div>
          </div>

          <div className="node-properties">
            <h4>Properties</h4>
            {renderProperties(nodeData)}
          </div>

          <div className="output-connections">
            <h4>Output Connections</h4>
            {renderOutputConnections()}
          </div>
        </div>
      )}
      
      {!isCollapsed && (
        <div className="inspector-footer">
          <div 
            className="resize-handle"
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          />
        </div>
      )}
    </div>
  );
}